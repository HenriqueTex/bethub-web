"use client"

import { MouseEvent } from "react"
import KineticGrid from "@/components/ui/kinetic-grid"
import { SplashHero } from "@/components/landing/splash-hero"
import { SplashNavbar } from "@/components/landing/splash-navbar"

export function WelcomeOverlay({
  onStart,
}: {
  onStart: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="fixed inset-0 z-0 overflow-y-auto">
      <KineticGrid className="dark">
        <div className="flex min-h-dvh flex-col">
          <SplashNavbar onStart={onStart} />
          <SplashHero onStart={onStart} />
        </div>
      </KineticGrid>
    </div>
  )
}
