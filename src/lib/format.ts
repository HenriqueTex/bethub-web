const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function formatBRL(value: number | null | undefined) {
  return brl.format(value ?? 0)
}

export function formatSigned(value: number | null | undefined) {
  const amount = value ?? 0
  return `${amount > 0 ? "+" : ""}${brl.format(amount)}`
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

export function formatOdd(value: number) {
  return value.toFixed(2).replace(".", ",")
}

export function formatUnits(value: number) {
  return `${Number(value.toFixed(2)).toString().replace(".", ",")}u`
}

export const RESULT_LABELS: Record<string, string> = {
  pending: "Pendente",
  green: "Green",
  red: "Red",
  half_green: "Half Green",
  half_red: "Half Red",
  void: "Void",
  cashout: "Cashout",
}
