"use client"

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { WelcomeOverlay } from "@/components/welcome-overlay"
import { BrandMark } from "@/components/landing/brand-mark"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import KineticGrid, { rippleSweep } from "@/components/ui/kinetic-grid"
import { ApiError, devLogin, login } from "@/lib/api"
import { cn } from "@/lib/utils"
import { markWelcomeSeen } from "@/lib/welcome"

const isDev = process.env.NODE_ENV === "development"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type FieldErrors = { email?: string; password?: string }

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
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

  function validate() {
    const found: FieldErrors = {}
    if (!email.trim()) found.email = "Informe seu e-mail."
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = "Digite um e-mail válido."
    if (!password) found.password = "Informe sua senha."
    return found
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const found = validate()
    setFieldErrors(found)
    if (Object.keys(found).length > 0) return

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
        <KineticGrid className="dark">
          <div className="flex min-h-dvh flex-col">
            <header className="relative z-20 w-full">
              <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-5 sm:h-20 sm:px-8">
                <BrandMark />
                <ThemeSwitcher compact />
              </div>
            </header>

            <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
              <div className="relative w-full max-w-[420px]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-primary/10 blur-[120px]"
                />

                <section className="rise-scale rounded-[20px] border border-white/10 bg-[rgba(10,12,11,0.70)] p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-7">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium tracking-[0.12em] text-white/55 uppercase">
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_rgba(34,197,94,0.55)]"
                    />
                    Acesso à plataforma
                  </p>

                  <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-tight text-white sm:text-[30px]">
                    Entrar na sua conta
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">
                    Continue de onde parou: banca, histórico de apostas e indicadores de
                    desempenho.
                  </p>

                  <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[13px] text-white/80">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="voce@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.email || error)}
                        aria-describedby={fieldErrors.email ? "email-error" : undefined}
                        disabled={loading}
                        className="h-11 rounded-[17px] border-white/10 bg-white/[0.03] px-3.5 text-sm placeholder:text-white/30"
                      />
                      {fieldErrors.email && (
                        <p id="email-error" role="alert" className="text-[12px] text-loss">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <Label htmlFor="password" className="text-[13px] text-white/80">
                          Senha
                        </Label>
                        <Link
                          href="#"
                          className="text-[12px] text-white/55 underline-offset-4 transition-colors hover:text-brand-bright hover:underline"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>

                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.password || error)}
                          aria-describedby={
                            fieldErrors.password ? "password-error" : undefined
                          }
                          disabled={loading}
                          className="h-11 rounded-[17px] border-white/10 bg-white/[0.03] px-3.5 pr-11 text-sm placeholder:text-white/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          aria-pressed={showPassword}
                          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[17px] text-white/45 transition-colors hover:text-white"
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" aria-hidden="true" />
                          ) : (
                            <Eye className="size-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      {fieldErrors.password && (
                        <p id="password-error" role="alert" className="text-[12px] text-loss">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    <Label
                      htmlFor="remember"
                      className="w-fit gap-2.5 text-[12.5px] font-normal text-white/55"
                    >
                      <Checkbox
                        id="remember"
                        name="remember"
                        disabled={loading}
                        className="border-white/20"
                      />
                      Manter conectado por 30 dias
                    </Label>

                    {error && (
                      <p role="alert" className="text-sm text-loss">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-[17px] text-sm font-medium shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_16px_40px_-20px_rgba(34,197,94,0.8)] hover:bg-brand-bright"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Entrando
                        </>
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </>
                      )}
                    </Button>

                    {isDev && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-[17px] border-dashed border-white/15 bg-white/[0.03] text-sm font-normal text-white hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                        disabled={loading}
                        onClick={handleDevLogin}
                      >
                        Entrar como dev
                      </Button>
                    )}
                  </form>

                  <p className="mt-6 border-t border-white/[0.07] pt-5 text-center text-[13px] text-white/55">
                    Ainda não tem conta?{" "}
                    <Link
                      href="/register"
                      className="font-medium text-brand-bright underline-offset-4 transition-colors hover:underline"
                    >
                      Criar conta
                    </Link>
                  </p>
                </section>

                <p className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-white/40">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Seus dados de banca permanecem privados.
                </p>
              </div>
            </main>
          </div>
        </KineticGrid>
      </div>
    </>
  )
}
