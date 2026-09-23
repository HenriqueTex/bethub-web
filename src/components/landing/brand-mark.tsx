import { ChartCandlestick } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/12">
        <ChartCandlestick className="size-4 text-primary dark:text-brand-bright" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight text-foreground",
          compact && "sr-only"
        )}
      >
        <span className="text-primary dark:text-brand-bright">Bet</span>Hub
      </span>
    </span>
  )
}
