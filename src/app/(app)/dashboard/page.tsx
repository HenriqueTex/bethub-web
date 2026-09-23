"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { formatBRL, formatSigned, formatOdd, formatPercent, formatSignedUnits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { resources, StatsRow, StatsSummary, TimelinePoint } from "@/lib/resources"

const PERIODS = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "year", label: "Este ano" },
  { value: "all", label: "Todo o período" },
]

const DIMENSIONS = [
  { value: "bookmaker", label: "Casas" },
  { value: "tipster", label: "Tipsters" },
  { value: "method", label: "Métodos" },
  { value: "market", label: "Mercados" },
  { value: "month", label: "Por mês" },
]

function periodFrom(period: string): string | undefined {
  const now = new Date()
  if (period === "30d") {
    return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  }
  if (period === "90d") {
    return new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
  }
  if (period === "year") return `${now.getFullYear()}-01-01`
  return undefined
}

// Com um único dia liquidado a área não tem o que ligar; o acumulado parte de zero na véspera.
function withOrigin(points: TimelinePoint[]): TimelinePoint[] {
  if (points.length !== 1) return points
  const previous = new Date(`${points[0].day}T12:00:00`)
  previous.setDate(previous.getDate() - 1)
  return [{ day: previous.toISOString().slice(0, 10), profit: 0, cumulativeProfit: 0 }, ...points]
}

const AXIS_TICK = {
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-roboto-mono), monospace",
  fontSize: 11,
}

