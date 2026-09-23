"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Gift, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { formatBRL, formatDate } from "@/lib/format"
import { Freebet, FreebetStatus, resources } from "@/lib/resources"

const TRIGGER_LABELS: Record<string, string> = {
  on_loss: "Ao perder",
  on_win: "Ao ganhar",
  always: "Sempre",
}

const STATUS_TITLES: Record<FreebetStatus, string> = {
  pending: "Extraível pendente",
  extracted: "Extraído",
  discarded: "Descartado",
}

const STATUS_DETAILS: Record<FreebetStatus, string> = {
  pending: "Valor extraível das freebets pendentes (ainda não somado ao saldo)",
  extracted: "Valor já extraído e creditado no saldo",
  discarded: "Freebets descartadas",
}

const EMPTY_LABELS: Record<FreebetStatus, string> = {
  pending: "pendente",
  extracted: "extraída",
  discarded: "descartada",
}

export default function FreebetsPage() {
  const [status, setStatus] = useState<FreebetStatus>("pending")
  const [freebets, setFreebets] = useState<Freebet[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    resources.freebets
      .list(status)
      .then(setFreebets)
      .catch(() => toast.error("Erro ao carregar freebets"))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => {
    reload()
  }, [reload])

  async function act(freebet: Freebet, action: "extract" | "discard" | "reopen") {
    try {
      await resources.freebets[action](freebet.id)
      toast.success(
        action === "extract"
          ? "Freebet extraída — valor creditado no saldo"
          : action === "discard"
            ? "Freebet descartada"
            : "Freebet reaberta"
      )
      reload()
    } catch {
      toast.error("Não foi possível atualizar")
    }
  }

  const total = freebets.reduce((sum, freebet) => sum + freebet.extractedValue, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Freebets" />

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label={STATUS_TITLES[status]}
          tone="warning"
          value={formatBRL(total)}
          detail={STATUS_DETAILS[status]}
        />
      </div>

      <Tabs value={status} onValueChange={(value) => setStatus(value as FreebetStatus)}>
        <TabsList aria-label="Situação das freebets">
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="extracted">Extraídas</TabsTrigger>
          <TabsTrigger value="discarded">Descartadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-panel border bg-card shadow-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Casa</TableHead>
              <TableHead>Gatilho</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Extração</TableHead>
              <TableHead className="text-right">Extraível</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : freebets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="p-0">
                  <EmptyState icon={Gift} title={`Nenhuma freebet ${EMPTY_LABELS[status]}`} />
                </TableCell>
              </TableRow>
            ) : (
              freebets.map((freebet) => (
                <TableRow key={freebet.id}>
                  <TableCell className="max-w-48 truncate">
                    {freebet.sourceBet?.selection ?? freebet.sourceBet?.event ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {freebet.account?.bookmaker?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TRIGGER_LABELS[freebet.trigger]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(freebet.value)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {freebet.extractionRate}%
                  </TableCell>
                  <TableCell className="text-right font-medium text-warning">
                    {formatBRL(freebet.extractedValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(freebet.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {status === "pending" ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Extrair (creditar no saldo)"
                            aria-label="Extrair (creditar no saldo)"
                            onClick={() => act(freebet, "extract")}
                          >
                            <Check className="size-4 text-profit" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Descartar"
                            aria-label="Descartar"
                            onClick={() => act(freebet, "discard")}
                          >
                            <X className="size-4 text-loss" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Reabrir (voltar a pendente)"
                          aria-label="Reabrir (voltar a pendente)"
                          onClick={() => act(freebet, "reopen")}
                        >
                          <RotateCcw className="size-4 text-muted-foreground" />
                        </Button>
                      )}
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
