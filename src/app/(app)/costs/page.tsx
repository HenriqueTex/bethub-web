"use client"

import { FormEvent, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DecimalInput } from "@/components/decimal-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  resources,
  type Cost,
  type CostKind,
  type CostSummary,
  type Tipster
} from "@/lib/resources"

const KIND_LABEL: Record<CostKind, string> = {
  one_time: "Pontual",
  monthly: "Mensal"
}

function monthBounds() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10)
  return { from: iso(first), to: iso(last) }
}

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [tipsters, setTipsters] = useState<Tipster[]>([])
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<Cost | "new" | null>(null)
  const [kind, setKind] = useState<CostKind>("monthly")
  const [selected, setSelected] = useState<number[]>([])
  const [period] = useState(monthBounds)

  async function reload() {
    const [list, summaryData, tipsterList] = await Promise.all([
      resources.costs.list(),
      resources.costs.summary(period),
      resources.tipsters.list()
    ])
    setCosts(list)
    setSummary(summaryData)
    setTipsters(tipsterList)
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    Promise.all([
      resources.costs.list(),
      resources.costs.summary(period),
      resources.tipsters.list()
    ])
      .then(([list, summaryData, tipsterList]) => {
        if (!alive) return
        setCosts(list)
        setSummary(summaryData)
        setTipsters(tipsterList)
        setLoading(false)
      })
      .catch(() => alive && toast.error("Erro ao carregar custos"))
    return () => {
      alive = false
    }
  }, [period])

  function openDialog(cost: Cost | "new") {
    setDialog(cost)
    setKind(cost === "new" ? "monthly" : cost.kind)
    setSelected(cost === "new" ? [] : (cost.tipsters ?? []).map((t) => t.id))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const endsOn = String(form.get("endsOn") || "")
    const payload = {
      description: String(form.get("description")),
      amount: Number(String(form.get("amount")).replace(",", ".")),
      kind,
      startsOn: String(form.get("startsOn")),
      endsOn: kind === "monthly" && endsOn ? endsOn : null,
      notes: String(form.get("notes") || "") || null,
      tipsterIds: selected
    }
    setSaving(true)
    try {
      if (dialog === "new") {
        await resources.costs.create(payload)
        toast.success("Custo cadastrado")
      } else if (dialog) {
        await resources.costs.update(dialog.id, payload)
        toast.success("Custo atualizado")
      }
      setDialog(null)
      await reload()
    } catch {
      toast.error("Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  async function remove(cost: Cost) {
    if (!confirm(`Excluir o custo "${cost.description}"?`)) return
    try {
      await resources.costs.remove(cost.id)
      toast.success("Custo excluído")
      await reload()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  const editing = dialog === "new" ? null : dialog
  const byTipster = summary?.byTipster ?? {}
  const rateados = tipsters
    .map((tipster) => ({ tipster, value: byTipster[String(tipster.id)] ?? 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="page-heading">
        <h1 className="text-2xl font-bold">Custos</h1>
        <Button onClick={() => openDialog("new")}>
          <Plus className="size-4" /> Novo custo
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-baseline gap-x-8 gap-y-2 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Custo no mês</p>
            <p className="text-2xl font-bold text-loss">
              {formatBRL(summary?.total ?? 0)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {period.from.split("-").reverse().join("/")} a{" "}
            {period.to.split("-").reverse().join("/")}
          </p>
        </CardContent>
      </Card>

      {rateados.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-sm font-medium">Rateio por tipster no mês</p>
            <div className="flex flex-wrap gap-2">
              {rateados.map(({ tipster, value }) => (
                <Badge key={tipster.id} variant="outline" className="gap-2">
                  {tipster.name}
                  <span className="font-semibold text-loss">
                    {formatBRL(value)}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : costs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum custo cadastrado. Lance aqui assinaturas de grupo, contas e
            outras despesas para que entrem no seu resultado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Rateio</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow
                    key={cost.id}
                    className={cn(cost.endsOn && "opacity-60")}
                  >
                    <TableCell className="font-medium">
                      {cost.description}
                      {cost.endsOn && (
                        <Badge variant="secondary" className="ml-2">
                          Encerrado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{KIND_LABEL[cost.kind]}</TableCell>
                    <TableCell>
                      {cost.startsOn?.slice(0, 10).split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cost.tipsters?.length
                        ? cost.tipsters.map((t) => t.name).join(", ")
                        : "Geral"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatBRL(cost.amount)}
                      {cost.kind === "monthly" && (
                        <span className="text-xs text-muted-foreground">/mês</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDialog(cost)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(cost)}
                        >
                          <Trash2 className="size-4 text-loss" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar custo" : "Novo custo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cost-description">Descrição</Label>
              <Input
                id="cost-description"
                name="description"
                required
                maxLength={150}
                defaultValue={editing?.description}
                placeholder="Grupo do João, conta bet365…"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(["monthly", "one_time"] as const).map((value) => (
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
              <p className="text-xs text-muted-foreground">
                {kind === "monthly"
                  ? "Cobrado todo mês a partir da data de início, até você encerrar."
                  : "Cobrado uma única vez, na data informada."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cost-amount">Valor</Label>
                <DecimalInput
                  id="cost-amount"
                  name="amount"
                  required
                  step="0.01"
                  min="0.01"
                  defaultValue={editing?.amount}
                  placeholder="100,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost-startsOn">
                  {kind === "monthly" ? "Início" : "Data"}
                </Label>
                <Input
                  id="cost-startsOn"
                  name="startsOn"
                  required
                  type="date"
                  defaultValue={editing?.startsOn?.slice(0, 10)}
                />
              </div>
            </div>
            {kind === "monthly" && (
              <div className="grid gap-2">
                <Label htmlFor="cost-endsOn">Encerrado em (opcional)</Label>
                <Input
                  id="cost-endsOn"
                  name="endsOn"
                  type="date"
                  defaultValue={editing?.endsOn?.slice(0, 10) ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Preencha quando cancelar, para o custo parar de contar.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Dividir entre (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {tipsters.filter((t) => t.active).map((tipster) => {
                  const on = selected.includes(tipster.id)
                  return (
                    <Button
                      key={tipster.id}
                      type="button"
                      size="sm"
                      variant={on ? "secondary" : "ghost"}
                      aria-pressed={on}
                      onClick={() =>
                        setSelected((current) =>
                          on
                            ? current.filter((id) => id !== tipster.id)
                            : [...current, tipster.id]
                        )
                      }
                    >
                      {tipster.name}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selected.length === 0
                  ? "Sem tipster: entra no resultado geral, mas não no de ninguém."
                  : `Dividido igualmente entre ${selected.length} tipster${selected.length > 1 ? "s" : ""}.`}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost-notes">Notas (opcional)</Label>
              <Textarea
                id="cost-notes"
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
