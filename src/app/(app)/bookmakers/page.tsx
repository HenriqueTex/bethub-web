"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { ArrowDownToLine, ArrowUpFromLine, Landmark, Plus, Search, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DecimalInput } from "@/components/decimal-input"
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
import { formatBRL, formatDate, formatSigned } from "@/lib/format"
import { cn } from "@/lib/utils"
import { resources, Account, Bookmaker, Transaction } from "@/lib/resources"
import { bookmakerLogo } from "@/lib/bookmaker-logos"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

type StatusFilter = "all" | "with" | "without" | "inactive"

function BookmakerLogo({ name }: { name: string }) {
  const src = bookmakerLogo(name)

  if (!src) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-glass-border bg-foreground/[0.03] text-xs font-semibold text-muted-foreground">
        {name.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <span className="flex size-9 shrink-0 overflow-hidden rounded-[10px] border border-glass-border">
      <Image
        src={src}
        alt=""
        aria-hidden
        width={36}
        height={36}
        unoptimized
        className="size-full object-contain"
      />
    </span>
  )
}

export default function BookmakersPage() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [loading, setLoading] = useState(true)
  const [bookmakerDialog, setBookmakerDialog] = useState(false)
  const [accountDialog, setAccountDialog] = useState<Bookmaker | null>(null)
  const [txAccount, setTxAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [saving, setSaving] = useState(false)

  async function reload() {
    setBookmakers(await resources.bookmakers.list())
    setLoading(false)
  }

  useEffect(() => {
    reload().catch(() => toast.error("Erro ao carregar casas"))
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return bookmakers
      .filter((bookmaker) => {
        if (term && !bookmaker.name.toLowerCase().includes(term)) return false

        const accounts = bookmaker.accounts?.length ?? 0
        if (status === "with") return accounts > 0
        if (status === "without") return accounts === 0
        if (status === "inactive") return !bookmaker.active

        return true
      })
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          (b.totalBalance ?? 0) - (a.totalBalance ?? 0) ||
          a.name.localeCompare(b.name, "pt-BR")
      )
  }, [bookmakers, search, status])

  async function openTransactions(account: Account) {
    setTxAccount(account)
    setTransactions(await resources.transactions.list(account.id))
  }

  async function handleCreateBookmaker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      await resources.bookmakers.create({
        name: String(form.get("name")),
        website: String(form.get("website") || "") || null,
      })
      toast.success("Casa cadastrada")
      setBookmakerDialog(false)
      await reload()
    } catch {
      toast.error("Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accountDialog) return
    const form = new FormData(event.currentTarget)
    const initialDeposit = Number(form.get("initialDeposit") || 0)
    setSaving(true)
    try {
      await resources.accounts.create({
        bookmakerId: accountDialog.id,
        label: String(form.get("label") || "") || null,
        ...(initialDeposit > 0 ? { initialDeposit } : {}),
      })
      toast.success("Conta criada")
      setAccountDialog(null)
      await reload()
    } catch {
      toast.error("Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!txAccount) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      await resources.transactions.create(txAccount.id, {
        type: form.get("type") as "deposit" | "withdrawal",
        amount: Number(form.get("amount")),
        notes: String(form.get("notes") || "") || undefined,
      })
      toast.success("Movimentação registrada")
      await openTransactions(txAccount)
      await reload()
      ;(event.target as HTMLFormElement).reset?.()
    } catch {
      toast.error("Não foi possível registrar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBookmaker(bookmaker: Bookmaker) {
    if (!confirm(`Excluir a casa "${bookmaker.name}" e suas contas?`)) return
    try {
      const result = (await resources.bookmakers.remove(bookmaker.id)) as {
        softDeleted?: boolean
      }
      toast.success(
        result?.softDeleted ? "Casa tem apostas vinculadas — foi inativada" : "Casa excluída"
      )
      await reload()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  async function handleDeleteAccount(account: Account) {
    if (!confirm("Excluir esta conta?")) return
    try {
      const result = (await resources.accounts.remove(account.id)) as { softDeleted?: boolean }
      toast.success(
        result?.softDeleted ? "Conta tem apostas vinculadas — foi inativada" : "Conta excluída"
      )
      await reload()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Casas & Contas"
        actions={
          <Button onClick={() => setBookmakerDialog(true)}>
            <Plus className="size-4" /> Nova casa
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar casa..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="with">Com conta</SelectItem>
            <SelectItem value="without">Sem conta</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && bookmakers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} de {bookmakers.length} casas
        </p>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : bookmakers.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            icon={Landmark}
            title="Nenhuma casa cadastrada"
            description="Comece criando uma casa de apostas e depois adicione sua conta nela."
            action={
              <Button onClick={() => setBookmakerDialog(true)}>
                <Plus className="size-4" /> Nova casa
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-0">
          <EmptyState icon={Search} title="Nenhuma casa encontrada com esses filtros." />
        </Card>
      ) : (
        filtered.map((bookmaker) => (
          <Card key={bookmaker.id} className={cn(!bookmaker.active && "opacity-60")}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <BookmakerLogo name={bookmaker.name} />
                <CardTitle className="text-lg">{bookmaker.name}</CardTitle>
                {!bookmaker.active && <Badge variant="secondary">Inativa</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex items-baseline gap-2">
                  <span className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                    Saldo total
                  </span>
                  <span
                    className={cn(
                      "numeric text-lg font-semibold tracking-tight",
                      (bookmaker.totalBalance ?? 0) >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatBRL(bookmaker.totalBalance)}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setAccountDialog(bookmaker)}>
                    <Plus className="size-4" /> Conta
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={`Excluir ${bookmaker.name}`}
                    aria-label={`Excluir ${bookmaker.name}`}
                    onClick={() => handleDeleteBookmaker(bookmaker)}
                  >
                    <Trash2 className="size-4 text-loss" />
                  </Button>
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {!bookmaker.accounts?.length ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta nesta casa.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Depósitos</TableHead>
                      <TableHead className="text-right">Saques</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Freebets</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="w-28" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookmaker.accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.label || `Conta #${account.id}`}
                          {!account.active && (
                            <Badge variant="secondary" className="ml-2">
                              Inativa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(account.balance?.deposits)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(account.balance?.withdrawals)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            (account.balance?.profit ?? 0) >= 0
                              ? "text-profit"
                              : "text-loss"
                          )}
                        >
                          {formatSigned(account.balance?.profit)}
                        </TableCell>
                        <TableCell className="text-right text-warning">
                          {account.balance?.pendingFreebets
                            ? `${formatBRL(account.balance.pendingFreebets)} a extrair`
                            : account.balance?.extractedFreebets
                              ? formatBRL(account.balance.extractedFreebets)
                              : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatBRL(account.balance?.balance)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTransactions(account)}
                            >
                              <Wallet className="size-4" /> Movimentar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Excluir conta"
                              aria-label="Excluir conta"
                              onClick={() => handleDeleteAccount(account)}
                            >
                              <Trash2 className="size-4 text-loss" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={bookmakerDialog} onOpenChange={setBookmakerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova casa de apostas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBookmaker} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="ex: Bet365" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">Site (opcional)</Label>
              <Input id="website" name="website" placeholder="https://..." />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accountDialog} onOpenChange={(value) => !value && setAccountDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta em {accountDialog?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Identificação (opcional)</Label>
              <Input id="label" name="label" placeholder="ex: conta principal" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="initialDeposit">Saldo atual (opcional)</Label>
              <DecimalInput
                id="initialDeposit"
                name="initialDeposit"
                min="0"
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Quanto há na conta hoje. Entra como o primeiro lançamento do
                extrato, e o saldo passa a evoluir a partir dele.
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!txAccount} onOpenChange={(value) => !value && setTxAccount(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Movimentações — {txAccount?.label || `Conta #${txAccount?.id}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTransaction} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Select name="type" defaultValue="deposit" required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">
                  <ArrowDownToLine className="size-4" /> Depósito
                </SelectItem>
                <SelectItem value="withdrawal">
                  <ArrowUpFromLine className="size-4" /> Saque
                </SelectItem>
              </SelectContent>
            </Select>
            <DecimalInput name="amount" step="0.01" min="0.01" required placeholder="Valor" />
            <Button type="submit" disabled={saving}>
              Registrar
            </Button>
          </form>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <Table>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground">
                      Sem movimentações
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            transaction.type === "deposit"
                              ? "text-profit"
                              : "text-loss"
                          )}
                        >
                          {transaction.type === "deposit" ? "Depósito" : "Saque"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(transaction.occurredAt)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBRL(transaction.amount)}
                      </TableCell>
                      <TableCell className="w-10">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Excluir movimentação"
                          aria-label="Excluir movimentação"
                          onClick={async () => {
                            await resources.transactions.remove(transaction.id)
                            await openTransactions(txAccount!)
                            await reload()
                          }}
                        >
                          <Trash2 className="size-3.5 text-loss" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
