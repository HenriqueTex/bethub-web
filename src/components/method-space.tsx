"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import BetsView from "@/components/bets-view"
import { formatBRL, formatSigned } from "@/lib/format"
import { cn } from "@/lib/utils"
import { resources, Method, StatsSummary } from "@/lib/resources"

interface MethodSpaceProps {
  methodName: string
  tagline: string
}

export default function MethodSpace({ methodName, tagline }: MethodSpaceProps) {
  const [method, setMethod] = useState<Method | null>(null)
  const [summary, setSummary] = useState<StatsSummary | null>(null)

  useEffect(() => {
    resources.methods
      .list()
      .then(async (methods) => {
        const existing = methods.find(
          (item) => item.name.toLowerCase() === methodName.toLowerCase()
        )
        setMethod(existing ?? (await resources.methods.create({ name: methodName })))
      })
      .catch(() => toast.error(`Erro ao carregar o método ${methodName}`))
  }, [methodName])

  const reloadSummary = useCallback(() => {
    if (!method) return
    resources.stats
      .summary({ methodId: method.id })
      .then(setSummary)
      .catch(() => toast.error("Erro ao carregar estatísticas"))
  }, [method])

  useEffect(() => {
    reloadSummary()
  }, [reloadSummary])

  if (!method) {
    return <p className="text-muted-foreground">Carregando...</p>
  }

  const profitPositive = (summary?.profit ?? 0) >= 0

  return (
    <div className="space-y-6">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>{tagline}</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                profitPositive ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatSigned(summary?.profit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            lucro total · {summary ? `${summary.profitUnits > 0 ? "+" : ""}${summary.profitUnits}u` : "—"}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>ROI</CardDescription>
            <CardTitle className="text-2xl">{summary ? `${summary.roi}%` : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            sobre {formatBRL(summary?.staked)} apostados
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>Taxa de acerto</CardDescription>
            <CardTitle className="text-2xl">{summary ? `${summary.hitRate}%` : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.wins ?? 0} greens · {summary?.losses ?? 0} reds
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>Em aberto</CardDescription>
            <CardTitle className="text-2xl">{summary?.pendingBets ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatBRL(summary?.pendingStake)} em jogo
          </CardContent>
        </Card>
      </div>

      <BetsView title={methodName} lockedMethod={method} onDataChanged={reloadSummary} />
    </div>
  )
}
