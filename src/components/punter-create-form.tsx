"use client"

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react"
import { Bell, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DecimalInput } from "@/components/decimal-input"
import { GameAutocomplete } from "@/components/game-autocomplete"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BetImportInput } from "@/components/bet-import-input"
import { toast } from "sonner"
import { enablePush, pushSupported } from "@/lib/push"
import { FreebetPopover, emptyFreebet } from "@/components/freebet-popover"
import {
  resources,
  type Account,
  type Tipster,
  type Market,
  type BetImageAnalysisResult
} from "@/lib/resources"
import {
  emptyCarryOver,
  initialPunterDraft,
  punterDraftReducer,
  stakeValues,
  type PunterCarryOver,
  type PunterFields,
  type PunterField
} from "@/lib/punter-draft"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Props {
  accounts: Account[]
  tipsters: Tipster[]
  markets: Market[]
  unitValue: number
  ready: boolean
  saving: boolean
  carryOver?: PunterCarryOver
  onSubmit: (event: FormEvent<HTMLFormElement>, receipt?: File | null) => void
}

const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-field px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"

const amountShortcuts = {
  units: ["0.25", "0.5", "1", "2"],
  money: ["25", "50", "100", "200"]
} as const

function localDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

function analysisFields(analysis: BetImageAnalysisResult, accounts: Account[]) {
  const values: Partial<PunterFields> = {}
  for (const key of [
    "event",
    "selection",
    "marketName",
    "sport",
    "competition"
  ] as const) {
    if (analysis[key]) values[key] = analysis[key]!
  }
  if (analysis.odd && analysis.odd >= 1.01) values.odd = String(analysis.odd)
  if (analysis.stakeAmount && analysis.stakeAmount > 0) {
    values.amount = String(analysis.stakeAmount)
    values.amountMode = "money"
  } else if (analysis.units && analysis.units > 0) {
    values.amount = String(analysis.units)
    values.amountMode = "units"
  }
  if (analysis.placedAt) values.placedAt = localDate(analysis.placedAt)
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  const matches = analysis.bookmaker
    ? accounts.filter(
        (account) =>
          account.active &&
          normalize(account.bookmaker?.name ?? "") ===
            normalize(analysis.bookmaker!)
      )
    : []
  if (matches.length === 1) values.bookmakerAccountId = String(matches[0].id)
  return { values, matches }
}

