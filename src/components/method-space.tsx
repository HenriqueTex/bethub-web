"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import BetsView from "@/components/bets-view"
import { formatBRL, formatSigned, formatPercent, formatSignedUnits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { resources, Method, StatsSummary } from "@/lib/resources"

interface MethodSpaceProps {
  methodName: string
  tagline: string
  featuredCreateForm?: boolean
  createFormVariant?: "punter" | "surebet"
  summaryCurrentMonth?: boolean
}

function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getCurrentMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: toDateOnly(from),
    to: toDateOnly(to),
    label: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(now),
  }
}

export default function MethodSpace({
  methodName,
  tagline,
  featuredCreateForm = false,
  createFormVariant,
  summaryCurrentMonth = false,
}: MethodSpaceProps) {
  const [method, setMethod] = useState<Method | null>(null)
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const currentMonth = useMemo(() => getCurrentMonthRange(), [])

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
      .summary({
        methodId: method.id,
        from: summaryCurrentMonth ? currentMonth.from : undefined,
        to: summaryCurrentMonth ? currentMonth.to : undefined,
      })
      .then(setSummary)
      .catch(() => toast.error("Erro ao carregar estatísticas"))
  }, [currentMonth.from, currentMonth.to, method, summaryCurrentMonth])

  useEffect(() => {
    reloadSummary()
  }, [reloadSummary])

  if (!method) {
    return <p className="text-muted-foreground">Carregando...</p>
  }

  const profitPositive = (summary?.profit ?? 0) >= 0

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl"><p className="mb-1 text-xs font-medium uppercase tracking-widest text-primary">Registro de apostas</p><h1 className="text-2xl font-bold">{methodName}</h1><p className="mt-1 text-sm text-muted-foreground">{methodName === "Surebet" ? "Calcule os cenários e registre cada perna da operação." : "Seu registro rápido, com todos os números sob controle."}</p></div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4 [&>div]:min-w-0 [&_[data-slot=card-header]]:px-3 [&_[data-slot=card-content]]:px-3 sm:[&_[data-slot=card-header]]:px-6 sm:[&_[data-slot=card-content]]:px-6">
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>{summaryCurrentMonth ? "Lucro no mês" : tagline}</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                profitPositive ? "text-profit" : "text-loss"
              )}
            >
              {formatSigned(summary?.profit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summaryCurrentMonth ? currentMonth.label : "lucro total"} ·{" "}
            {summary ? formatSignedUnits(summary.profitUnits) : "—"}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>ROI</CardDescription>
            <CardTitle className="text-2xl">{summary ? formatPercent(summary.roi) : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            sobre {formatBRL(summary?.staked)} apostados
            {summaryCurrentMonth ? " no mês" : ""}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>Taxa de acerto</CardDescription>
            <CardTitle className="text-2xl">{summary ? formatPercent(summary.hitRate) : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.wins ?? 0} greens · {summary?.losses ?? 0} reds
            {summaryCurrentMonth ? " no mês" : ""}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-0">
            <CardDescription>Em aberto</CardDescription>
            <CardTitle className="text-2xl">{summary?.pendingBets ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatBRL(summary?.pendingStake)} em jogo
            {summaryCurrentMonth ? " no mês" : ""}
          </CardContent>
        </Card>
      </div>

      <BetsView
        title={methodName}
        lockedMethod={method}
        featuredCreateForm={featuredCreateForm}
        createFormVariant={createFormVariant}
        onDataChanged={reloadSummary}
      />
    </div>
  )
}
