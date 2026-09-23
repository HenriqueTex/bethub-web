"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { AuthShell, authFieldClassName } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, register } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(fullName, email, password)
      router.push("/punter")
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar a conta. Tente novamente."
      )
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Criar conta" description="Cadastre-se para acessar o BetHub">
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-[13px] text-foreground/80">
            Nome completo
          </Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Seu nome"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className={authFieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] text-foreground/80">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={authFieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] text-foreground/80">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className={authFieldClassName}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Criando conta
            </>
          ) : (
            <>
              Criar conta
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 border-t border-foreground/[0.07] pt-5 text-center text-[13px] text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 transition-colors hover:underline dark:text-brand-bright"
        >
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
