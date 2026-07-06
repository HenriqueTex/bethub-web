import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RESULT_LABELS } from "@/lib/format"
import type { BetResult } from "@/lib/resources"

const STYLES: Record<BetResult, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  green: "bg-emerald-600 text-white border-transparent",
  half_green: "bg-emerald-400/80 text-emerald-950 border-transparent",
  red: "bg-rose-600 text-white border-transparent",
  half_red: "bg-rose-400/80 text-rose-950 border-transparent",
  void: "bg-slate-400/70 text-slate-950 border-transparent",
  cashout: "bg-amber-500 text-amber-950 border-transparent",
}

export function ResultBadge({ result }: { result: BetResult }) {
  return <Badge className={cn(STYLES[result])}>{RESULT_LABELS[result]}</Badge>
}
