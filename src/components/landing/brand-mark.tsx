import { ChartCandlestick } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/12">
        <ChartCandlestick className="size-4 text-brand-bright" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        <span className="text-brand-bright">Bet</span>hub
      </span>
    </span>
  )
}
