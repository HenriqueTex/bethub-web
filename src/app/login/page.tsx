"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, devLogin, login } from "@/lib/api"

const isDev = process.env.NODE_ENV === "development"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <main className="flex min-h-dvh items-center justify-center bg-background p-4 py-20">
      <div className="absolute right-4 top-4"><ThemeSwitcher compact /></div>
      <Card className="w-full max-w-sm border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle>Entrar no BetHub</CardTitle>
          <CardDescription>Acesse sua conta com e-mail e senha</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="mt-6 flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            {isDev && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                disabled={loading}
                onClick={handleDevLogin}
              >
                Entrar como dev
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link href="/register" className="text-foreground underline underline-offset-4">
                Cadastre-se
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
