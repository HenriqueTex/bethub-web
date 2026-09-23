"use client"

import { MouseEvent } from "react"
import { ArrowRight, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PortfolioPreview } from "./portfolio-preview"

export function SplashHero({
  onStart,
}: {
  onStart: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <main className="relative z-10 flex flex-1 items-center">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16 lg:py-10">
        <div className="max-w-xl">
          <h1
            className="rise text-[38px] leading-[1.06] font-semibold tracking-tight text-balance text-foreground sm:text-[48px] lg:text-[60px] xl:text-[68px]"
            style={{ animationDelay: "60ms" }}
          >
            Sua banca merece{" "}
            <span className="bg-gradient-to-br from-foreground via-foreground to-brand-bright bg-clip-text text-transparent">
              mais que uma planilha.
            </span>
          </h1>

          <p
            className="rise mt-6 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground sm:text-base"
            style={{ animationDelay: "160ms" }}
          >
            Registre suas apostas, acompanhe seus resultados e transforme seu histórico em
            dados claros para entender seu desempenho.
          </p>

          <div
            className="rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "260ms" }}
          >
            <Button
              onClick={onStart}
              className="h-11 rounded-control px-5 text-sm font-medium shadow-primary hover:bg-brand-bright"
            >
              Começar agora
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-control border-glass-border bg-foreground/[0.03] px-5 text-sm font-medium text-foreground hover:border-foreground/20 hover:bg-foreground/[0.07] hover:text-foreground"
            >
              <PlayCircle className="size-4" aria-hidden="true" />
              Ver demonstração
            </Button>
          </div>

          <p
            className="rise mt-6 text-[11.5px] tracking-[0.04em] text-muted-foreground"
            style={{ animationDelay: "360ms" }}
          >
            Controle • Histórico • ROI • Yield • Gestão de banca
          </p>
        </div>

        <div className="rise-scale" style={{ animationDelay: "340ms" }}>
          <PortfolioPreview />
        </div>
      </div>
    </main>
  )
}
