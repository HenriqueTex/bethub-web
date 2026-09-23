import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RESULT_LABELS } from "@/lib/format"
import type { BetResult } from "@/lib/resources"

const STYLES: Record<BetResult, string> = {
  pending: "border-warning/30 bg-warning/10 text-warning",
  green: "border-transparent bg-profit text-background",
  half_green: "border-profit/40 bg-profit/10 text-profit",
  red: "border-transparent bg-loss text-background",
  half_red: "border-loss/40 bg-loss/10 text-loss",
  void: "border-border bg-muted text-muted-foreground",
  cashout: "border-border bg-transparent text-foreground",
}

export function ResultBadge({ result }: { result: BetResult }) {
  return <Badge className={cn(STYLES[result])}>{RESULT_LABELS[result]}</Badge>
}
