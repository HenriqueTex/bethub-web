"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
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

  const profit = summary?.profit ?? 0
  // No surebet, lucro e ROI já aparecem na calculadora (por operação), e o resumo
  // desce para depois do formulário — que é o que se usa ao abrir a tela.
  const resumoAbaixo = createFormVariant === "surebet"

  const cards = (
    <div
      className={cn(
        "mx-auto grid max-w-6xl grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-4",
        resumoAbaixo ? "xl:grid-cols-2" : "xl:grid-cols-4"
      )}
    >
      {!resumoAbaixo && (
        <>
          <KpiCard
            label={summaryCurrentMonth ? "Lucro no mês" : tagline}
            tone={profit > 0 ? "profit" : profit < 0 ? "loss" : "default"}
            value={formatSigned(summary?.profit)}
            detail={
              <>
                {summaryCurrentMonth ? currentMonth.label : "lucro total"} ·{" "}
                {summary ? formatSignedUnits(summary.profitUnits) : "—"}
              </>
            }
          />
          <KpiCard
            label="ROI"
            value={summary ? formatPercent(summary.roi) : "—"}
            detail={
              <>
                sobre {formatBRL(summary?.staked)} apostados
                {summaryCurrentMonth ? " no mês" : ""}
              </>
            }
          />
        </>
      )}
      <KpiCard
        label="Taxa de acerto"
        value={summary ? formatPercent(summary.hitRate) : "—"}
        detail={
          <>
            {summary?.wins ?? 0} greens · {summary?.losses ?? 0} reds
            {summaryCurrentMonth ? " no mês" : ""}
          </>
        }
      />
      <KpiCard
        label="Em aberto"
        value={summary?.pendingBets ?? "—"}
        detail={
          <>
            {formatBRL(summary?.pendingStake)} em jogo
            {summaryCurrentMonth ? " no mês" : ""}
          </>
        }
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title={methodName}
          description={
            methodName === "Surebet"
              ? "Calcule os cenários e registre cada perna da operação."
              : "Seu registro rápido, com todos os números sob controle."
          }
        />
      </div>

      {!resumoAbaixo && cards}

      <BetsView
        title={methodName}
        lockedMethod={method}
        featuredCreateForm={featuredCreateForm}
        createFormVariant={createFormVariant}
        statsSlot={resumoAbaixo ? cards : null}
        onDataChanged={reloadSummary}
      />
    </div>
  )
}