const chartConfig = {
  cumulativeProfit: { label: "Lucro acumulado", color: "var(--profit)" },
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("all")
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [rankings, setRankings] = useState<Record<string, StatsRow[]>>({})
  const [dimension, setDimension] = useState("bookmaker")

  const filters = useMemo(() => {
    const from = periodFrom(period)
    return from ? { from } : {}
  }, [period])

  /**
   * O gradiente corre de cima (maior valor) para baixo (menor), então o zero fica
   * nesta fração da altura — é onde o verde vira vermelho.
   */
  const strokeZeroOffset = useMemo(() => {
    const values = timeline.map((point) => point.cumulativeProfit)
    const max = Math.max(...values)
    const min = Math.min(...values)
    if (max <= 0) return 0
    if (min >= 0) return 1
    return max / (max - min)
  }, [timeline])

  const zeroOffset = useMemo(() => {
    const valores = timeline.map((point) => point.cumulativeProfit)
    const max = Math.max(0, ...valores)
    const min = Math.min(0, ...valores)
    if (max <= 0) return 0
    if (min >= 0) return 1
    return max / (max - min)
  }, [timeline])

  useEffect(() => {
    Promise.all([resources.stats.summary(filters), resources.stats.timeline(filters)])
      .then(([summaryData, timelineData]) => {
        setSummary(summaryData)
        setTimeline(withOrigin(timelineData))
      })
      .catch(() => toast.error("Erro ao carregar estatísticas"))
  }, [filters])

  useEffect(() => {
    resources.stats
      .by(dimension, filters)
      .then((rows) => setRankings((current) => ({ ...current, [dimension]: rows })))
      .catch(() => toast.error("Erro ao carregar ranking"))
  }, [dimension, filters])

  const lastProfit = timeline.at(-1)?.cumulativeProfit ?? 0
  const lastColor = lastProfit >= 0 ? "var(--profit)" : "var(--loss)"
  const temCusto = (summary?.costs ?? 0) > 0
  const netProfit = summary?.netProfit ?? summary?.profit ?? 0
  const profitTone = netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "default"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Seu desempenho, além de cada aposta."
        actions={
          <Select value={period} onValueChange={(value) => setPeriod(String(value))}>
            <SelectTrigger aria-label="Período do dashboard" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Lucro no período"
          tone={profitTone}
          value={formatSigned(summary?.netProfit ?? summary?.profit)}
          detail={
            temCusto ? (
              <>
                {formatSigned(summary?.profit)} em apostas · custos{" "}
                <span className="text-loss">-{formatBRL(summary?.costs)}</span>
              </>
            ) : (
              <>
                {summary ? formatSignedUnits(summary.profitUnits) : "—"} · odd média{" "}
                {summary ? formatOdd(summary.avgOdd) : "—"}
              </>
            )
          }
        />
        <KpiCard
          label="ROI / Taxa de acerto"
          value={
            <>
              <span className="whitespace-nowrap">
                {summary ? formatPercent(summary.netRoi ?? summary.roi) : "—"}
              </span>
              <span className="whitespace-nowrap">
                <span className="mx-1.5 text-muted-foreground">·</span>
                {summary ? formatPercent(summary.hitRate) : "—"}
              </span>
            </>
          }
          detail={
            <>
              sobre {formatBRL(summary?.staked)} apostados
              {temCusto && ` · ${formatPercent(summary?.roi)} sem custos`}
            </>
          }
        />
        <KpiCard
          label="Saldo nas casas"
          value={formatBRL(summary?.totalBalance)}
          detail="depósitos − saques + lucro liquidado"
        />
        <KpiCard
          label="Apostas"
          value={
            <>
              {summary?.totalBets ?? "—"}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                ({summary?.pendingBets ?? 0} abertas)
              </span>
            </>
          }
          detail={`${formatBRL(summary?.pendingStake)} em jogo`}
        />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Lucro acumulado</CardTitle>
            <CardDescription>Evolução do lucro liquidado no período</CardDescription>
          </div>
          {timeline.length > 0 && (
            <p
              className={cn(
                "numeric text-xs font-medium whitespace-nowrap",
                lastProfit >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatBRL(timeline[0].cumulativeProfit)} → {formatBRL(lastProfit)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sem apostas liquidadas no período
            </p>
          ) : (
            <div className="rounded-xl border border-glass-border bg-foreground/[0.02] p-2 sm:p-3">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={timeline} margin={{ left: 8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={0} stopColor="var(--profit)" stopOpacity={0.25} />
                    <stop offset={zeroOffset} stopColor="var(--profit)" stopOpacity={0.04} />
                    <stop offset={zeroOffset} stopColor="var(--loss)" stopOpacity={0.04} />
                    <stop offset={1} stopColor="var(--loss)" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="strokeProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={strokeZeroOffset} stopColor="var(--profit)" />
                    <stop offset={strokeZeroOffset} stopColor="var(--loss)" />
                  </linearGradient>
                </defs>
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" />
                <CartesianGrid vertical={false} strokeOpacity={0.35} />
                <XAxis
                  dataKey="day"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) =>
                    new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(value: number) => formatBRL(value)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")
                      }
                      formatter={(value) => [formatBRL(Number(value)), " acumulado"]}
                    />
                  }
                />
                <Area
                  dataKey="cumulativeProfit"
                  type="monotone"
                  baseValue={0}
                  stroke="url(#strokeProfit)"
                  strokeWidth={2}
                  fill="url(#fillProfit)"
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; index?: number }) =>
                    props.index === timeline.length - 1 && props.cx != null && props.cy != null ? (
                      <g key="last">
                        <circle cx={props.cx} cy={props.cy} r={7} fill={lastColor} opacity={0.18} />
                        <circle cx={props.cx} cy={props.cy} r={3} fill={lastColor} />
                      </g>
                    ) : (
                      <g key={props.index} />
                    )
                  }
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho</CardTitle>
          <CardDescription>Lucro e ROI por dimensão</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={dimension} onValueChange={(value) => setDimension(String(value))}>
            <TabsList aria-label="Dimensão do desempenho">
              {DIMENSIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {DIMENSIONS.map((option) => (
              <TabsContent key={option.value} value={option.value} className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{option.label === "Por mês" ? "Mês" : option.label.slice(0, -1)}</TableHead>
                      <TableHead className="text-right">Apostas</TableHead>
                      <TableHead className="text-right">Apostado</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      {option.value === "tipster" && (
                        <>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Líquido</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">Acerto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!rankings[option.value]?.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={option.value === "tipster" ? 9 : 7}
                          className="text-center text-muted-foreground"
                        >
                          Sem dados no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      rankings[option.value].map((row, index) => (
                        <TableRow key={`${row.key}-${index}`}>
                          <TableCell className="font-medium">
                            {row.label ?? (option.value === "tipster" ? "Aposta própria" : "—")}
                          </TableCell>
                          <TableCell className="text-right">{row.totalBets}</TableCell>
                          <TableCell className="text-right">{formatBRL(row.staked)}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium",
                              row.profit >= 0 ? "text-profit" : "text-loss"
                            )}
                          >
                            {formatSigned(row.profit)}
                          </TableCell>
                          {option.value === "tipster" && (
                            <>
                              <TableCell className="text-right text-loss">
                                {row.cost ? `-${formatBRL(row.cost)}` : "—"}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-medium",
                                  (row.netProfit ?? row.profit) >= 0
                                    ? "text-profit"
                                    : "text-loss"
                                )}
                              >
                                {formatSigned(row.netProfit ?? row.profit)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right">
                            {formatSignedUnits(row.profitUnits)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(option.value === "tipster" ? (row.netRoi ?? row.roi) : row.roi)}
                          </TableCell>
                          <TableCell className="text-right">{formatPercent(row.hitRate)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
