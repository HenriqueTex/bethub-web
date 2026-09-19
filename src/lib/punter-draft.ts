export type PunterFields = {
  bookmakerAccountId: string
  event: string
  selection: string
  marketName: string
  odd: string
  amount: string
  amountMode: "money" | "units"
  sport: string
  competition: string
  tipsterId: string
  eventDate: string
  placedAt: string
  notes: string
}
export type PunterField = keyof PunterFields
export type DraftState = {
  fields: PunterFields
  touched: Partial<Record<PunterField, boolean>>
  imported: Partial<Record<PunterField, { before: string; after: string }>>
}

export type PunterCarryOver = Pick<
  PunterFields,
  "bookmakerAccountId" | "tipsterId" | "placedAt"
>

export const emptyCarryOver: PunterCarryOver = {
  bookmakerAccountId: "",
  tipsterId: "",
  placedAt: ""
}

export function initialPunterDraft(
  carryOver: PunterCarryOver = emptyCarryOver
): DraftState {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return {
    fields: {
      bookmakerAccountId: carryOver.bookmakerAccountId,
      event: "",
      selection: "",
      marketName: "",
      odd: "",
      amount: "1",
      amountMode: "units",
      sport: "",
      competition: "",
      tipsterId: carryOver.tipsterId,
      eventDate: "",
      placedAt: carryOver.placedAt || local.toISOString().slice(0, 16),
      notes: ""
    },
    touched: {},
    imported: {}
  }
}

type DraftAction =
  | { type: "edit"; values: Partial<PunterFields> }
  | { type: "import"; values: Partial<PunterFields> }
  | { type: "undo" }

export function punterDraftReducer(
  state: DraftState,
  action: DraftAction
): DraftState {
  const fields = { ...state.fields }
  const touched = { ...state.touched }
  const imported = { ...state.imported }
  if (action.type === "undo") {
    for (const key of Object.keys(imported) as PunterField[]) {
      const change = imported[key]!
      if (!touched[key] && fields[key] === change.after)
        Object.assign(fields, { [key]: change.before })
    }
    return { fields, touched, imported: {} }
  }
  for (const key of Object.keys(action.values) as PunterField[]) {
    const value = action.values[key]
    if (value === undefined) continue
    if (action.type === "edit") {
      Object.assign(fields, { [key]: value })
      touched[key] = true
      delete imported[key]
      if (key === "amount" || key === "amountMode") {
        touched.amount = true
        touched.amountMode = true
        delete imported.amount
        delete imported.amountMode
      }
    } else if (
      !touched[key] &&
      (!(key === "amount" || key === "amountMode") ||
        (!touched.amount && !touched.amountMode))
    ) {
      if (fields[key] !== value) {
        imported[key] = {
          before: imported[key]?.before ?? fields[key],
          after: value
        }
        Object.assign(fields, { [key]: value })
      }
    }
  }
  return { fields, touched, imported }
}

export function stakeValues(
  amount: string,
  mode: "money" | "units",
  unitValue: number
) {
  const value = Number(amount.replace(",", "."))
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isFinite(unitValue) ||
    unitValue <= 0
  )
    return { stake: 0, units: 0 }
  const stake =
    Math.round((mode === "money" ? value : value * unitValue) * 100) / 100
  return { stake, units: mode === "money" ? stake / unitValue : value }
}
