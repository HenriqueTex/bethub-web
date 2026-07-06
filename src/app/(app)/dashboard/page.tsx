"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
import { formatBRL, formatSigned } from "@/lib/format"
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

const chartConfig = {
  cumulativeProfit: { label: "Lucro acumulado", color: "#059669" },
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

  useEffect(() => {
    Promise.all([resources.stats.summary(filters), resources.stats.timeline(filters)])
      .then(([summaryData, timelineData]) => {
        setSummary(summaryData)
        setTimeline(timelineData)
      })
      .catch(() => toast.error("Erro ao carregar estatísticas"))
  }, [filters])

  useEffect(() => {
    resources.stats
      .by(dimension, filters)
      .then((rows) => setRankings((current) => ({ ...current, [dimension]: rows })))
      .catch(() => toast.error("Erro ao carregar ranking"))
  }, [dimension, filters])

  const profitPositive = (summary?.profit ?? 0) >= 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={period} onValueChange={(value) => setPeriod(String(value))}>
          <SelectTrigger className="w-44">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Lucro no período</CardDescription>
            <CardTitle
              className={cn("text-2xl", profitPositive ? "text-emerald-600" : "text-rose-600")}
            >
              {formatSigned(summary?.profit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary ? `${summary.profitUnits > 0 ? "+" : ""}${summary.profitUnits}u` : "—"} ·
            odd média {summary?.avgOdd ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>ROI / Taxa de acerto</CardDescription>
            <CardTitle className="text-2xl">
              {summary ? `${summary.roi}%` : "—"}
              <span className="mx-2 text-muted-foreground">·</span>
              {summary ? `${summary.hitRate}%` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            sobre {formatBRL(summary?.staked)} apostados
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Saldo nas casas</CardDescription>
            <CardTitle className="text-2xl">{formatBRL(summary?.totalBalance)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            depósitos − saques + lucro liquidado
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Apostas</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.totalBets ?? "—"}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({summary?.pendingBets ?? 0} abertas)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatBRL(summary?.pendingStake)} em jogo
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lucro acumulado</CardTitle>
          <CardDescription>Evolução do lucro liquidado no período</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sem apostas liquidadas no período
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={timeline} margin={{ left: 8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.35} />
                <XAxis
                  dataKey="day"
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
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#fillProfit)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ChartContainer>
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
            <TabsList>
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
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">Acerto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!rankings[option.value]?.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                              row.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {formatSigned(row.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.profitUnits > 0 ? "+" : ""}
                            {row.profitUnits}u
                          </TableCell>
                          <TableCell className="text-right">{row.roi}%</TableCell>
                          <TableCell className="text-right">{row.hitRate}%</TableCell>
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
