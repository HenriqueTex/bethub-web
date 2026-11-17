"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Dices, Pencil, Plus, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { DecimalInput } from "@/components/decimal-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { formatBRL, formatDate, formatPercent, formatSigned } from "@/lib/format"
import { accountName, byUsage } from "@/lib/usage"
import { cn } from "@/lib/utils"
import {
  CASINO_GAMES,
  CASINO_KINDS,
  resources,
  type Account,
  type CasinoGame,
  type CasinoKind,
  type CasinoSession,
  type CasinoSummary,
  type Tipster
} from "@/lib/resources"

const GAME_LABEL: Record<CasinoGame, string> = {
  aviator: "Aviator",
  crash: "Crash",
  roulette: "Roleta",
  slots: "Slots",
  blackjack: "Blackjack",
  baccarat: "Bacará",
  poker: "Poker",
  game_show: "Game show",
  other: "Outro"
}

const KIND_LABEL: Record<CasinoKind, string> = {
  cash: "Saldo",
  free_spins: "Giros grátis",
  bonus: "Bônus"
}

const KIND_HINT: Record<CasinoKind, string> = {
  cash: "Dinheiro do saldo: o resultado é saída menos entrada.",
  free_spins: "Os giros não saem do saldo: o resultado é tudo o que você ganhou.",
  bonus: "Saldo de bônus: só conta o que virou saldo real."
}

