import { TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export type MetricTrend = "up" | "down" | "neutral"

export function MetricCard({
  label,
  value,
  detail,
  trend = "neutral",
  positive = false,
}: {
  label: string
  value: string
  detail: string
  trend?: MetricTrend
  positive?: boolean
}) {
  const Icon = trend === "down" ? TrendingDown : TrendingUp

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2.5 sm:px-3.5 sm:py-3">
      <p className="text-[9.5px] font-medium tracking-[0.06em] text-white/55 uppercase sm:text-[10.5px] sm:tracking-[0.08em]">
        {label}
      </p>
      <p
        className={cn(
          "numeric mt-1.5 text-[11px] font-semibold tracking-tight sm:text-base",
          positive ? "text-profit" : "text-white",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-[10.5px] sm:text-[11.5px]",
          trend === "up" && "text-profit",
          trend === "down" && "text-loss",
          trend === "neutral" && "text-white/55",
        )}
      >
        {trend !== "neutral" ? <Icon className="size-3 shrink-0" aria-hidden="true" /> : null}
        {detail}
      </p>
    </div>
  )
}