export function PunterCreateForm({
  accounts,
  tipsters,
  markets,
  unitValue,
  ready,
  saving,
  carryOver = emptyCarryOver,
  onSubmit
}: Props) {
  const [draft, dispatch] = useReducer(
    punterDraftReducer,
    carryOver,
    initialPunterDraft
  )
  const [freebet, setFreebet] = useState(emptyFreebet)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [notificar, setNotificar] = useState(true)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [warnings, setWarnings] = useState<string[]>([])
  const request = useRef<{ id: number; controller?: AbortController }>({
    id: 0
  })
  const fields = draft.fields
  const { stake, units } = stakeValues(
    fields.amount,
    fields.amountMode,
    unitValue
  )
  const odd = Number(fields.odd)
  const profit = stake * (odd - 1)
  const potentialReturn = freebet.mode === "is" ? profit : stake * odd
  const activeAccounts = accounts.filter((account) => account.active)
  const importedCount = Object.keys(draft.imported).filter(
    (key) => key !== "amountMode"
  ).length

  useEffect(() => {
    const current = request.current
    return () => {
      current.id++
      current.controller?.abort()
    }
  }, [])

  function cancelAnalysis() {
    request.current.id++
    request.current.controller?.abort()
    setLoading(false)
    setStatus("")
    setError("")
    setWarnings([])
  }

  async function analyze(file: File | null, text?: string) {
    cancelAnalysis()
    setReceipt(file)
    const id = request.current.id
    const controller = new AbortController()
    request.current.controller = controller
    setLoading(true)
    const timer = setTimeout(() => controller.abort(), 25_000)
    try {
      const result = await resources.bets.analyzeImage(file, text, {
        mode: "punter",
        signal: controller.signal
      })
      if (request.current.id !== id) return
      if (!result.isBet) {
        setError(
          "Não identificamos uma aposta. Confira o recorte ou preencha manualmente."
        )
        return
      }
      const { values, matches } = analysisFields(result, accounts)
      dispatch({ type: "import", values })
      const notices = [...(result.warnings ?? [])]
      if (!result.placedAt)
        notices.push(
          "Data não encontrada: confira a data da aposta antes de salvar."
        )
      if (result.bookmaker && matches.length > 1)
        notices.push(
          "Há mais de uma conta nesta casa. Selecione a conta usada."
        )
      if (result.bookmaker && matches.length === 0)
        notices.push(
          "Casa identificada: " +
            result.bookmaker +
            ". Selecione a conta correspondente."
        )
      setWarnings(notices)
      setStatus(
        "Leitura concluída. Revise os campos destacados; suas edições foram preservadas."
      )
    } catch (cause) {
      if (request.current.id !== id) return
      setError(
        controller.signal.aborted
          ? "A leitura demorou mais que o esperado. Tente novamente ou preencha manualmente."
          : cause instanceof Error
            ? cause.message
            : "Não foi possível ler a aposta."
      )
    } finally {
      clearTimeout(timer)
      if (request.current.id === id) setLoading(false)
    }
  }

  function edit(key: PunterField, value: string) {
    dispatch({ type: "edit", values: { [key]: value } })
  }

  /**
   * O sino guarda duas coisas diferentes: o aviso desta aposta e a permissão do
   * navegador. Ligar a primeira sem a segunda deixaria o usuário esperando um
   * aviso que nunca chega, então a permissão é pedida no mesmo gesto.
   */
  async function toggleNotificar() {
    const proximo = !notificar
    setNotificar(proximo)

    if (!proximo) return

    if (!pushSupported()) {
      toast.warning("Este navegador não envia notificações")
      return
    }

    const estado = await enablePush().catch(() => "off" as const)

    if (estado === "denied") {
      toast.error("Notificações bloqueadas nas permissões do navegador")
    } else if (estado !== "on") {
      toast.warning("Não foi possível ativar as notificações agora")
    }
  }

  function changeMode(mode: "money" | "units") {
    if (mode === fields.amountMode) return
    dispatch({
      type: "edit",
      values: {
        amountMode: mode,
        amount: String(mode === "money" ? stake || "" : units || "")
      }
    })
  }

  function input(
    key: PunterField,
    label: string,
    options: {
      required?: boolean
      type?: string
      placeholder?: string
      maxLength?: number
      list?: string
      step?: string
      min?: string
    } = {}
  ) {
    return (
      <div className="grid min-w-0 content-start gap-2">
        <Label className="min-h-7" htmlFor={"create-bet-" + key}>
          {label}
          {draft.imported[key] && (
            <span className="ai-badge">
              IA · conferir
            </span>
          )}
        </Label>
        {(() => {
          const { type, ...rest } = options
          const Control = type === "number" ? DecimalInput : Input
          return (
            <Control
              id={"create-bet-" + key}
              name={key}
              className={cn(
                "h-11 min-w-0",
                draft.imported[key] && "ai-field"
              )}
              value={fields[key]}
              onChange={(event) => edit(key, event.target.value)}
              {...(type === "number" ? rest : options)}
            />
          )
        })()}
      </div>
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!ready || loading || saving || stake <= 0 || units <= 0) {
      event.preventDefault()
      return
    }
    if (
      freebet.mode === "generates" &&
      (!(Number(freebet.value) > 0) || !freebet.trigger)
    ) {
      event.preventDefault()
      setError(
        "Complete o valor e a condição de geração da freebet em Mais detalhes."
      )
      return
    }
    cancelAnalysis()
    onSubmit(event, receipt)
  }

  return (
    <form
      onSubmit={submit}
      className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Nova aposta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Importe um comprovante ou preencha os dados abaixo.
        </p>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="min-w-0">
          <BetImportInput
            loading={loading}
            disabled={saving || !ready}
            onAnalyze={analyze}
            onCancel={cancelAnalysis}
          />
        </div>
        <fieldset disabled={saving || !ready} className="min-w-0 space-y-4">
          {!ready && (
            <p role="status" className="text-sm text-muted-foreground">
              Carregando contas e valor da unidade…
            </p>
          )}
          {ready && activeAccounts.length === 0 && (
            <p className="text-sm text-warning">
              Cadastre uma conta em{" "}
              <a href="/bookmakers" className="underline">
                Casas & Contas
              </a>{" "}
              para registrar apostas.
            </p>
          )}
          {(status || importedCount > 0) && (
            <div
              role="status"
              className="ai-notice space-y-2 rounded-md p-3 text-sm"
            >
              <p>
                {status ||
                  "Os dados importados continuam no formulário para revisão."}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {importedCount} campos preenchidos
                  {!fields.bookmakerAccountId && "; selecione a conta"}.
                </span>
                {importedCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      dispatch({ type: "undo" })
                      setStatus("")
                      setWarnings([])
                    }}
                  >
                    <Undo2 className="size-4" />
                    Desfazer preenchimento
                  </Button>
                )}
              </div>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {warnings.length > 0 && (
            <ul
              aria-label="Confira estes dados"
              className="list-inside list-disc space-y-1 rounded-md bg-amber-500/10 p-3 text-sm"
            >
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 content-start gap-2">
              <Label className="min-h-7" htmlFor="create-bet-account">
                Conta{" "}
                {draft.imported.bookmakerAccountId && (
                  <span className="ai-badge">
                    IA · conferir
                  </span>
                )}
              </Label>
              <select
                id="create-bet-account"
                name="bookmakerAccountId"
                required
                value={fields.bookmakerAccountId}
                onChange={(event) =>
                  edit("bookmakerAccountId", event.target.value)
                }
                className={cn(selectClass, draft.imported.bookmakerAccountId && "ai-field")}
              >
                <option value="">Selecione a conta</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bookmaker?.name}
                    {account.label ? " — " + account.label : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid min-w-0 content-start gap-2">
              <Label className="min-h-7" htmlFor="create-bet-tipster">Tipster</Label>
              <select
                id="create-bet-tipster"
                className={selectClass}
                name="tipsterId"
                value={fields.tipsterId}
                onChange={(event) => edit("tipsterId", event.target.value)}
              >
                <option value="">Aposta própria</option>
                {tipsters
                  .filter((tipster) => tipster.active)
                  .map((tipster) => (
                    <option key={tipster.id} value={tipster.id}>
                      {tipster.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 content-start gap-2">
              <Label className="min-h-7" htmlFor="create-bet-event">
                Evento
                {draft.imported.event && (
                  <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                    Importado
                  </span>
                )}
              </Label>
              <GameAutocomplete
                id="create-bet-event"
                name="event"
                required
                maxLength={200}
                placeholder="Cruzeiro x Atlético-MG"
                className={cn("h-11 min-w-0", draft.imported.event && "border-emerald-600/60")}
                value={fields.event}
                onValueChange={(valor) => edit("event", valor)}
                onSelect={(jogo) => edit("eventDate", localDate(jogo.startsAt))}
              />
            </div>
            <div className="grid min-w-0 content-start gap-2">
              <Label className="min-h-7" htmlFor="create-bet-eventDate">
                Data do jogo
                {draft.imported.eventDate && <span className="ai-badge">IA · conferir</span>}
              </Label>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  id="create-bet-eventDate"
                  name="eventDate"
                  type="datetime-local"
                  className={cn(
                    "h-11 min-w-0 flex-1 sm:max-w-56",
                    draft.imported.eventDate && "ai-field"
                  )}
                  value={fields.eventDate}
                  onChange={(event) => edit("eventDate", event.target.value)}
                />
                <button
                  type="button"
                  onClick={toggleNotificar}
                  aria-pressed={notificar}
                  title={
                    notificar
                      ? "Avisar quando este jogo começar"
                      : "Sem aviso para este jogo"
                  }
                  aria-label={
                    notificar
                      ? "Avisar quando este jogo começar"
                      : "Sem aviso para este jogo"
                  }
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                    notificar
                      ? "border-ring bg-field text-foreground"
                      : "border-input bg-field text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Bell className="size-5" fill={notificar ? "currentColor" : "none"} />
                </button>
              </div>
              <input
                type="hidden"
                name="notificationsEnabled"
                value={notificar ? "true" : "false"}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("placedAt", "Data da aposta", { type: "datetime-local" })}
            {input("selection", "Seleção (aposta)", {
              required: true,
              placeholder: "Cruzeiro vence, Over 2.5…",
              maxLength: 200
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("odd", "Odd", {
              required: true,
              type: "number",
              step: "0.001",
              min: "1.01",
              placeholder: "1,85"
            })}
            <div className="grid min-w-0 content-start gap-2">
              <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                <Label htmlFor="create-bet-amount">
                  {fields.amountMode === "money"
                    ? "Valor apostado (R$)"
                    : "Unidades"}
                  {draft.imported.amount && (
                    <span className="ai-badge">
                      IA · conferir
                    </span>
                  )}
                </Label>
                <div className="flex gap-1">
                  {(
                    [
                      ["money", "R$"],
                      ["units", "Unidades"]
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      type="button"
                      key={mode}
                      aria-pressed={fields.amountMode === mode}
                      onClick={() => changeMode(mode)}
                      className={cn(
                        "rounded px-2 py-1 text-xs",
                        fields.amountMode === mode
                          ? "bg-secondary font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <DecimalInput
                  id="create-bet-amount"
                  min="0.01"
                  step={fields.amountMode === "money" ? "0.01" : "any"}
                  required
                  className={cn(
                    "h-11 w-1/2",
                    draft.imported.amount && "ai-field"
                  )}
                  value={fields.amount}
                  onChange={(event) => edit("amount", event.target.value)}
                />
                <div className="flex min-w-0 flex-1 gap-1">
                  {amountShortcuts[fields.amountMode].map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={fields.amount === value}
                      onClick={() => edit("amount", value)}
                      className={cn(
                        "h-11 min-w-0 flex-1 rounded-lg border border-input px-1 text-xs tabular-nums transition-colors",
                        fields.amount === value
                          ? "border-ring bg-secondary font-medium"
                          : "bg-field text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {value.replace(".", ",")}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBRL(stake)} ·{" "}
                {new Intl.NumberFormat("pt-BR", {
                  maximumFractionDigits: 4
                }).format(units)}
                u · 1u = {formatBRL(unitValue)}
              </p>
            </div>
          </div>
          <input type="hidden" name="stakeAmount" value={stake || ""} />
          <input type="hidden" name="units" value={units || ""} />
          <div className="flex flex-wrap justify-between gap-2 rounded-md bg-muted/40 p-3 text-sm">
            <span>
              Retorno potencial:{" "}
              <strong>
                {odd >= 1.01 && stake > 0 ? formatBRL(potentialReturn) : "—"}
              </strong>
            </span>
            <span>
              Lucro potencial:{" "}
              <strong className="text-profit dark:text-profit">
                {odd >= 1.01 && stake > 0 ? formatBRL(profit) : "—"}
              </strong>
            </span>
          </div>
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Mais detalhes{freebet.mode !== "none" ? " · Freebet ativa" : ""}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {input("marketName", "Mercado", {
                list: "punter-markets",
                placeholder: "Moneyline, Over/Under…",
                maxLength: 100
              })}
              <datalist id="punter-markets">
                {markets.map((market) => (
                  <option key={market.id} value={market.name} />
                ))}
              </datalist>
              {input("sport", "Esporte", {
                placeholder: "Futebol, basquete, CS2…",
                maxLength: 50
              })}
              {input("competition", "Competição", {
                placeholder: "Brasileirão, NBA…",
                maxLength: 100
              })}
              <div className="flex items-center gap-2 text-sm">
                <FreebetPopover value={freebet} onChange={setFreebet} />
                <span>Esta aposta é ou gera uma freebet</span>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="create-bet-notes">Suas notas</Label>
                <Textarea
                  id="create-bet-notes"
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  value={fields.notes}
                  onChange={(event) => edit("notes", event.target.value)}
                />
              </div>
            </div>
          </details>
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={
              saving || loading || !ready || activeAccounts.length === 0
            }
          >
            {saving
              ? "Salvando…"
              : loading
                ? "Aguarde a leitura ou cancele para salvar"
                : "Registrar aposta"}
          </Button>
        </fieldset>
      </div>
    </form>
  )
}
