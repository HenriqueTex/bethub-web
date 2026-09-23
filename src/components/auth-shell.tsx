import { ReactNode } from "react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import KineticGrid from "@/components/ui/kinetic-grid"

export const authFieldClassName = "h-11 rounded-control px-3.5 text-sm"

export function AuthShell({
  title,
  description,
  children,
  footnote,
}: {
  title: string
  description: string
  children: ReactNode
  footnote?: ReactNode
}) {
  return (
    <KineticGrid>
      <div className="flex min-h-dvh flex-col">
        <header className="relative z-20 w-full">
          <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-end gap-6 px-5 sm:h-20 sm:px-8">
            <ThemeSwitcher compact />
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
          <div className="relative w-full max-w-[420px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-primary/10 blur-[120px]"
            />

            <section className="rise-scale rounded-panel border panel-glass p-6 shadow-panel sm:p-7">
              <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground sm:text-[30px]">
                {title}
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {description}
              </p>
              {children}
            </section>

            {footnote}
          </div>
        </main>
      </div>
    </KineticGrid>
  )
}
