"use client"

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { WelcomeOverlay } from "@/components/welcome-overlay"
import { BrandMark } from "@/components/landing/brand-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { rippleSweep } from "@/components/ui/kinetic-grid"
import { ApiError, devLogin, login } from "@/lib/api"
import { cn } from "@/lib/utils"
import { markWelcomeSeen } from "@/lib/welcome"

const isDev = process.env.NODE_ENV === "development"

type Phase = "welcome" | "revealing" | "done"

/**
 * A borda esfumaçada vem de uma máscara radial que cresce por mask-size: gradiente
 * animado direto o Chromium interpola de forma discreta, e o recorte pula no meio.
 */
const SOLID_EDGE = 0.82
const MASK = `radial-gradient(circle closest-side, #000 ${SOLID_EDGE * 100}%, transparent 100%)`

export function LoginScreen({ showWelcome = false }: { showWelcome?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<Phase>(showWelcome ? "welcome" : "done")
  const revealRef = useRef<HTMLDivElement>(null)
  const revealAnimation = useRef<Animation | null>(null)

  useEffect(() => {
    if (phase === "done") revealAnimation.current?.cancel()
  }, [phase])

  function handleStart(event: MouseEvent<HTMLButtonElement>) {
    if (phase !== "welcome") return
    markWelcomeSeen()

    const target = revealRef.current
    if (!target) return setPhase("done")

    const { x, y } = { x: event.clientX, y: event.clientY }
    const { reach, duration } = rippleSweep(x, y)

    const radius = reach / SOLID_EDGE
    const animation = target.animate(
      [
        { maskSize: "0px 0px", maskPosition: `${x}px ${y}px` },
        {
          maskSize: `${2 * radius}px ${2 * radius}px`,
          maskPosition: `${x - radius}px ${y - radius}px`,
        },
      ],
      { duration, easing: "linear", fill: "forwards" }
    )
    animation.onfinish = () => setPhase("done")
    revealAnimation.current = animation
    setPhase("revealing")
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.push("/punter")
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "E-mail ou senha inválidos"
          : "Não foi possível entrar. Tente novamente."
      )
      setLoading(false)
    }
  }

  async function handleDevLogin() {
    setError(null)
    setLoading(true)
    try {
      await devLogin()
      router.push("/punter")
    } catch {
      setError("Dev login indisponível (só funciona em ambiente de desenvolvimento).")
      setLoading(false)
    }
  }

  return (
    <>
      {showWelcome && phase !== "done" && <WelcomeOverlay onStart={handleStart} />}

      <div
        ref={revealRef}
        className={cn(showWelcome && "fixed inset-0 z-10 overflow-y-auto")}
        style={
          showWelcome && phase !== "done"
            ? {
                maskImage: MASK,
                maskRepeat: "no-repeat",
                ...(phase === "welcome" ? { maskSize: "0px 0px" } : null),
              }
            : undefined
        }
        inert={phase !== "done"}
      >
        <main className="relative flex min-h-dvh items-center justify-center bg-background p-4 py-20">
          <div className="absolute top-4 right-4">
            <ThemeSwitcher compact />
          </div>

          <div className="relative w-full max-w-[420px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-primary/10 blur-[120px]"
            />

            <section className="rise-scale rounded-2xl border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.45)] sm:p-7">
              <BrandMark className="[&>span:last-child]:text-foreground" />

              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-[10.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
                />
                Acesso à plataforma
              </p>

              <h1 className="mt-4 text-[26px] leading-tight font-semibold tracking-tight sm:text-[30px]">
                Entrar na sua conta
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                Continue de onde parou: banca, histórico de apostas e indicadores de
                desempenho.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px]">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(error)}
                    className="h-11 rounded-xl px-3.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[13px]">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={Boolean(error)}
                      className="h-11 rounded-xl px-3.5 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                {isDev && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-dashed text-sm font-normal"
                    disabled={loading}
                    onClick={handleDevLogin}
                  >
                    Entrar como dev
                  </Button>
                )}
              </form>

              <p className="mt-6 border-t border-border pt-5 text-center text-[13px] text-muted-foreground">
                Não tem conta?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Cadastre-se
                </Link>
              </p>
            </section>

            <p className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Seus dados de banca permanecem privados.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
