import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: "default" | "profit" | "loss" | "warning"
}) {
  return (
    <div className="min-w-0 rounded-panel border bg-card p-4 shadow-panel sm:p-5">
      <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "numeric mt-2 text-lg leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-xl",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  )
}
