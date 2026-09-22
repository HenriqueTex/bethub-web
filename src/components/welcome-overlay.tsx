"use client"

import { MouseEvent } from "react"
import { ArrowRight } from "lucide-react"
import KineticGrid from "@/components/ui/kinetic-grid"
import { Button } from "@/components/ui/button"

export function WelcomeOverlay({
  onStart,
}: {
  onStart: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="fixed inset-0 z-0">
      <KineticGrid className="dark">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-16 text-center">
          <div className="flex max-w-2xl flex-col items-center gap-5 duration-700 animate-in fade-in slide-in-from-bottom-4">
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white/70">
              Seu controle de apostas
            </span>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">
              <span className="text-primary">Bet</span>hub
            </h1>
            <p className="max-w-md text-base text-white/60">
              Todas as suas apostas, casas e resultados em um lugar só
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={onStart}
            className="h-10 rounded-full border-white/15 px-5 font-normal text-white/80 duration-700 animate-in fade-in hover:bg-white/5 hover:text-white"
          >
            Comece aqui
            <ArrowRight className="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
          </Button>
        </main>
      </KineticGrid>
    </div>
  )
}
