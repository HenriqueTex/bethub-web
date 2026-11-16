"use client"

import { FormEvent, useEffect, useState } from "react"
import { toast } from "sonner"
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { resources, StatsRow, Tipster } from "@/lib/resources"
import { formatPercent, formatSigned } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function TipstersPage() {
  const [tipsters, setTipsters] = useState<Tipster[]>([])
  const [results, setResults] = useState<Map<number, StatsRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Tipster | null>(null)
  const [saving, setSaving] = useState(false)

  async function reload() {
    const [tipstersData, statsRows] = await Promise.all([
      resources.tipsters.list(),
      resources.stats.by("tipster").catch(() => [] as StatsRow[]),
    ])
    setTipsters(tipstersData)
    setResults(
      new Map(
        statsRows
          .filter((row) => row.key !== null)
          .map((row) => [Number(row.key), row] as const)
      )
    )
    setLoading(false)
  }

  useEffect(() => {
    reload().catch(() => toast.error("Erro ao carregar tipsters"))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = {
      name: String(form.get("name")),
      channel: String(form.get("channel") || "") || null,
      notes: String(form.get("notes") || "") || null,
    }
    setSaving(true)
    try {
      if (editing) {
        await resources.tipsters.update(editing.id, data)
        toast.success("Tipster atualizado")
      } else {
        await resources.tipsters.create(data)
        toast.success("Tipster criado")
      }
      setOpen(false)
      setEditing(null)
      await reload()
    } catch {
      toast.error("Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tipster: Tipster) {
    if (!confirm(`Excluir o tipster "${tipster.name}"?`)) return
    try {
      const result = (await resources.tipsters.remove(tipster.id)) as { softDeleted?: boolean }
      toast.success(
        result?.softDeleted
          ? "Tipster tem apostas vinculadas — foi inativado"
          : "Tipster excluído"
      )
      await reload()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Tipsters"
        actions={
          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value)
              if (!value) setEditing(null)
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo tipster
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar tipster" : "Novo tipster"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required defaultValue={editing?.name ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel">Canal (opcional)</Label>
                  <Input
                    id="channel"
                    name="channel"
                    placeholder="@canal ou link"
                    defaultValue={editing?.channel ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Input id="notes" name="notes" defaultValue={editing?.notes ?? ""} />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-panel border bg-card shadow-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Resultado geral</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : tipsters.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={Megaphone}
                    title="Nenhum tipster cadastrado"
                    action={
                      <Button
                        onClick={() => {
                          setEditing(null)
                          setOpen(true)
                        }}
                      >
                        <Plus className="size-4" /> Novo tipster
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              tipsters.map((tipster) => (
                <TableRow key={tipster.id}>
                  <TableCell className="font-medium">{tipster.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {tipster.channel ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tipster.active ? "outline" : "secondary"}>
                      {tipster.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TipsterResult row={results.get(tipster.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={`Editar ${tipster.name}`}
                        aria-label={`Editar ${tipster.name}`}
                        onClick={() => {
                          setEditing(tipster)
                          setOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={`Excluir ${tipster.name}`}
                        aria-label={`Excluir ${tipster.name}`}
                        onClick={() => handleDelete(tipster)}
                      >
                        <Trash2 className="size-4 text-loss" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const toneOf = (value: number) =>
  value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-muted-foreground"

function TipsterResult({ row }: { row?: StatsRow }) {
  if (!row || row.totalBets === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  const cost = row.cost ?? 0
  return (
    <div>
      <p className={cn("numeric font-medium", toneOf(row.profit))}>{formatSigned(row.profit)}</p>
      <p className="text-xs text-muted-foreground">
        {row.totalBets} {row.totalBets === 1 ? "aposta" : "apostas"} · ROI {formatPercent(row.roi)}
      </p>
      {cost > 0 && row.netProfit !== undefined && (
        <p className={cn("text-xs", toneOf(row.netProfit))}>
          Líquido de custos {formatSigned(row.netProfit)}
        </p>
      )}
    </div>
  )
}
