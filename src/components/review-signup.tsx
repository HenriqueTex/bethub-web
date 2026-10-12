"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { ApiError, decideApproval, getPendingApproval, type PendingApproval } from "@/lib/api"

type State =
  | { kind: "loading" }
  | { kind: "ready"; approval: PendingApproval }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string }

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

/**
 * Página que o admin abre pelo e-mail de novo cadastro. Carregar a página não
 * decide nada; aprovar ou rejeitar exige o clique no botão.
 */
export function ReviewSignup({ token }: { token: string }) {
  const [state, setState] = useState<State>(
    token ? { kind: "loading" } : { kind: "error", message: "Link incompleto." }
  )
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null)

  useEffect(() => {
    if (!token) return
    getPendingApproval(token)
      .then((approval) => setState({ kind: "ready", approval }))
      .catch((err) =>
        setState({ kind: "error", message: messageOf(err, "Não foi possível carregar o cadastro.") })
      )
  }, [token])

  async function decide(decision: "approve" | "reject") {
    setSubmitting(decision)
    try {
      const result = await decideApproval(token, decision)
      setState({
        kind: "done",
        message:
          decision === "approve"
            ? `Cadastro aprovado. Enviamos o link de ativação para ${result.email}.`
            : `Cadastro de ${result.email} rejeitado.`,
      })
    } catch (err) {
      setState({ kind: "error", message: messageOf(err, "Não foi possível registrar a decisão.") })
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <AuthShell title="Revisar cadastro" description="Aprove ou rejeite o pedido de acesso abaixo.">
      <div className="mt-7 space-y-5">
        {state.kind === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Carregando
          </p>
        )}

        {state.kind === "error" && (
          <p role="alert" className="text-sm text-loss">
            {state.message}
          </p>
        )}

        {state.kind === "done" && (
          <p role="status" className="text-sm text-foreground">
            {state.message}
          </p>
        )}

        {state.kind === "ready" && (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-control border border-foreground/[0.08] bg-foreground/[0.03] p-4 text-[13.5px]">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium break-words text-foreground">
                {state.approval.user.fullName ?? "-"}
              </dd>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="font-medium break-all text-foreground">{state.approval.user.email}</dd>
              <dt className="text-muted-foreground">Pedido em</dt>
              <dd className="text-foreground">
                {dateFormat.format(new Date(state.approval.user.createdAt))}
              </dd>
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => decide("approve")}
                disabled={submitting !== null}
              >
                {submitting === "approve" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                Aprovar
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => decide("reject")}
                disabled={submitting !== null}
              >
                {submitting === "reject" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <X className="size-4" aria-hidden="true" />
                )}
                Rejeitar
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  )
}