const NO_TIPSTER = "none"
const ALL_TIME = "all"

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function monthRange(month: string) {
  if (month === ALL_TIME) return {}
  const [year, m] = month.split("-").map(Number)
  const last = new Date(year, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` }
}

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number)
  const label = new Date(year, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function toLocalInput(iso?: string) {
  const date = iso ? new Date(iso) : new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(",", "."))
  return value.trim() === "" || Number.isNaN(parsed) ? null : parsed
}

function previewProfit(kind: CasinoKind, stake: number | null, returned: number | null) {
  if (returned === null) return null
  return kind === "cash" ? returned - (stake ?? 0) : returned
}

function fetchCasino(range: { from?: string; to?: string }) {
  return Promise.all([
    resources.casino.list(range),
    resources.casino.summary(range),
    resources.accounts.list(),
    resources.tipsters.list()
  ])
}

function ProfitText({ value }: { value: number | null }) {
  if (value === null) return <Badge variant="secondary">Aberta</Badge>
  return (
    <span
      className={cn(
        "numeric font-semibold",
        value > 0 && "text-profit",
        value < 0 && "text-loss"
      )}
    >
      {formatSigned(value)}
    </span>
  )
}

export default function CasinoPage() {
  const [month, setMonth] = useState(currentMonth)
  const [sessions, setSessions] = useState<CasinoSession[]>([])
  const [summary, setSummary] = useState<CasinoSummary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tipsters, setTipsters] = useState<Tipster[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<CasinoSession | "new" | null>(null)

  const [accountId, setAccountId] = useState("")
  const [tipsterId, setTipsterId] = useState(NO_TIPSTER)
  const [game, setGame] = useState<CasinoGame>("aviator")
  const [kind, setKind] = useState<CasinoKind>("cash")
  const [stake, setStake] = useState("")
  const [returned, setReturned] = useState("")

  const range = useMemo(() => monthRange(month), [month])

  function apply([list, summaryData, accountList, tipsterList]: Awaited<
    ReturnType<typeof fetchCasino>
  >) {
    setSessions(list)
    setSummary(summaryData)
    setAccounts(accountList)
    setTipsters(tipsterList)
    setLoading(false)
  }

  async function load() {
    apply(await fetchCasino(range))
  }

  useEffect(() => {
    let alive = true
    fetchCasino(range)
      .then((data) => {
        if (!alive) return
        setSessions(data[0])
        setSummary(data[1])
        setAccounts(data[2])
        setTipsters(data[3])
        setLoading(false)
      })
      .catch(() => alive && toast.error("Erro ao carregar o cassino"))
    return () => {
      alive = false
    }
  }, [range])

  const activeAccounts = useMemo(
    () =>
      accounts
        .filter((account) => account.active)
        .sort(byUsage<Account>(accountName)),
    [accounts]
  )

  function openDialog(session: CasinoSession | "new") {
    setDialog(session)
    if (session === "new") {
      const lastAccount = sessions[0]?.bookmakerAccountId ?? activeAccounts[0]?.id
      setAccountId(lastAccount ? String(lastAccount) : "")
      setTipsterId(sessions[0]?.tipsterId ? String(sessions[0].tipsterId) : NO_TIPSTER)
      setGame(sessions[0]?.game ?? "aviator")
      setKind("cash")
      setStake("")
      setReturned("")
    } else {
      setAccountId(String(session.bookmakerAccountId))
      setTipsterId(session.tipsterId ? String(session.tipsterId) : NO_TIPSTER)
      setGame(session.game)
      setKind(session.kind)
      setStake(session.stakeAmount ? String(session.stakeAmount) : "")
      setReturned(session.returnAmount === null ? "" : String(session.returnAmount))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accountId) {
      toast.error("Escolha a conta")
      return
    }
    const form = new FormData(event.currentTarget)
    const stakeAmount = parseAmount(stake) ?? 0
    if (kind === "cash" && stakeAmount <= 0) {
      toast.error("Informe o valor de entrada")
      return
    }
    const payload = {
      bookmakerAccountId: Number(accountId),
      tipsterId: tipsterId === NO_TIPSTER ? null : Number(tipsterId),
      game,
      title: String(form.get("title") || "").trim() || null,
      kind,
      stakeAmount,
      returnAmount: parseAmount(returned),
      playedAt: new Date(String(form.get("playedAt"))).toISOString(),
      notes: String(form.get("notes") || "").trim() || null
    }
    setSaving(true)
    try {
      if (dialog === "new") {
        await resources.casino.create(payload)
        toast.success("Sessão registrada")
      } else if (dialog) {
        await resources.casino.update(dialog.id, payload)
        toast.success("Sessão atualizada")
      }
      setDialog(null)
      await load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  async function remove(session: CasinoSession) {
    if (!confirm(`Excluir a sessão de ${GAME_LABEL[session.game]} de ${formatDate(session.playedAt)}?`)) return
    try {
      await resources.casino.remove(session.id)
      toast.success("Sessão excluída")
      await load()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  const editing = dialog === "new" ? null : dialog
  const stakeValue = parseAmount(stake)
  const returnedValue = parseAmount(returned)
  const preview = previewProfit(kind, stakeValue, returnedValue)
  const multiplier =
    kind === "cash" && stakeValue && returnedValue !== null ? returnedValue / stakeValue : null
  const periodLabel = month === ALL_TIME ? "Todo o período" : monthLabel(month)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Cassino"
        description="Sessões de aviator, roleta, slots e outros jogos, separadas do resultado das apostas esportivas."
        actions={
          <>
            <Input
              type="month"
              aria-label="Mês"
              className="w-40"
              value={month === ALL_TIME ? "" : month}
              onChange={(event) => setMonth(event.target.value || ALL_TIME)}
            />
            <Button
              variant={month === ALL_TIME ? "secondary" : "ghost"}
              aria-pressed={month === ALL_TIME}
              onClick={() => setMonth(month === ALL_TIME ? currentMonth() : ALL_TIME)}
            >
              Tudo
            </Button>
            <Button onClick={() => openDialog("new")}>
              <Plus className="size-4" /> Nova sessão
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Resultado"
          tone={(summary?.profit ?? 0) >= 0 ? "profit" : "loss"}
          value={formatSigned(summary?.profit ?? 0)}
          detail={periodLabel}
        />
        <KpiCard
          label="Sessões"
          value={summary?.sessions ?? 0}
          detail={
            summary?.openSessions
              ? `${summary.openSessions} em aberto`
              : `${summary?.wins ?? 0} no lucro · ${summary?.losses ?? 0} no prejuízo`
          }
        />
        <KpiCard
          label="Entradas em saldo"
          value={formatBRL(summary?.staked ?? 0)}
          detail={`ROI ${formatPercent(summary?.roi ?? 0)}`}
        />
        <KpiCard
          label="Acerto"
          value={formatPercent(summary?.hitRate ?? 0)}
          detail="Sessões que terminaram no lucro"
        />
      </div>

      {summary && summary.sessions > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="py-4">
              <p className="mb-3 text-sm font-medium">Por jogo</p>
              <div className="flex flex-wrap gap-2">
                {summary.byGame.map((row) => (
                  <Badge key={row.key} variant="outline" className="gap-2">
                    {GAME_LABEL[row.key] ?? row.key}
                    <span className="text-muted-foreground">{row.sessions}x</span>
                    <ProfitText value={row.profit} />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="mb-3 text-sm font-medium">Por casa</p>
              <div className="flex flex-wrap gap-2">
                {summary.byAccount.map((row) => (
                  <Badge key={row.key} variant="outline" className="gap-2">
                    {row.label}
                    <span className="text-muted-foreground">{row.sessions}x</span>
                    <ProfitText value={row.profit} />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : sessions.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            icon={Dices}
            title="Nenhuma sessão de cassino no período"
            description="Registre quanto entrou e quanto saiu de cada sessão. O resultado entra no saldo da conta, mas não mistura com o ROI das apostas."
            action={
              <Button onClick={() => openDialog("new")}>
                <Plus className="size-4" /> Nova sessão
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-panel border bg-card shadow-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Jogo</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Saída</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(session.playedAt)}</TableCell>
                  <TableCell className="font-medium">
                    {GAME_LABEL[session.game] ?? session.game}
                    {session.title && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {session.title}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.account ? accountName(session.account) : "—"}
                    {session.tipster && (
                      <span className="block text-xs">{session.tipster.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{KIND_LABEL[session.kind]}</TableCell>
                  <TableCell className="numeric text-right">
                    {session.kind === "cash" || session.stakeAmount > 0
                      ? formatBRL(session.stakeAmount)
                      : "—"}
                  </TableCell>
                  <TableCell className="numeric text-right">
                    {session.returnAmount === null ? "—" : formatBRL(session.returnAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProfitText value={session.profitAmount} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar sessão"
                        aria-label="Editar sessão"
                        onClick={() => openDialog(session)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir sessão"
                        aria-label="Excluir sessão"
                        onClick={() => remove(session)}
                      >
                        <Trash2 className="size-4 text-loss" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sessão" : "Nova sessão de cassino"}</DialogTitle>
          </DialogHeader>
          <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="casino-playedAt">Data</Label>
                <Input
                  id="casino-playedAt"
                  name="playedAt"
                  type="datetime-local"
                  required
                  defaultValue={toLocalInput(editing?.playedAt)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="casino-account">Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="casino-account" className="w-full">
                    <SelectValue placeholder="Escolha a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {accountName(account)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Jogo</Label>
              <div className="flex flex-wrap gap-2">
                {CASINO_GAMES.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={game === value ? "secondary" : "ghost"}
                    aria-pressed={game === value}
                    onClick={() => setGame(value)}
                  >
                    {GAME_LABEL[value]}
                  </Button>
                ))}
              </div>
              <Input
                name="title"
                aria-label="Nome do jogo (opcional)"
                maxLength={100}
                defaultValue={editing?.title ?? ""}
                placeholder="Nome do jogo (opcional): Fortune Tiger, Roleta Brasileira…"
              />
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <div className="flex flex-wrap gap-2">
                {CASINO_KINDS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={kind === value ? "secondary" : "ghost"}
                    aria-pressed={kind === value}
                    onClick={() => setKind(value)}
                  >
                    {KIND_LABEL[value]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{KIND_HINT[kind]}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="casino-stake">
                  {kind === "cash" ? "Entrada" : kind === "free_spins" ? "Valor dos giros (opcional)" : "Bônus usado (opcional)"}
                </Label>
                <DecimalInput
                  id="casino-stake"
                  required={kind === "cash"}
                  value={stake}
                  onChange={(event) => setStake(event.target.value)}
                  placeholder="1000,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="casino-return">
                  {kind === "cash" ? "Saída" : "Ganho"}
                </Label>
                <DecimalInput
                  id="casino-return"
                  value={returned}
                  onChange={(event) => setReturned(event.target.value)}
                  placeholder="Vazio se ainda está jogando"
                />
              </div>
            </div>

            <div className="flex items-baseline justify-between rounded-control-sm border px-3 py-2">
              <span className="text-sm text-muted-foreground">Resultado</span>
              <span className="flex items-baseline gap-2">
                <ProfitText value={preview === null ? null : Math.round(preview * 100) / 100} />
                {multiplier !== null && (
                  <span className="numeric text-xs text-muted-foreground">
                    {multiplier.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x
                  </span>
                )}
              </span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="casino-tipster">Tipster (opcional)</Label>
              <Select value={tipsterId} onValueChange={setTipsterId}>
                <SelectTrigger id="casino-tipster" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TIPSTER}>Nenhum</SelectItem>
                  {tipsters
                    .filter((tipster) => tipster.active || String(tipster.id) === tipsterId)
                    .map((tipster) => (
                      <SelectItem key={tipster.id} value={String(tipster.id)}>
                        {tipster.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="casino-notes">Notas (opcional)</Label>
              <Textarea
                id="casino-notes"
                name="notes"
                rows={2}
                maxLength={1000}
                defaultValue={editing?.notes ?? ""}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
