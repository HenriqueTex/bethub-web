"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Gift, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Freebet, FreebetStatus, resources } from "@/lib/resources"

const TRIGGER_LABELS: Record<string, string> = {
  on_loss: "Ao perder",
  on_win: "Ao ganhar",
  always: "Sempre",
}

const STATUS_LABELS: Record<FreebetStatus, string> = {
  pending: "Pendentes",
  extracted: "Extraídas",
  discarded: "Descartadas",
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="size-6 text-warning" />
        <h1 className="text-2xl font-bold">Freebets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-warning">{formatBRL(total)}</CardTitle>
          <CardDescription>
            {status === "pending"
              ? "Valor extraível das freebets pendentes (ainda não somado ao saldo)"
              : status === "extracted"
                ? "Valor já extraído e creditado no saldo"
                : "Freebets descartadas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={status} onValueChange={(value) => setStatus(value as FreebetStatus)}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="extracted">Extraídas</TabsTrigger>
              <TabsTrigger value="discarded">Descartadas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 rounded-lg border">
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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma freebet {STATUS_LABELS[status].toLowerCase()}
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
                                onClick={() => act(freebet, "extract")}
                              >
                                <Check className="size-4 text-profit" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Descartar"
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
                              onClick={() => act(freebet, "reopen")}
                            >
                              <RotateCcw className={cn("size-4 text-muted-foreground")} />
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
        </CardContent>
      </Card>
    </div>
  )
}
