import { cn } from "@/lib/utils"
import { RESULT_LABELS } from "@/lib/format"
import type { BetResult } from "@/lib/resources"

const STYLES: Record<BetResult, string> = {
  pending: "border-warning/30 bg-warning/10 text-warning",
  green: "border-profit/30 bg-profit/10 text-profit",
  half_green: "border-profit/25 text-profit",
  red: "border-loss/30 bg-loss/10 text-loss",
  half_red: "border-loss/25 text-loss",
  void: "border-glass-border text-muted-foreground",
  cashout: "border-glass-border bg-foreground/[0.03] text-foreground",
}

const DOTS: Record<BetResult, string> = {
  pending: "bg-warning",
  green: "bg-profit",
  half_green: "bg-profit/60",
  red: "bg-loss",
  half_red: "bg-loss/60",
  void: "bg-muted-foreground/60",
  cashout: "bg-foreground/60",
}

export function ResultBadge({ result }: { result: BetResult }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[result]
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOTS[result])} />
      {RESULT_LABELS[result]}
    </span>
  )
}
