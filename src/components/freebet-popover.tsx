"use client"

import { useEffect, useState } from "react"
import { Check, Circle, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecimalInput } from "@/components/decimal-input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type FreebetMode = "none" | "is" | "generates"
export type FreebetTriggerValue = "on_loss" | "on_win" | "always"

export interface FreebetState {
  mode: FreebetMode
  value: string
  extraction: string
  trigger: FreebetTriggerValue | ""
}

export const emptyFreebet: FreebetState = {
  mode: "none",
  value: "",
  extraction: "",
  trigger: "",
}

export function freebetExtractedValue(state: FreebetState) {
  if (state.mode !== "generates") return 0
  const value = Number(state.value.replace(",", "."))
  const extraction = Number(state.extraction.replace(",", "."))
  if (!Number.isFinite(value) || value <= 0) return 0
  const rate = Number.isFinite(extraction) ? extraction : 0
  return Math.round(((value * rate) / 100) * 100) / 100
}

const TRIGGERS: { value: FreebetTriggerValue; label: string }[] = [
  { value: "on_loss", label: "Ao Perder" },
  { value: "on_win", label: "Ao Ganhar" },
  { value: "always", label: "Sempre" },
]

interface FreebetPopoverProps {
  namePrefix?: string
  value?: FreebetState
  defaultValue?: FreebetState
  onChange?: (state: FreebetState) => void
  size?: "icon" | "icon-sm"
}

export function FreebetPopover({
  namePrefix = "",
  value: controlledValue,
  defaultValue = emptyFreebet,
  onChange,
  size = "icon",
}: FreebetPopoverProps) {
  const [internal, setInternal] = useState<FreebetState>(defaultValue)
  const state = controlledValue ?? internal

  useEffect(() => {
    if (controlledValue === undefined) onChange?.(internal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internal])

  function update(changes: Partial<FreebetState>) {
    const next = { ...state, ...changes }
    if (controlledValue !== undefined) onChange?.(next)
    else setInternal(next)
  }

  function pickMode(mode: FreebetMode) {
    update({ mode: state.mode === mode ? "none" : mode })
  }

  const active = state.mode !== "none"
  const field = (name: string) => (namePrefix ? `${namePrefix}${name}` : name)

  return (
    <>
      {/* Campos lidos pelo FormData do form (fora do portal do popover) */}
      <input type="hidden" name={field("isFreebet")} value={state.mode === "is" ? "true" : "false"} />
      <input
        type="hidden"
        name={field("generatesFreebet")}
        value={state.mode === "generates" ? "true" : "false"}
      />
      <input type="hidden" name={field("freebetValue")} value={state.value} />
      <input type="hidden" name={field("freebetExtraction")} value={state.extraction} />
      <input type="hidden" name={field("freebetTrigger")} value={state.trigger} />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={size}
            title="Freebet"
            aria-pressed={active}
            className={cn(
              active &&
                "bg-warning/15 text-warning hover:bg-warning/25 hover:text-warning"
            )}
          >
            <Gift className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-3">
          <PopoverHeader className="items-center text-center">
            <PopoverTitle className="flex items-center justify-center gap-2">
              <Gift className="size-4 text-warning" /> Freebet
            </PopoverTitle>
          </PopoverHeader>

          <div className="grid gap-1">
            <button
              type="button"
              onClick={() => pickMode("is")}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
            >
              {state.mode === "is" ? (
                <Check className="size-4 shrink-0 text-warning" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span>Esta aposta é uma Freebet</span>
            </button>
            <button
              type="button"
              onClick={() => pickMode("generates")}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
            >
              {state.mode === "generates" ? (
                <Check className="size-4 shrink-0 text-warning" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span>Esta aposta gera uma Freebet</span>
            </button>
          </div>

          {state.mode === "is" && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              O stake não sai do saldo. Ganhando, o lucro é odd − 1; perdendo, não há perda real
              (SNR).
            </p>
          )}

          {state.mode === "generates" && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`${field("fb")}-value`} className="text-xs">
                    Valor Freebet
                  </Label>
                  <DecimalInput
                    id={`${field("fb")}-value`}
                    step="0.01"
                    min="0"
                    placeholder="R$"
                    value={state.value}
                    onChange={(event) => update({ value: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${field("fb")}-extraction`} className="text-xs">
                    Extração (%)
                  </Label>
                  <DecimalInput
                    id={`${field("fb")}-extraction`}
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="%"
                    value={state.extraction}
                    onChange={(event) => update({ extraction: event.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo de Extração</Label>
                <Select
                  value={state.trigger || undefined}
                  onValueChange={(value) => update({ trigger: value as FreebetTriggerValue })}
                >
                  <SelectTrigger className="!w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {freebetExtractedValue(state) > 0 && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Valor extraível estimado:{" "}
                  <span className="font-medium text-warning">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(freebetExtractedValue(state))}
                  </span>
                </p>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}
