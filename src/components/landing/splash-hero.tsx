"use client"

import { MouseEvent } from "react"
import Link from "next/link"
import { ArrowRight, UserPlus } from "lucide-react"
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
          <p
            className="rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium tracking-[0.12em] text-white/55 uppercase"
            style={{ animationDelay: "60ms" }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_rgba(34,197,94,0.55)]"
            />
            Controle de banca &amp; analytics
          </p>

          <h1
            className="rise mt-6 text-[38px] leading-[1.06] font-semibold tracking-tight text-balance text-white sm:text-[48px] lg:text-[60px] xl:text-[68px]"
            style={{ animationDelay: "140ms" }}
          >
            Sua banca merece{" "}
            <span className="bg-gradient-to-br from-white via-white to-[#4ade80] bg-clip-text text-transparent">
              mais que uma planilha.
            </span>
          </h1>

          <p
            className="rise mt-6 max-w-[34rem] text-[15px] leading-relaxed text-white/60 sm:text-base"
            style={{ animationDelay: "240ms" }}
          >
            Registre suas apostas, acompanhe seus resultados e transforme seu histórico em
            dados claros para entender seu desempenho.
          </p>

          <div
            className="rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "340ms" }}
          >
            <Button
              onClick={onStart}
              className="h-11 rounded-xl px-5 text-sm font-medium shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_16px_40px_-18px_rgba(34,197,94,0.75)] hover:bg-brand-bright"
            >
              Começar agora
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl border-white/12 bg-white/[0.03] px-5 text-sm font-medium text-white hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              <Link href="/register">
                <UserPlus className="size-4" aria-hidden="true" />
                Criar conta
              </Link>
            </Button>
          </div>

          <p
            className="rise mt-6 text-[11.5px] tracking-[0.04em] text-white/40"
            style={{ animationDelay: "440ms" }}
          >
            Controle • Histórico • ROI • Yield • Gestão de banca
          </p>
        </div>

        <div className="rise-scale" style={{ animationDelay: "420ms" }}>
          <PortfolioPreview />
        </div>
      </div>
    </main>
  )
}
