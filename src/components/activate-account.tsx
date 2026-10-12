"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { ApiError, activateAccount } from "@/lib/api"

const linkClassName =
  "font-medium text-primary underline-offset-4 transition-colors hover:underline dark:text-brand-bright"

/**
 * A ativação pede um clique em vez de rodar ao abrir a página: alguns filtros
 * de e-mail abrem os links antes da pessoa e queimariam o token de uso único.
 */
export function ActivateAccount({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    token ? null : "Link de ativação incompleto. Abra o link exatamente como veio no e-mail."
  )

  async function handleActivate() {
    setError(null)
    setLoading(true)
    try {
      await activateAccount(token)
      router.push("/punter")
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível ativar a conta. Tente novamente."
      )
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Ativar conta"
      description="Seu cadastro foi aprovado. Confirme para ativar a conta e entrar."
    >
      <div className="mt-7 space-y-4">
        {error && (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        )}

        {token && (
          <Button size="lg" className="w-full" onClick={handleActivate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Ativando
              </>
            ) : (
              <>
                Ativar minha conta
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        )}
      </div>

      <p className="mt-6 border-t border-foreground/[0.07] pt-5 text-center text-[13px] text-muted-foreground">
        Já ativou ou o link expirou?{" "}
        <Link href="/login" className={linkClassName}>
          Entrar
        </Link>{" "}
        (no login dá para pedir um link novo).
      </p>
    </AuthShell>
  )
}
