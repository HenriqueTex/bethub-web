"use client"

import { ComponentProps, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { carregarJogos, filtrarJogos } from "@/lib/games-cache"
import { cn } from "@/lib/utils"
import type { GameOption } from "@/lib/resources"

interface Props extends Omit<ComponentProps<typeof Input>, "onSelect"> {
  value: string
  onValueChange: (valor: string) => void
  onSelect?: (jogo: GameOption) => void
}

function quando(iso: string) {
  const data = new Date(iso)
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function GameAutocomplete({ value, onValueChange, onSelect, ...props }: Props) {
  const [jogos, setJogos] = useState<GameOption[]>([])
  const [aberto, setAberto] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vivo = true
    carregarJogos()
      .then((lista) => vivo && setJogos(lista))
      .catch(() => {
        // sem agenda o campo segue como texto livre
      })
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    function fora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [])

  const sugestoes = aberto && jogos.length > 0 ? filtrarJogos(jogos, value) : []

  return (
    <div ref={container} className="relative">
      <Input
        {...props}
        value={value}
        autoComplete="off"
        onChange={(evento) => {
          onValueChange(evento.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
      />
      {sugestoes.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full min-w-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {sugestoes.map((jogo) => (
            <li key={jogo.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  onValueChange(jogo.name)
                  onSelect?.(jogo)
                  setAberto(false)
                }}
              >
                <span className="text-sm font-medium">{jogo.name}</span>
                <span className="text-xs text-muted-foreground">
                  {quando(jogo.startsAt)}
                  {jogo.competition ? ` · ${jogo.competition}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
