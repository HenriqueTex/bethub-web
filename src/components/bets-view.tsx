"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Gavel, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ResultBadge } from "@/components/result-badge"
import { formatBRL, formatDate, formatOdd, formatSigned, formatUnits, RESULT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  resources,
  Account,
  Bet,
  BetResult,
  Market,
  Method,
  Paginated,
  Tipster,
} from "@/lib/resources"

const SETTLE_OPTIONS: BetResult[] = ["green", "half_green", "red", "half_red", "void", "cashout"]

interface Filters {
  bookmakerId: string
  tipsterId: string
  methodId: string
  result: string
  search: string
  from: string
  to: string
}

const EMPTY_FILTERS: Filters = {
  bookmakerId: "",
  tipsterId: "",
  methodId: "",
  result: "",
  search: "",
  from: "",
  to: "",
}

interface BetsViewProps {
  lockedMethod?: Method
  title?: string
  onDataChanged?: () => void
}

export default function BetsView({
  lockedMethod,
  title = "Apostas",
  onDataChanged,
}: BetsViewProps) {
  const [bets, setBets] = useState<Paginated<Bet> | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tipsters, setTipsters] = useState<Tipster[]>([])
  const [methods, setMethods] = useState<Method[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [unitValue, setUnitValue] = useState(10)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bet | null>(null)
  const [cashoutBet, setCashoutBet] = useState<Bet | null>(null)
  const [saving, setSaving] = useState(false)
  const [units, setUnits] = useState("1")

  const bookmakers = useMemo(() => {
    const map = new Map<number, string>()
    for (const account of accounts) {
      if (account.bookmaker) map.set(account.bookmaker.id, account.bookmaker.name)
    }
    return [...map.entries()]
  }, [accounts])

  const reloadBets = useCallback(async () => {
    const data = await resources.bets.list({
      page,
      perPage: 15,
      bookmakerId: filters.bookmakerId || undefined,
      tipsterId: filters.tipsterId || undefined,
      methodId: lockedMethod?.id ?? (filters.methodId || undefined),
      result: filters.result || undefined,
      search: filters.search || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
    setBets(data)
  }, [page, filters, lockedMethod?.id])

  useEffect(() => {
    reloadBets().catch(() => toast.error("Erro ao carregar apostas"))
  }, [reloadBets])

  useEffect(() => {
    Promise.all([
      resources.accounts.list(),
      resources.tipsters.list(),
      resources.methods.list(),
      resources.markets.list(),
      resources.settings.get(),
    ])
      .then(([accountsData, tipstersData, methodsData, marketsData, settings]) => {
        setAccounts(accountsData)
        setTipsters(tipstersData)
        setMethods(methodsData)
        setMarkets(marketsData)
        setUnitValue(settings.unitValue)
      })
      .catch(() => toast.error("Erro ao carregar cadastros"))
  }, [])

  function updateFilter(key: keyof Filters, value: string) {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value === "all" ? "" : value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const get = (key: string) => String(form.get(key) || "")

    const payload: Record<string, unknown> = {
      bookmakerAccountId: Number(get("bookmakerAccountId")),
      event: get("event"),
      selection: get("selection"),
      odd: Number(get("odd")),
      units: Number(get("units")),
      tipsterId: get("tipsterId") ? Number(get("tipsterId")) : null,
      methodId: lockedMethod?.id ?? (get("methodId") ? Number(get("methodId")) : null),
      competition: get("competition") || null,
      notes: get("notes") || null,
    }
    const marketName = get("marketName")
    if (marketName) payload.marketName = marketName
    if (get("placedAt")) payload.placedAt = new Date(get("placedAt")).toISOString()

    setSaving(true)
    try {
      if (editing) {
        await resources.bets.update(editing.id, payload)
        toast.success("Aposta atualizada")
      } else {
        await resources.bets.create(payload)
        toast.success("Aposta registrada")
      }
      setFormOpen(false)
      setEditing(null)
      await reloadBets()
      onDataChanged?.()
      resources.markets.list().then(setMarkets)
    } catch {
      toast.error("Não foi possível salvar a aposta")
    } finally {
      setSaving(false)
    }
  }

  async function settle(bet: Bet, result: BetResult, cashoutAmount?: number) {
    try {
      await resources.bets.settle(bet.id, result, cashoutAmount)
      toast.success(
        result === "pending" ? "Aposta reaberta" : `Aposta liquidada: ${RESULT_LABELS[result]}`
      )
      await reloadBets()
      onDataChanged?.()
    } catch {
      toast.error("Não foi possível liquidar")
    }
  }

  async function handleCashout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cashoutBet) return
    const form = new FormData(event.currentTarget)
    await settle(cashoutBet, "cashout", Number(form.get("cashoutAmount")))
    setCashoutBet(null)
  }

  async function handleDelete(bet: Bet) {
    if (!confirm(`Excluir a aposta "${bet.selection}"?`)) return
    try {
      await resources.bets.remove(bet.id)
      toast.success("Aposta excluída")
      await reloadBets()
      onDataChanged?.()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  function openEdit(bet: Bet) {
    setEditing(bet)
    setUnits(String(bet.units))
    setFormOpen(true)
  }

  const stakePreview = Number(units || 0) * (editing?.unitValue ?? unitValue)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button
          onClick={() => {
            setEditing(null)
            setUnits("1")
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> Nova aposta
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <Input
          placeholder="Buscar evento, seleção..."
          className="w-52"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
        <Select
          value={filters.bookmakerId || "all"}
          onValueChange={(value) => updateFilter("bookmakerId", String(value))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Casa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as casas</SelectItem>
            {bookmakers.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.tipsterId || "all"}
          onValueChange={(value) => updateFilter("tipsterId", String(value))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipsters</SelectItem>
            {tipsters.map((tipster) => (
              <SelectItem key={tipster.id} value={String(tipster.id)}>
                {tipster.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!lockedMethod && (
          <Select
            value={filters.methodId || "all"}
            onValueChange={(value) => updateFilter("methodId", String(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os métodos</SelectItem>
              {methods.map((method) => (
                <SelectItem key={method.id} value={String(method.id)}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.result || "all"}
          onValueChange={(value) => updateFilter("result", String(value))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(RESULT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            className="w-36"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            className="w-36"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
          />
        </div>
        {Object.values(filters).some(Boolean) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Evento / Seleção</TableHead>
              <TableHead>Mercado</TableHead>
              <TableHead>Casa</TableHead>
              <TableHead>Tipster</TableHead>
              <TableHead className="text-right">Odd</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!bets ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : bets.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Nenhuma aposta encontrada
                </TableCell>
              </TableRow>
            ) : (
              bets.data.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(bet.placedAt)}
                  </TableCell>
                  <TableCell className="max-w-52">
                    <p className="truncate font-medium">{bet.selection}</p>
                    <p className="truncate text-xs text-muted-foreground">{bet.event}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bet.market?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bet.account?.bookmaker?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bet.tipster?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatOdd(bet.odd)}</TableCell>
                  <TableCell className="text-right">
                    <p>{formatUnits(bet.units)}</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(bet.stakeAmount)}</p>
                  </TableCell>
                  <TableCell>
                    <ResultBadge result={bet.result} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      bet.profitAmount === null
                        ? "text-muted-foreground"
                        : bet.profitAmount >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                    )}
                  >
                    {bet.profitAmount === null ? "—" : formatSigned(bet.profitAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon-sm" title="Liquidar">
                            <Gavel className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Liquidar como</DropdownMenuLabel>
                          {SETTLE_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option}
                              onClick={() =>
                                option === "cashout" ? setCashoutBet(bet) : settle(bet, option)
                              }
                            >
                              {RESULT_LABELS[option]}
                            </DropdownMenuItem>
                          ))}
                          {bet.result !== "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => settle(bet, "pending")}>
                                Reabrir (pendente)
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(bet)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(bet)}>
                        <Trash2 className="size-4 text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {bets && bets.meta.lastPage > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Página {bets.meta.currentPage} de {bets.meta.lastPage} ({bets.meta.total} apostas)
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= bets.meta.lastPage}
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value)
          if (!value) setEditing(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar aposta" : "Nova aposta"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid gap-2">
              <Label>Conta</Label>
              <Select
                name="bookmakerAccountId"
                defaultValue={editing ? String(editing.bookmakerAccountId) : undefined}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((account) => account.active)
                    .map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.bookmaker?.name}
                        {account.label ? ` — ${account.label}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-event">Evento</Label>
              <Input
                id="bet-event"
                name="event"
                required
                placeholder="Cruzeiro x Galo"
                defaultValue={editing?.event ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-selection">Seleção (aposta)</Label>
              <Input
                id="bet-selection"
                name="selection"
                required
                placeholder="Cruzeiro ML, Over 2.5..."
                defaultValue={editing?.selection ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-market">Mercado</Label>
              <Input
                id="bet-market"
                name="marketName"
                list="markets-list"
                placeholder="Moneyline, Over/Under..."
                defaultValue={editing?.market?.name ?? ""}
              />
              <datalist id="markets-list">
                {markets.map((market) => (
                  <option key={market.id} value={market.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-competition">Competição (opcional)</Label>
              <Input
                id="bet-competition"
                name="competition"
                placeholder="Brasileirão, NBA..."
                defaultValue={editing?.competition ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipster (opcional)</Label>
              <Select
                name="tipsterId"
                defaultValue={editing?.tipsterId ? String(editing.tipsterId) : undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aposta própria" />
                </SelectTrigger>
                <SelectContent>
                  {tipsters
                    .filter((tipster) => tipster.active)
                    .map((tipster) => (
                      <SelectItem key={tipster.id} value={String(tipster.id)}>
                        {tipster.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {lockedMethod ? (
              <div className="grid gap-2">
                <Label>Método</Label>
                <Input value={lockedMethod.name} disabled />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Método (opcional)</Label>
                <Select
                  name="methodId"
                  defaultValue={editing?.methodId ? String(editing.methodId) : undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem método" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods
                      .filter((method) => method.active)
                      .map((method) => (
                        <SelectItem key={method.id} value={String(method.id)}>
                          {method.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="bet-odd">Odd</Label>
              <Input
                id="bet-odd"
                name="odd"
                type="number"
                step="0.001"
                min="1.01"
                required
                defaultValue={editing?.odd ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-units">Unidades</Label>
              <Input
                id="bet-units"
                name="units"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={units}
                onChange={(e) => setUnits(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stake: {formatBRL(stakePreview)} (1u ={" "}
                {formatBRL(editing?.unitValue ?? unitValue)})
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-placedAt">Data da aposta (opcional)</Label>
              <Input
                id="bet-placedAt"
                name="placedAt"
                type="datetime-local"
                defaultValue={editing ? editing.placedAt.slice(0, 16) : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bet-notes">Notas (opcional)</Label>
              <Input id="bet-notes" name="notes" defaultValue={editing?.notes ?? ""} />
            </div>
            <Button type="submit" className="col-span-2" disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Registrar aposta"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cashoutBet} onOpenChange={(value) => !value && setCashoutBet(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cashout</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCashout} className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Stake de {formatBRL(cashoutBet?.stakeAmount)} — informe o valor recebido no cashout.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="cashoutAmount">Valor recebido (R$)</Label>
              <Input
                id="cashoutAmount"
                name="cashoutAmount"
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
              />
            </div>
            <Button type="submit">Confirmar cashout</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
