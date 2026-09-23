import { ReactNode } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  detail,
  tone = "default",
  trend = true,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: "default" | "profit" | "loss" | "warning"
  trend?: boolean
}) {
  const Trend = tone === "loss" ? TrendingDown : TrendingUp

  return (
    <div className="min-w-0 rounded-panel border bg-card p-4 shadow-panel sm:p-5">
      <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "numeric mt-2 flex items-center gap-1.5 text-lg leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-xl",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warning" && "text-warning"
        )}
      >
        {trend && (tone === "profit" || tone === "loss") && (
          <Trend className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">{value}</span>
      </p>
      {detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  )
}
