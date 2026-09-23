import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-semibold tracking-tight text-foreground", className)}>
      <span className="text-primary dark:text-brand-bright">Bet</span>Hub
    </span>
  )
}
