"use client"

import { FormEvent, useEffect, useState } from "react"
import { toast } from "sonner"
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
import { DecimalInput } from "@/components/decimal-input"
import { Label } from "@/components/ui/label"
import { formatBRL } from "@/lib/format"
import { resources } from "@/lib/resources"

export default function SettingsPage() {
  const [unitValue, setUnitValue] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    resources.settings
      .get()
      .then(({ unitValue: value }) => setUnitValue(String(value)))
      .catch(() => toast.error("Erro ao carregar configurações"))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const { unitValue: saved } = await resources.settings.update(Number(unitValue))
      setUnitValue(String(saved))
      toast.success("Valor da unidade atualizado")
    } catch {
      toast.error("Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card>
        <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Escolha um tema para este dispositivo. O modo Sistema acompanha a preferência do aparelho.</CardDescription></CardHeader>
        <CardContent><ThemeSwitcher /></CardContent>
      </Card>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Valor da unidade</CardTitle>
            <CardDescription>
              Valor em reais de 1 unidade. Novas apostas gravam esse valor no momento do registro
              — apostas antigas não são alteradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="grid max-w-xs gap-2">
              <Label htmlFor="unitValue">1 unidade (R$)</Label>
              <DecimalInput
                id="unitValue"
                step="0.01"
                min="0.01"
                required
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
              />
              {unitValue && (
                <p className="text-sm text-muted-foreground">
                  Ex: uma aposta de 2,5u custará {formatBRL(Number(unitValue) * 2.5)}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
