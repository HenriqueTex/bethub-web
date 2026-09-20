"use client"

import { ComponentProps } from "react"
import { Input } from "@/components/ui/input"

/**
 * Teclado brasileiro digita vírgula, e <input type="number"> descarta o caractere
 * em vez de convertê-lo: "2,10" vira "210". Este campo aceita as duas notações e
 * entrega sempre ponto decimal a quem escuta o onChange.
 */
export function DecimalInput({
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      onChange={(event) => {
        const cleaned = event.target.value.replace(",", ".").replace(/[^\d.]/g, "")
        if (cleaned !== event.target.value) event.target.value = cleaned
        onChange?.(event)
      }}
    />
  )
}
