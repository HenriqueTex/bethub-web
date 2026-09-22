"use client"

import { MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "./brand-mark"

export function SplashNavbar({
  onStart,
}: {
  onStart: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <header className="relative z-20 w-full">
      <nav
        aria-label="Navegação da tela inicial"
        className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-5 sm:h-20 sm:px-8"
      >
        <BrandMark />

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            onClick={onStart}
            className="hidden h-9 px-3 text-[13.5px] font-normal text-white/60 hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            Entrar
          </Button>
          <Button
            onClick={onStart}
            className="h-9 rounded-[12px] px-4 text-[13.5px] font-medium shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_8px_24px_-12px_rgba(34,197,94,0.6)] hover:bg-brand-bright"
          >
            Começar agora
          </Button>
        </div>
      </nav>
    </header>
  )
}
