"use client"

import {
  ChangeEvent,
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import {
  Anchor,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Gavel,
  ImagePlus,
  MinusCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { DecimalInput } from "@/components/decimal-input"
import { GameAutocomplete } from "@/components/game-autocomplete"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  FreebetPopover,
  emptyFreebet,
  freebetExtractedValue,
  type FreebetState,
} from "@/components/freebet-popover"
import { PunterCreateForm } from "@/components/punter-create-form"
import { emptyCarryOver, type PunterCarryOver } from "@/lib/punter-draft"
import { ResultBadge } from "@/components/result-badge"
import { PageHeader } from "@/components/page-header"
import { formatBRL, formatDate, formatOdd, formatSigned, formatPercent, formatUnits, RESULT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  resources,
  Account,
  Bet,
  BetImageAnalysisResult,
  BetResult,
  Market,
  Method,
  Paginated,
  Tipster,
} from "@/lib/resources"

const SETTLE_OPTIONS: BetResult[] = ["green", "half_green", "red", "half_red", "void", "cashout"]

function betToFreebetState(bet: Bet | null): FreebetState {
  if (!bet) return emptyFreebet
  if (bet.isFreebet) return { ...emptyFreebet, mode: "is" }
  if (bet.generatesFreebet) {
    return {
      mode: "generates",
      value: bet.freebetValue != null ? String(bet.freebetValue) : "",
      extraction: bet.freebetExtraction != null ? String(bet.freebetExtraction) : "",
      trigger: bet.freebetTrigger ?? "",
    }
  }
  return emptyFreebet
}

interface Filters {
  bookmakerId: string
  tipsterId: string
  methodId: string
  result: string
  search: string
  from: string
  to: string
}

const EMPTY_FILTERS: Filters = {
  bookmakerId: "",
  tipsterId: "",
  methodId: "",
  result: "",
  search: "",
  from: "",
  to: "",
}

type CreateFormVariant = "dialog" | "punter" | "surebet"

type SurebetLegType = "back" | "lay"

interface SurebetLeg {
  id: number
  accountId: string
  selection: string
  value: string
  type: SurebetLegType
  odd: string
  commission: string
  cashback: string
  boost: string
  freebet: FreebetState
}

interface CalculatedSurebetLeg extends SurebetLeg {
  effectiveOdd: number
  returnFactor: number
  distributionFactor: number
  isFreebetStake: boolean
  manualStake: number
  stake: number
  returnAmount: number
  freebetGenerated: number
  scenarioNet: number
}

interface SurebetLegImageState {
  preview: string | null
  loading: boolean
  status: string | null
  error: string | null
}

interface SurebetDetails {
  event: string
  selection: string
  marketName: string
  sport: string
  competition: string
  eventDate: string
  placedAt: string
}

interface SurebetCalculation {
  valid: boolean
  manualMode: boolean
  investment: number
  inverseSum: number
  guaranteedReturn: number
  guaranteedProfit: number
  guaranteedOdd: number
  roi: number
  legs: CalculatedSurebetLeg[]
}

const MAX_SUREBET_LEGS = 10

function createSurebetLeg(id: number): SurebetLeg {
  return {
    id,
    accountId: "",
    selection: "",
    value: "",
    type: "back",
    odd: "1.00",
    commission: "",
    cashback: "",
    boost: "",
    freebet: emptyFreebet,
  }
}

function toNumber(value: string) {
  const normalized = value.replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function nowDateTimeLocalValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function tamanhoDoValor(texto: string) {
  if (texto.length > 11) return "text-xs"
  if (texto.length > 10) return "text-sm"
  if (texto.length > 9) return "text-base"
  return "text-lg"
}

function calculateEffectiveOdd(
  type: SurebetLegType,
  odd: number,
  commission: number,
  boost: number
) {
  const commissionRate = Math.max(0, Math.min(100, commission)) / 100
  const boostRate = clampPercent(boost) / 100
  let effectiveOdd = 0

  if (odd <= 1) return 0

  if (type === "lay") {
    effectiveOdd = Math.max(0, (odd - commissionRate) / (odd - 1))
  } else {
    effectiveOdd = 1 + (odd - 1) * (1 - commissionRate)
  }

  return 1 + (effectiveOdd - 1) * (1 + boostRate)
}

type PreparedLeg = CalculatedSurebetLeg

function prepareLeg(leg: SurebetLeg): PreparedLeg {
  const odd = toNumber(leg.odd)
  const commission = toNumber(leg.commission)
  const cashbackRate = clampPercent(toNumber(leg.cashback)) / 100
  const effectiveOdd = calculateEffectiveOdd(leg.type, odd, commission, toNumber(leg.boost))
  const returnFactor = effectiveOdd + cashbackRate
  const isFreebetStake = leg.freebet.mode === "is"
  // Freebet SNR: só o excedente (fator - 1) conta como retorno e o stake não entra no investimento.
  const distributionFactor = isFreebetStake ? Math.max(0, returnFactor - 1) : returnFactor
  return {
    ...leg,
    effectiveOdd,
    returnFactor,
    distributionFactor,
    isFreebetStake,
    manualStake: toNumber(leg.value),
    stake: toNumber(leg.value),
    returnAmount: 0,
    freebetGenerated: freebetExtractedValue(leg.freebet),
    scenarioNet: 0,
  }
}

/**
 * Dado o stake de cada perna, calcula investimento real, retorno por cenário
 * (uma perna vence, as demais perdem) considerando as freebets geradas conforme o
 * gatilho, e o lucro garantido (pior cenário).
 */
function finalizeSurebet(
  legs: PreparedLeg[],
  manualMode: boolean,
  inverseSum: number
): SurebetCalculation {
  const resolved = legs.map((leg) => ({
    ...leg,
    stake: roundMoney(leg.stake),
    returnAmount: roundMoney(leg.stake * leg.distributionFactor),
  }))

  const investment = roundMoney(
    resolved.reduce((total, leg) => total + (leg.isFreebetStake ? 0 : leg.stake), 0)
  )

  const legsWithScenario = resolved.map((winLeg) => {
    const freebetBonus = resolved.reduce((total, leg) => {
      if (leg.freebetGenerated <= 0 || leg.freebet.mode !== "generates") return total
      const trigger = leg.freebet.trigger
      const triggered =
        trigger === "always" ||
        (trigger === "on_win" && leg.id === winLeg.id) ||
        (trigger === "on_loss" && leg.id !== winLeg.id)
      return total + (triggered ? leg.freebetGenerated : 0)
    }, 0)
    return {
      ...winLeg,
      scenarioNet: roundMoney(winLeg.returnAmount - investment + freebetBonus),
    }
  })

  const guaranteedProfit = Math.min(...legsWithScenario.map((leg) => leg.scenarioNet))
  const guaranteedReturn = roundMoney(guaranteedProfit + investment)

  return {
    valid: true,
    manualMode,
    investment,
    inverseSum,
    guaranteedReturn,
    guaranteedProfit: roundMoney(guaranteedProfit),
    guaranteedOdd: investment > 0 ? roundMoney(guaranteedReturn / investment) : 0,
    roi: investment > 0 ? roundMoney((guaranteedProfit / investment) * 100) : 0,
    legs: legsWithScenario,
  }
}

function invalidSurebet(
  legs: PreparedLeg[],
  manualMode: boolean,
  investment: number
): SurebetCalculation {
  return {
    valid: false,
    manualMode,
    investment: roundMoney(investment),
    inverseSum: 0,
    guaranteedReturn: 0,
    guaranteedProfit: 0,
    guaranteedOdd: 0,
    roi: 0,
    legs: legs.map((leg) => ({ ...leg, stake: roundMoney(leg.stake) })),
  }
}

function calculateSurebet(
  legs: SurebetLeg[],
  investment: number,
  anchorId: number | null
): SurebetCalculation {
  const prepared = legs.map(prepareLeg)
  const usableFactors = prepared.every((leg) => leg.distributionFactor > 0)
  const inverseSum = usableFactors
    ? prepared.reduce((total, leg) => total + 1 / leg.distributionFactor, 0)
    : 0

  const anchor = prepared.find((leg) => leg.id === anchorId)
  const anchorMode = !!anchor && anchor.manualStake > 0 && anchor.distributionFactor > 0

  if (anchorMode) {
    const anchorReturn = anchor.manualStake * anchor.distributionFactor
    const withStakes = prepared.map((leg) => ({
      ...leg,
      stake:
        leg.id === anchor.id || leg.manualStake > 0
          ? leg.manualStake
          : leg.distributionFactor > 0
            ? anchorReturn / leg.distributionFactor
            : 0,
    }))
    const canCalculate = withStakes.every((leg) => leg.distributionFactor > 0 && leg.stake > 0)
    if (!canCalculate) {
      return invalidSurebet(
        withStakes,
        true,
        withStakes.reduce((total, leg) => total + (leg.isFreebetStake ? 0 : leg.stake), 0)
      )
    }
    return finalizeSurebet(withStakes, true, inverseSum)
  }

  const manualMode = prepared.some((leg) => leg.manualStake > 0)
  const baseInvestment = manualMode
    ? prepared.reduce((total, leg) => total + (leg.isFreebetStake ? 0 : leg.manualStake), 0)
    : investment

  const canCalculate =
    baseInvestment > 0 &&
    prepared.length >= 2 &&
    usableFactors &&
    (!manualMode || prepared.every((leg) => leg.manualStake > 0))

  if (!canCalculate) {
    return invalidSurebet(
      manualMode ? prepared.map((leg) => ({ ...leg, stake: leg.manualStake })) : prepared,
      manualMode,
      baseInvestment
    )
  }

  if (manualMode) {
    return finalizeSurebet(
      prepared.map((leg) => ({ ...leg, stake: leg.manualStake })),
      true,
      inverseSum
    )
  }

  // Distribui o investimento para equalizar o retorno de cada perna.
  const target = baseInvestment / inverseSum
  return finalizeSurebet(
    prepared.map((leg) => ({ ...leg, stake: target / leg.distributionFactor })),
    false,
    inverseSum
  )
}

interface ImageLightboxProps {
  src: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReplace?: () => void
  onRemove?: () => void
}

function ImageLightbox({ src, open, onOpenChange, onReplace, onRemove }: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Imagem da aposta</DialogTitle>
        </DialogHeader>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Imagem da aposta"
            className="max-h-[75vh] w-full rounded-md object-contain"
          />
        )}
        {(onReplace || onRemove) && (
          <div className="flex justify-end gap-2">
            {onReplace && (
              <Button type="button" variant="outline" size="sm" onClick={onReplace}>
                <RefreshCw className="size-4" />
                Trocar
              </Button>
            )}
            {onRemove && (
              <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
                <X className="size-4" />
                Remover
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface SurebetLegImageInputProps {
  legId: number
  legNumber: number
  state?: SurebetLegImageState
  onChange: (legId: number, event: ChangeEvent<HTMLInputElement>) => void
  onClear: (legId: number) => void
}

function SurebetLegImageInput({
  legId,
  legNumber,
  state,
  onChange,
  onClear,
}: SurebetLegImageInputProps) {
  const inputId = `surebet-leg-image-${legId}`
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const preview = state?.preview ?? null
  const loading = state?.loading ?? false
  const status = state?.status ?? null
  const error = state?.error ?? null

  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={inputId} className="text-xs">
        Imagem
      </Label>
      <div className="relative h-16 w-16">
        {preview ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            title="Clique para ampliar"
            className={cn(
              "group flex h-16 w-16 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border bg-muted/30",
              loading && "opacity-70"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Pré-visualização da perna ${legNumber}`}
              className="h-full w-full object-contain"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              <ZoomIn className="size-4 text-white" />
            </span>
          </button>
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/50",
              loading && "opacity-70"
            )}
          >
            <ImagePlus className="size-5" />
          </label>
        )}
        {preview && (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 shadow-sm"
            onClick={() => onClear(legId)}
            aria-label={`Remover imagem da perna ${legNumber}`}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onChange(legId, event)}
      />
      <p
        className={cn(
          "h-4 max-w-20 truncate text-[11px] leading-4",
          error ? "text-loss" : status ? "text-profit" : "text-muted-foreground"
        )}
        title={error ?? status ?? undefined}
      >
        {loading ? "Lendo..." : error ?? status ?? ""}
      </p>
      <ImageLightbox
        src={preview}
        open={lightbox}
        onOpenChange={setLightbox}
        onReplace={() => {
          setLightbox(false)
          inputRef.current?.click()
        }}
        onRemove={() => {
          setLightbox(false)
          onClear(legId)
        }}
      />
    </div>
  )
}

interface BetFormFieldsProps {
  idPrefix: string
  accounts: Account[]
  tipsters: Tipster[]
  methods: Method[]
  markets: Market[]
  lockedMethod?: Method
  editing?: Bet | null
  prefill?: BetImageAnalysisResult | null
  unitValue: number
  units: string
  onUnitsChange: (value: string) => void
  stakePreview: number
  submitLabel: string
  saving: boolean
  className?: string
}

function BetFormFields({
  idPrefix,
  accounts,
  tipsters,
  methods,
  markets,
  lockedMethod,
  editing = null,
  prefill = null,
  unitValue,
  units,
  onUnitsChange,
  stakePreview,
  submitLabel,
  saving,
  className,
}: BetFormFieldsProps) {
  const marketsListId = `${idPrefix}-markets-list`

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div className="grid gap-2 md:col-span-2">
        <Label>Conta</Label>
        <Select
          name="bookmakerAccountId"
          defaultValue={editing ? String(editing.bookmakerAccountId) : undefined}
          required
        >
          <SelectTrigger className="!w-full min-w-0">
            <SelectValue placeholder="Selecione a conta" />
          </SelectTrigger>
          <SelectContent>
            {accounts
              .filter((account) => account.active)
              .map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.bookmaker?.name}
                  {account.label ? ` - ${account.label}` : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-event`}>Evento</Label>
        <Input
          id={`${idPrefix}-event`}
          name="event"
          required
          placeholder="Cruzeiro x Galo"
          defaultValue={editing?.event ?? prefill?.event ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-selection`}>Seleção (aposta)</Label>
        <Input
          id={`${idPrefix}-selection`}
          name="selection"
          required
          placeholder="Cruzeiro ML, Over 2.5..."
          defaultValue={editing?.selection ?? prefill?.selection ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-market`}>Mercado</Label>
        <Input
          id={`${idPrefix}-market`}
          name="marketName"
          list={marketsListId}
          placeholder="Moneyline, Over/Under..."
          defaultValue={editing?.market?.name ?? prefill?.marketName ?? ""}
        />
        <datalist id={marketsListId}>
          {markets.map((market) => (
            <option key={market.id} value={market.name} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-sport`}>Esporte (opcional)</Label>
        <Input
          id={`${idPrefix}-sport`}
          name="sport"
          placeholder="Futebol, NBA, CS2..."
          defaultValue={editing?.sport ?? prefill?.sport ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-competition`}>Competição (opcional)</Label>
        <Input
          id={`${idPrefix}-competition`}
          name="competition"
          placeholder="Brasileirão, NBA..."
          defaultValue={editing?.competition ?? prefill?.competition ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label>Tipster (opcional)</Label>
        <Select
          name="tipsterId"
          defaultValue={editing?.tipsterId ? String(editing.tipsterId) : undefined}
        >
          <SelectTrigger className="!w-full min-w-0">
            <SelectValue placeholder="Aposta própria" />
          </SelectTrigger>
          <SelectContent>
            {tipsters
              .filter((tipster) => tipster.active)
              .map((tipster) => (
                <SelectItem key={tipster.id} value={String(tipster.id)}>
                  {tipster.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {lockedMethod ? (
        <div className="grid gap-2">
          <Label>Método</Label>
          <Input value={lockedMethod.name} disabled />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label>Método (opcional)</Label>
          <Select
            name="methodId"
            defaultValue={editing?.methodId ? String(editing.methodId) : undefined}
          >
            <SelectTrigger className="!w-full min-w-0">
              <SelectValue placeholder="Sem método" />
            </SelectTrigger>
            <SelectContent>
              {methods
                .filter((method) => method.active)
                .map((method) => (
                  <SelectItem key={method.id} value={String(method.id)}>
                    {method.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-odd`}>Odd</Label>
        <DecimalInput
          id={`${idPrefix}-odd`}
          name="odd"
          step="0.001"
          min="1.01"
          required
          defaultValue={editing?.odd ?? prefill?.odd ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-units`}>Unidades</Label>
        <DecimalInput
          id={`${idPrefix}-units`}
          name="units"
          step="0.01"
          min="0.01"
          required
          value={units}
          onChange={(event) => onUnitsChange(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Stake: {formatBRL(stakePreview)} (1u = {formatBRL(editing?.unitValue ?? unitValue)})
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-placedAt`}>Data da aposta (opcional)</Label>
        <Input
          id={`${idPrefix}-placedAt`}
          name="placedAt"
          type="datetime-local"
          defaultValue={
            editing
              ? editing.placedAt.slice(0, 16)
              : toDateTimeLocalValue(prefill?.placedAt) || nowDateTimeLocalValue()
          }
        />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notas (opcional)</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={3}
          defaultValue={editing?.notes ?? prefill?.notes ?? ""}
        />
      </div>
      <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 md:col-span-2">
        <FreebetPopover defaultValue={betToFreebetState(editing)} />
        <span className="text-sm text-muted-foreground">
          Freebet — marque se esta aposta <strong>é</strong> ou <strong>gera</strong> uma freebet.
        </span>
      </div>
      <Button type="submit" className="md:col-span-2" disabled={saving}>
        {saving ? "Salvando..." : submitLabel}
      </Button>
    </div>
  )
}

interface SurebetCreateFormProps {
  accounts: Account[]
  tipsters: Tipster[]
  markets: Market[]
  lockedMethod?: Method
  prefill?: BetImageAnalysisResult | null
  unitValue: number
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function surebetLegsFromAnalysis(analysis: BetImageAnalysisResult | null): SurebetLeg[] {
  const analyzedLegs =
    analysis?.legs
      ?.slice(0, MAX_SUREBET_LEGS)
      .map((leg, index) => ({
        ...createSurebetLeg(index + 1),
        selection: leg.selection ?? "",
        value: leg.stakeAmount ? String(leg.stakeAmount) : "",
        type: leg.type ?? "back",
        odd: leg.odd ? String(leg.odd) : "",
      })) ?? []

  if (analyzedLegs.length === 0 && analysis?.odd) {
    analyzedLegs.push({
      ...createSurebetLeg(1),
      selection: analysis.selection ?? "",
      value: analysis.stakeAmount ? String(analysis.stakeAmount) : "",
      odd: String(analysis.odd),
    })
  }

  while (analyzedLegs.length < 2) {
    analyzedLegs.push(createSurebetLeg(analyzedLegs.length + 1))
  }

  return analyzedLegs
}

function surebetInvestmentFromAnalysis(analysis: BetImageAnalysisResult | null) {
  if (analysis?.stakeAmount && analysis.stakeAmount > 0) return analysis.stakeAmount
  const legsStake =
    analysis?.legs?.reduce((total, leg) => total + (leg.stakeAmount ?? 0), 0) ?? 0
  return legsStake > 0 ? roundMoney(legsStake) : null
}

function surebetDetailsFromAnalysis(analysis: BetImageAnalysisResult | null): SurebetDetails {
  const analyzedMarket = analysis?.legs?.find((leg) => leg.marketName)?.marketName

  return {
    event: analysis?.event ?? "",
    selection: analysis?.selection ?? "",
    marketName: analysis?.marketName ?? analyzedMarket ?? "",
    sport: analysis?.sport ?? "",
    competition: analysis?.competition ?? "",
    eventDate: "",
    placedAt: toDateTimeLocalValue(analysis?.placedAt) || nowDateTimeLocalValue(),
  }
}

function SurebetCreateForm({
  accounts,
  tipsters,
  markets,
  lockedMethod,
  prefill = null,
  unitValue,
  saving,
  onSubmit,
}: SurebetCreateFormProps) {
  const [investment, setInvestment] = useState(() => {
    const analyzedInvestment = surebetInvestmentFromAnalysis(prefill)
    return analyzedInvestment ? String(analyzedInvestment) : "100"
  })
  const [legs, setLegs] = useState<SurebetLeg[]>(() => surebetLegsFromAnalysis(prefill))
  const [anchorLegId, setAnchorLegId] = useState<number | null>(1)
  const [details, setDetails] = useState<SurebetDetails>(() => surebetDetailsFromAnalysis(prefill))
  const [operationNotes, setOperationNotes] = useState(prefill?.notes ?? "")
  const [legImages, setLegImages] = useState<Record<number, SurebetLegImageState>>({})
  const [returnDrafts, setReturnDrafts] = useState<Record<number, string>>({})
  const legImagePreviewsRef = useRef(new Map<number, string>())

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const calculation = useMemo(
    () => calculateSurebet(legs, toNumber(investment), anchorLegId),
    [investment, legs, anchorLegId]
  )

  const totalInvestment = calculation.investment || toNumber(investment)
  const primaryAccountId = legs.find((leg) => leg.accountId)?.accountId ?? ""
  const calculatedUnits = unitValue > 0 ? totalInvestment / unitValue : 0
  const canSubmit =
    calculation.valid &&
    calculation.guaranteedOdd >= 1.01 &&
    totalInvestment > 0 &&
    primaryAccountId !== ""

  useEffect(() => {
    const previews = legImagePreviewsRef.current

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview))
      previews.clear()
    }
  }, [])

  function updateLeg(id: number, changes: Partial<SurebetLeg>) {
    setLegs((current) =>
      current.map((leg) => (leg.id === id ? { ...leg, ...changes } : leg))
    )
  }

  function addLeg() {
    setLegs((current) => {
      if (current.length >= MAX_SUREBET_LEGS) return current
      const nextId = Math.max(...current.map((leg) => leg.id)) + 1
      return [...current, createSurebetLeg(nextId)]
    })
  }

  function removeLeg(id: number) {
    if (legs.length <= 2) return
    clearLegImage(id)
    setLegs((current) => {
      const next = current.filter((leg) => leg.id !== id)
      if (id === anchorLegId) setAnchorLegId(next[0]?.id ?? null)
      return next
    })
  }

  function toggleAnchor(id: number) {
    setAnchorLegId((current) => (current === id ? null : id))
  }

  function setLegImagePreview(id: number, preview: string | null) {
    const currentPreview = legImagePreviewsRef.current.get(id)
    if (currentPreview) URL.revokeObjectURL(currentPreview)

    if (preview) {
      legImagePreviewsRef.current.set(id, preview)
    } else {
      legImagePreviewsRef.current.delete(id)
    }
  }

  function clearLegImage(id: number) {
    setLegImagePreview(id, null)
    setLegImages((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function mergeAnalysisIntoDetails(analysis: BetImageAnalysisResult) {
    const analyzedDetails = surebetDetailsFromAnalysis(analysis)
    setDetails((current) => ({
      event: current.event || analyzedDetails.event,
      selection: current.selection || analyzedDetails.selection,
      marketName: current.marketName || analyzedDetails.marketName,
      sport: current.sport || analyzedDetails.sport,
      competition: current.competition || analyzedDetails.competition,
      eventDate: current.eventDate || analyzedDetails.eventDate,
      placedAt: current.placedAt || analyzedDetails.placedAt,
    }))

    if (analysis.notes) {
      setOperationNotes((current) => current || analysis.notes || "")
    }
  }

  async function handleLegImageChange(id: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setLegImagePreview(id, preview)
    setLegImages((current) => ({
      ...current,
      [id]: { preview, loading: true, status: null, error: null },
    }))

    try {
      const analysis = await resources.bets.analyzeImage(
        file,
        "Imagem de uma perna de surebet. Priorize valor apostado, odd e tipo back/lay desta linha.",
        { mode: "surebet" }
      )

      if (!analysis.isBet) {
        setLegImages((current) => ({
          ...current,
          [id]: {
            preview,
            loading: false,
            status: null,
            error: analysis.notes ?? "Imagem não identificada como aposta",
          },
        }))
        return
      }

      const analyzedLeg =
        analysis.legs.find((leg) => leg.selection || leg.odd || leg.type) ?? null
      const changes: Partial<SurebetLeg> = {}
      const selection = analyzedLeg?.selection ?? analysis.selection
      const odd = analyzedLeg?.odd ?? analysis.odd
      const type = analyzedLeg?.type
      const stakeAmount = analyzedLeg?.stakeAmount ?? analysis.stakeAmount

      if (selection) changes.selection = selection
      if (stakeAmount && stakeAmount > 0) changes.value = String(stakeAmount)
      if (odd && odd > 0) changes.odd = String(odd)
      if (type) changes.type = type

      if (Object.keys(changes).length > 0) {
        updateLeg(id, changes)
        mergeAnalysisIntoDetails(analysis)
        setLegImages((current) => ({
          ...current,
          [id]: { preview, loading: false, status: "Preenchido", error: null },
        }))
        toast.success("Linha preenchida pela imagem")
      } else {
        setLegImages((current) => ({
          ...current,
          [id]: {
            preview,
            loading: false,
            status: null,
            error: "Não encontrei seleção ou odd",
          },
        }))
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível analisar a imagem"
      setLegImages((current) => ({
        ...current,
        [id]: { preview, loading: false, status: null, error: message },
      }))
      toast.error(message)
    } finally {
      event.currentTarget.value = ""
    }
  }

  function accountLabel(accountId: string) {
    const account = activeAccounts.find((item) => item.id === Number(accountId))
    if (!account) return "Conta não selecionada"
    return `${account.bookmaker?.name ?? "Casa"}${account.label ? ` - ${account.label}` : ""}`
  }

  const surebetNotes = [
    "Surebet calculada:",
    `Investimento total: ${formatBRL(totalInvestment)}`,
    `Retorno garantido: ${formatBRL(calculation.guaranteedReturn)}`,
    `Lucro garantido: ${formatSigned(calculation.guaranteedProfit)} (${formatPercent(calculation.roi)})`,
    `Odd garantida: ${calculation.guaranteedOdd || 0}`,
    "Pernas:",
    ...calculation.legs.map((leg, index) => {
      const commission = toNumber(leg.commission)
      const cashback = toNumber(leg.cashback)
      const boost = toNumber(leg.boost)
      return `${index + 1}. ${leg.type === "back" ? "Back" : "Lay"} | ${accountLabel(
        leg.accountId
      )} | ${leg.selection || "Seleção não informada"} | valor ${formatBRL(
        leg.stake
      )} | odd ${leg.odd || "0"}${commission > 0 ? ` | comissão ${commission}%` : ""}${
        cashback > 0 ? ` | cashback ${cashback}%` : ""
      }${boost > 0 ? ` | aumento ${boost}%` : ""}`
    }),
    operationNotes ? `Notas: ${operationNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1000)

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 -top-6 -z-10 h-48 rounded-full bg-primary/10 blur-[90px]"
      />
      <form onSubmit={onSubmit} className="rise-panel rounded-panel border panel-glass p-4 shadow-panel sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Nova surebet</h2>
            <p className="text-sm text-muted-foreground">
              Calcule as pernas e registre a operação no método Surebet.
            </p>
          </div>
          {lockedMethod && <Badge variant="outline">{lockedMethod.name}</Badge>}
        </div>

        <div className="space-y-5">

          <div className="rounded-xl border border-glass-border bg-foreground/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-profit" />
                <h2 className="font-semibold">Calculadora de surebet</h2>
              </div>
              <Badge variant={calculation.inverseSum > 0 && calculation.inverseSum < 1 ? "default" : "outline"}>
                {calculation.inverseSum > 0
                  ? `${formatPercent(roundMoney((1 - calculation.inverseSum) * 100))} margem`
                  : "Informe as odds"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Preencha valor e odd da perna âncora (ícone <Anchor className="inline size-3" />) — ao
              digitar a odd das outras pernas, o valor delas é calculado automaticamente para
              equalizar o retorno. Edite qualquer valor para travá-lo; limpe o campo para voltar ao
              automático.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[4fr_2fr_2fr_1fr_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="surebet-event">Evento</Label>
                <GameAutocomplete
                  id="surebet-event"
                  name="event"
                  required
                  placeholder="Cruzeiro x Galo"
                  value={details.event}
                  onValueChange={(valor) =>
                    setDetails((current) => ({ ...current, event: valor }))
                  }
                  onSelect={(jogo) =>
                    setDetails((current) => ({
                      ...current,
                      eventDate: toDateTimeLocalValue(jogo.startsAt),
                    }))
                  }
                />
                <input type="hidden" name="eventDate" value={details.eventDate} />
              </div>
              <div className="grid gap-2">
                <Label>Tipster</Label>
                <Select name="tipsterId">
                  <SelectTrigger className="!w-full min-w-0">
                    <SelectValue placeholder="Aposta própria" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipsters
                      .filter((tipster) => tipster.active)
                      .map((tipster) => (
                        <SelectItem key={tipster.id} value={String(tipster.id)}>
                          {tipster.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="surebet-investment">Investimento total</Label>
                <DecimalInput
                  id="surebet-investment"
                  step="0.01"
                  min="0"
                  value={
                    calculation.manualMode
                      ? String(roundMoney(calculation.investment))
                      : investment
                  }
                  onChange={(event) => {
                    setInvestment(event.target.value)
                    if (calculation.manualMode) {
                      setLegs((current) => current.map((leg) => ({ ...leg, value: "" })))
                      setReturnDrafts({})
                    }
                  }}
                  className={cn(calculation.manualMode && "text-muted-foreground")}
                />
              </div>
              <div className="grid gap-2">
                <Label>Lucro</Label>
                <p
                  className={cn(
                    "numeric flex h-9 items-center whitespace-nowrap font-semibold",
                    tamanhoDoValor(formatSigned(calculation.guaranteedProfit)),
                    calculation.guaranteedProfit >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {formatSigned(calculation.guaranteedProfit)}
                </p>
              </div>
              <div className="grid gap-2">
                <Label>ROI</Label>
                <p
                  className={cn(
                    "numeric flex h-9 items-center whitespace-nowrap font-semibold",
                    tamanhoDoValor(formatPercent(calculation.roi))
                  )}
                >
                  {formatPercent(calculation.roi)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Retorno garantido{" "}
                <strong className="text-foreground">{formatBRL(calculation.guaranteedReturn)}</strong>
              </span>
              <span>
                Odd garantida{" "}
                <strong className="text-foreground">{formatOdd(calculation.guaranteedOdd || 0)}</strong>
              </span>
            </div>

            <div className="mt-4 divide-y">
              {legs.map((leg, index) => {
                const calculatedLeg = calculation.legs.find((item) => item.id === leg.id)
                return (
                  <div key={leg.id} className="py-4 first:pt-2">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Perna {index + 1}</Badge>
                        {leg.freebet.mode === "is" && (
                          <Badge className="border-transparent bg-amber-500/15 text-warning">
                            Freebet
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <FreebetPopover
                          size="icon-sm"
                          namePrefix={`leg${leg.id}-`}
                          value={leg.freebet}
                          onChange={(freebet) => updateLeg(leg.id, { freebet })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleAnchor(leg.id)}
                          aria-pressed={anchorLegId === leg.id}
                          title={
                            anchorLegId === leg.id
                              ? "Perna âncora — as demais são calculadas a partir dela (clique para desativar)"
                              : "Definir como perna âncora"
                          }
                          className={cn(
                            anchorLegId === leg.id &&
                              "bg-emerald-500/10 text-profit hover:bg-emerald-500/20 hover:text-profit"
                          )}
                        >
                          <Anchor className="size-4" />
                        </Button>
                        {legs.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeLeg(leg.id)}
                            aria-label={`Remover perna ${index + 1}`}
                          >
                            <MinusCircle className="size-4 text-loss" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row">
                      <SurebetLegImageInput
                        legId={leg.id}
                        legNumber={index + 1}
                        state={legImages[leg.id]}
                        onChange={handleLegImageChange}
                        onClear={clearLegImage}
                      />
                      <div className="grid min-w-0 flex-1 content-start gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid min-w-0 gap-2">
                            <Label>Conta</Label>
                            <Select
                              value={leg.accountId}
                              onValueChange={(value) =>
                                updateLeg(leg.id, { accountId: String(value) })
                              }
                              required={index === 0}
                            >
                              <SelectTrigger className="!w-full min-w-0">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeAccounts.map((account) => (
                                  <SelectItem key={account.id} value={String(account.id)}>
                                    {account.bookmaker?.name}
                                    {account.label ? ` - ${account.label}` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid min-w-0 gap-2">
                            <Label htmlFor={`surebet-leg-selection-${leg.id}`}>Seleção</Label>
                            <Input
                              id={`surebet-leg-selection-${leg.id}`}
                              value={leg.selection}
                              onChange={(event) =>
                                updateLeg(leg.id, { selection: event.target.value })
                              }
                              placeholder="Time A ML, Over 2.5..."
                            />
                          </div>
                        </div>
                        <div className="surebet-fields">
                          <div className="grid gap-2">
                        <Label htmlFor={`surebet-leg-value-${leg.id}`}>
                          {leg.type === "lay" ? "Responsabilidade" : "Valor"}
                        </Label>
                        <DecimalInput
                          id={`surebet-leg-value-${leg.id}`}
                          step="0.01"
                          min="0"
                          value={
                            leg.value !== ""
                              ? leg.value
                              : calculatedLeg?.stake
                                ? String(calculatedLeg.stake)
                                : ""
                          }
                          onChange={(event) => {
                            setReturnDrafts((current) => {
                              const proximo = { ...current }
                              delete proximo[leg.id]
                              return proximo
                            })
                            updateLeg(leg.id, { value: event.target.value })
                          }}
                          placeholder="0,00"
                          className={cn(
                            leg.value === "" && calculatedLeg?.stake ? "text-muted-foreground" : ""
                          )}
                        />
                      </div>
                      {leg.type === "lay" && (
                        <div className="grid gap-2">
                          <Label htmlFor={`surebet-leg-return-${leg.id}`}>Retorno</Label>
                          <DecimalInput
                            id={`surebet-leg-return-${leg.id}`}
                            step="0.01"
                            min="0"
                            value={
                              returnDrafts[leg.id] ??
                              (calculatedLeg?.stake && calculatedLeg.distributionFactor
                                ? String(
                                    roundMoney(
                                      calculatedLeg.stake * calculatedLeg.distributionFactor
                                    )
                                  )
                                : "")
                            }
                            onChange={(event) => {
                              const digitado = event.target.value
                              const fator = calculatedLeg?.distributionFactor ?? 0
                              setReturnDrafts((current) => ({ ...current, [leg.id]: digitado }))
                              updateLeg(leg.id, {
                                value:
                                  digitado === "" || fator <= 0
                                    ? ""
                                    : String(roundMoney(toNumber(digitado) / fator)),
                              })
                            }}
                            placeholder="0,00"
                            className={cn(
                              leg.value === "" && calculatedLeg?.stake ? "text-muted-foreground" : ""
                            )}
                          />
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor={`surebet-leg-odd-${leg.id}`}>ODD</Label>
                        <DecimalInput
                          id={`surebet-leg-odd-${leg.id}`}
                          step="0.001"
                          min="1.01"
                          value={leg.odd}
                          onChange={(event) => updateLeg(leg.id, { odd: event.target.value })}
                        />
                        {leg.type === "lay" && !!calculatedLeg?.effectiveOdd && (
                          <p className="text-[11px] text-muted-foreground">
                            {formatOdd(calculatedLeg.effectiveOdd)} back
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label>Back/Lay</Label>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-9 justify-center font-semibold",
                            leg.type === "back"
                              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                              : "border-rose-500/40 bg-rose-500/10 text-loss hover:bg-rose-500/20 dark:text-loss"
                          )}
                          onClick={() =>
                            updateLeg(leg.id, { type: leg.type === "back" ? "lay" : "back" })
                          }
                          aria-pressed={leg.type === "lay"}
                        >
                          {leg.type === "back" ? "Back" : "Lay"}
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`surebet-leg-commission-${leg.id}`}>Comissão (%)</Label>
                        <DecimalInput
                          id={`surebet-leg-commission-${leg.id}`}
                          step="0.01"
                          min="0"
                          max="100"
                          value={leg.commission}
                          onChange={(event) =>
                            updateLeg(leg.id, { commission: event.target.value })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`surebet-leg-cashback-${leg.id}`}>Cashback (%)</Label>
                        <DecimalInput
                          id={`surebet-leg-cashback-${leg.id}`}
                          step="0.01"
                          min="0"
                          max="100"
                          value={leg.cashback}
                          onChange={(event) =>
                            updateLeg(leg.id, { cashback: event.target.value })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`surebet-leg-boost-${leg.id}`}>Boost (%)</Label>
                        <DecimalInput
                          id={`surebet-leg-boost-${leg.id}`}
                          step="0.01"
                          min="0"
                          max="100"
                          value={leg.boost}
                          onChange={(event) => updateLeg(leg.id, { boost: event.target.value })}
                          placeholder="0"
                        />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm text-muted-foreground">
                        Stake {formatBRL(calculatedLeg?.stake)}
                      </span>
                      {!!calculatedLeg?.returnAmount && (
                        <span className="text-sm text-muted-foreground">
                          · Retorno {formatBRL(calculatedLeg.returnAmount)}
                        </span>
                      )}
                      {!!calculatedLeg?.freebetGenerated && (
                        <span className="text-sm text-warning">
                          · Gera freebet {formatBRL(calculatedLeg.freebetGenerated)}
                        </span>
                      )}
                      {!!calculatedLeg && calculation.valid && (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            calculatedLeg.scenarioNet >= 0 ? "text-profit" : "text-loss"
                          )}
                        >
                          · Se vencer: {formatSigned(calculatedLeg.scenarioNet)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {legs.length < MAX_SUREBET_LEGS && (
                <div className="pt-4">
                  <Button type="button" variant="outline" onClick={addLeg}>
                    <Plus className="size-4" />
                    Adicionar perna ({legs.length}/{MAX_SUREBET_LEGS})
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <details className="rounded-xl border border-glass-border p-3 md:col-span-2">
              <summary className="text-sm font-medium">Mais detalhes</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="surebet-selection">Resumo da operação</Label>
              <Input
                id="surebet-selection"
                name="selection"
                required
                placeholder="Surebet ML, dupla chance..."
                value={details.selection}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, selection: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surebet-market">Mercado</Label>
              <Input
                id="surebet-market"
                name="marketName"
                list="surebet-markets-list"
                placeholder="Moneyline, Over/Under..."
                value={details.marketName}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, marketName: event.target.value }))
                }
              />
              <datalist id="surebet-markets-list">
                {markets.map((market) => (
                  <option key={market.id} value={market.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surebet-sport">Esporte (opcional)</Label>
              <Input
                id="surebet-sport"
                name="sport"
                placeholder="Futebol, NBA, CS2..."
                value={details.sport}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, sport: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surebet-competition">Competição (opcional)</Label>
              <Input
                id="surebet-competition"
                name="competition"
                placeholder="Brasileirão, NBA..."
                value={details.competition}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, competition: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surebet-placedAt">Data da aposta (opcional)</Label>
              <Input
                id="surebet-placedAt"
                name="placedAt"
                type="datetime-local"
                value={details.placedAt}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, placedAt: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="surebet-operation-notes">Notas adicionais (opcional)</Label>
              <Textarea
                id="surebet-operation-notes"
                value={operationNotes}
                onChange={(event) => setOperationNotes(event.target.value)}
                placeholder="Contexto, monitor, limite de casa, observações..."
              />
            </div>
              </div>
            </details>
          </div>

          <input type="hidden" name="bookmakerAccountId" value={primaryAccountId} />
          <input type="hidden" name="odd" value={calculation.guaranteedOdd || ""} />
          <input type="hidden" name="units" value={calculatedUnits || ""} />
          <input type="hidden" name="stakeAmount" value={totalInvestment || ""} />
          <input type="hidden" name="notes" value={surebetNotes} />

          <Button type="submit" size="lg" className="w-full" disabled={saving || !canSubmit}>
            {saving ? "Salvando..." : "Registrar surebet"}
          </Button>
        </div>
      </form>
    </div>
  )
}

interface BetsViewProps {
  lockedMethod?: Method
  title?: string
  featuredCreateForm?: boolean
  createFormVariant?: CreateFormVariant
  /** Renderizado entre o formulário e a lista, para o resumo não empurrar o formulário. */
  statsSlot?: ReactNode
  onDataChanged?: () => void
}

const RESULT_DOT: Record<Bet["result"], string> = {
  pending: "border-warning/25 bg-warning/10 [&>span]:bg-warning",
  green: "border-profit/25 bg-profit/10 [&>span]:bg-profit",
  half_green: "border-profit/25 bg-profit/10 [&>span]:bg-profit/60",
  red: "border-loss/25 bg-loss/10 [&>span]:bg-loss",
  half_red: "border-loss/25 bg-loss/10 [&>span]:bg-loss/60",
  void: "border-glass-border [&>span]:bg-muted-foreground/60",
  cashout: "border-glass-border [&>span]:bg-foreground/60",
}

export default function BetsView({
  lockedMethod,
  title = "Apostas",
  featuredCreateForm = false,
  createFormVariant = "dialog",
  statsSlot,
  onDataChanged,
}: BetsViewProps) {
  const [bets, setBets] = useState<Paginated<Bet> | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tipsters, setTipsters] = useState<Tipster[]>([])
  const [methods, setMethods] = useState<Method[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [unitValue, setUnitValue] = useState(10)
  const [catalogsReady, setCatalogsReady] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bet | null>(null)
  const [cashoutBet, setCashoutBet] = useState<Bet | null>(null)
  const [saving, setSaving] = useState(false)
  const [createFormKey, setCreateFormKey] = useState(0)
  const [carryOver, setCarryOver] = useState<PunterCarryOver>(emptyCarryOver)
  const [createUnits, setCreateUnits] = useState("1")
  const [editUnits, setEditUnits] = useState("1")
  const resolvedCreateFormVariant =
    createFormVariant === "dialog" && featuredCreateForm ? "punter" : createFormVariant
  const inlineCreateForm = resolvedCreateFormVariant !== "dialog"

  const bookmakers = useMemo(() => {
    const map = new Map<number, string>()
    for (const account of accounts) {
      if (account.bookmaker) map.set(account.bookmaker.id, account.bookmaker.name)
    }
    return [...map.entries()]
  }, [accounts])

  const betListFilters = useMemo(
    () => ({
      page,
      perPage: 15,
      bookmakerId: filters.bookmakerId || undefined,
      tipsterId: filters.tipsterId || undefined,
      methodId: lockedMethod?.id ?? (filters.methodId || undefined),
      result: filters.result || undefined,
      search: filters.search || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [filters, lockedMethod?.id, page]
  )

  const reloadBets = useCallback(async () => {
    const data = await resources.bets.list(betListFilters)
    setBets(data)
  }, [betListFilters])

  useEffect(() => {
    let active = true

    resources.bets
      .list(betListFilters)
      .then((data) => {
        if (active) setBets(data)
      })
      .catch(() => toast.error("Erro ao carregar apostas"))

    return () => {
      active = false
    }
  }, [betListFilters])

  useEffect(() => {
    Promise.all([
      resources.accounts.list(),
      resources.tipsters.list(),
      resources.methods.list(),
      resources.markets.list(),
      resources.settings.get(),
    ])
      .then(([accountsData, tipstersData, methodsData, marketsData, settings]) => {
        setAccounts(accountsData)
        setTipsters(tipstersData)
        setMethods(methodsData)
        setMarkets(marketsData)
        setUnitValue(settings.unitValue)
        setCatalogsReady(true)
      })
      .catch(() => toast.error("Erro ao carregar cadastros"))
  }, [])

  function updateFilter(key: keyof Filters, value: string) {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value === "all" ? "" : value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, receipt?: File | null) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const get = (key: string) => String(form.get(key) || "")

    const payload: Record<string, unknown> = {
      bookmakerAccountId: Number(get("bookmakerAccountId")),
      event: get("event"),
      selection: get("selection"),
      odd: Number(get("odd")),
      units: Number(get("units")),
      tipsterId: get("tipsterId") ? Number(get("tipsterId")) : null,
      methodId: lockedMethod?.id ?? (get("methodId") ? Number(get("methodId")) : null),
      sport: get("sport") || null,
      competition: get("competition") || null,
      notes: get("notes") || null,
    }
    const marketName = get("marketName")
    if (marketName) payload.marketName = marketName
    if (get("stakeAmount")) payload.stakeAmount = Number(get("stakeAmount"))
    if (get("placedAt")) payload.placedAt = new Date(get("placedAt")).toISOString()
    if (get("eventDate")) payload.eventDate = new Date(get("eventDate")).toISOString()
    payload.notificationsEnabled = get("notificationsEnabled") !== "false"

    const generatesFreebet = get("generatesFreebet") === "true"
    payload.isFreebet = get("isFreebet") === "true"
    payload.generatesFreebet = generatesFreebet
    if (generatesFreebet) {
      payload.freebetValue = get("freebetValue") ? Number(get("freebetValue")) : null
      payload.freebetExtraction = get("freebetExtraction")
        ? Number(get("freebetExtraction"))
        : null
      payload.freebetTrigger = get("freebetTrigger") || null
    }

    setSaving(true)
    try {
      if (editing) {
        await resources.bets.update(editing.id, payload)
        toast.success("Aposta atualizada")
        setFormOpen(false)
        setEditing(null)
        setEditUnits("1")
      } else {
        if (receipt) {
          try {
            const { receiptKey } = await resources.bets.uploadReceipt(receipt)
            payload.receiptKey = receiptKey
          } catch {
            // o comprovante é acessório: perder o upload não pode custar a aposta
            toast.warning("Aposta salva, mas não foi possível guardar o comprovante")
          }
        }
        await resources.bets.create(payload)
        toast.success("Aposta registrada")
        setCreateUnits("1")
        setCarryOver({
          bookmakerAccountId: get("bookmakerAccountId"),
          tipsterId: get("tipsterId"),
          placedAt: get("placedAt")
        })
        if (inlineCreateForm) {
          setCreateFormKey((current) => current + 1)
        } else {
          setFormOpen(false)
        }
      }
      await reloadBets()
      onDataChanged?.()
      resources.markets.list().then(setMarkets)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a aposta")
    } finally {
      setSaving(false)
    }
  }

  async function settle(bet: Bet, result: BetResult, cashoutAmount?: number) {
    try {
      await resources.bets.settle(bet.id, result, cashoutAmount)
      toast.success(
        result === "pending" ? "Aposta reaberta" : `Aposta liquidada: ${RESULT_LABELS[result]}`
      )
      await reloadBets()
      onDataChanged?.()
    } catch {
      toast.error("Não foi possível liquidar")
    }
  }

  async function handleCashout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cashoutBet) return
    const form = new FormData(event.currentTarget)
    await settle(cashoutBet, "cashout", Number(form.get("cashoutAmount")))
    setCashoutBet(null)
  }

  async function handleDelete(bet: Bet) {
    if (!confirm(`Excluir a aposta "${bet.selection}"?`)) return
    try {
      await resources.bets.remove(bet.id)
      toast.success("Aposta excluída")
      await reloadBets()
      onDataChanged?.()
    } catch {
      toast.error("Não foi possível excluir")
    }
  }

  function openEdit(bet: Bet) {
    setEditing(bet)
    setEditUnits(String(bet.units))
    setFormOpen(true)
  }

  const createStakePreview = Number(createUnits || 0) * unitValue
  const editStakePreview = editing && Number(editUnits) === editing.units
    ? editing.stakeAmount
    : Number(editUnits || 0) * (editing?.unitValue ?? unitValue)

  const profitTone = (bet: Bet) =>
    bet.profitAmount === null || bet.profitAmount === 0
      ? "text-muted-foreground"
      : bet.profitAmount > 0
        ? "text-profit"
        : "text-loss"

  const renderBetActions = (bet: Bet) => (
    <div className="flex justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={bet.result === "pending" ? "outline" : "ghost"}
            size="icon-sm"
            title="Liquidar"
            aria-label={`Liquidar ${bet.selection}`}
          >
            <Gavel className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Liquidar como</DropdownMenuLabel>
          {SETTLE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() =>
                option === "cashout" ? setCashoutBet(bet) : settle(bet, option)
              }
            >
              {RESULT_LABELS[option]}
            </DropdownMenuItem>
          ))}
          {bet.result !== "pending" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => settle(bet, "pending")}>
                Reabrir (pendente)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Editar"
        aria-label={`Editar ${bet.selection}`}
        onClick={() => openEdit(bet)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Excluir"
        aria-label={`Excluir ${bet.selection}`}
        onClick={() => handleDelete(bet)}
      >
        <Trash2 className="size-4 text-loss" />
      </Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {inlineCreateForm && resolvedCreateFormVariant === "surebet" ? (
        <SurebetCreateForm
          key={createFormKey}
          accounts={accounts}
          tipsters={tipsters}
          markets={markets}
          lockedMethod={lockedMethod}
          unitValue={unitValue}
          saving={saving}
          onSubmit={handleSubmit}
        />
      ) : inlineCreateForm ? (
        <PunterCreateForm
          key={createFormKey}
          accounts={accounts}
          tipsters={tipsters}
          markets={markets}
          unitValue={unitValue}
          ready={catalogsReady}
          saving={saving}
          carryOver={carryOver}
          onSubmit={handleSubmit}
        />
      ) : (
        <PageHeader
          title={title}
          actions={
            <Button
              onClick={() => {
                setEditing(null)
                setCreateUnits("1")
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" /> Nova aposta
            </Button>
          }
        />
      )}

      {statsSlot}
      {inlineCreateForm && (
        <h2 className="pt-2 text-lg font-semibold tracking-tight">Apostas registradas</h2>
      )}

      <div className="bet-filters flex flex-wrap items-end gap-3 rounded-panel border bg-card p-4 shadow-panel">
        <Input
          placeholder="Buscar evento, seleção..."
          className="w-52"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
        <Select
          value={filters.bookmakerId || "all"}
          onValueChange={(value) => updateFilter("bookmakerId", String(value))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Casa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as casas</SelectItem>
            {bookmakers.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.tipsterId || "all"}
          onValueChange={(value) => updateFilter("tipsterId", String(value))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipsters</SelectItem>
            {tipsters.map((tipster) => (
              <SelectItem key={tipster.id} value={String(tipster.id)}>
                {tipster.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!lockedMethod && (
          <Select
            value={filters.methodId || "all"}
            onValueChange={(value) => updateFilter("methodId", String(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os métodos</SelectItem>
              {methods.map((method) => (
                <SelectItem key={method.id} value={String(method.id)}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.result || "all"}
          onValueChange={(value) => updateFilter("result", String(value))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(RESULT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="bet-filter-dates">
          <Input
            type="date"
            aria-label="Data inicial"
            className="w-36"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label="Data final"
            className="w-36"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
          />
        </div>
        {Object.values(filters).some(Boolean) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-panel border bg-card shadow-panel">
        <ul aria-label="Apostas" className="divide-y divide-foreground/[0.07] md:hidden">
          {!bets ? (
            <li className="p-4 text-center text-sm text-muted-foreground">Carregando...</li>
          ) : bets.data.length === 0 ? (
            <li className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma aposta encontrada
            </li>
          ) : (
            bets.data.map((bet) => (
              <li key={bet.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                      RESULT_DOT[bet.result]
                    )}
                  >
                    <span className="size-1.5 rounded-full" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{bet.selection}</p>
                    <p className="truncate text-xs text-muted-foreground">{bet.event}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatDate(bet.placedAt)} · {bet.account?.bookmaker?.name ?? "—"} ·{" "}
                      {formatUnits(bet.units)} ({formatBRL(bet.stakeAmount)})
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="chip-numeric text-xs">{formatOdd(bet.odd)}</span>
                    <span className={cn("numeric text-sm font-medium", profitTone(bet))}>
                      {bet.profitAmount === null ? "—" : formatSigned(bet.profitAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-10">
                  <ResultBadge result={bet.result} />
                  {renderBetActions(bet)}
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Evento / Seleção</TableHead>
                <TableHead>Mercado</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>Tipster</TableHead>
                <TableHead className="text-right">Odd</TableHead>
                <TableHead className="text-right">Stake</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!bets ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : bets.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhuma aposta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                bets.data.map((bet) => (
                  <TableRow key={bet.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(bet.placedAt)}
                    </TableCell>
                    <TableCell className="max-w-52">
                      <p className="truncate font-medium">{bet.selection}</p>
                      <p className="truncate text-xs text-muted-foreground">{bet.event}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bet.market?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bet.account?.bookmaker?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bet.tipster?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="chip-numeric">{formatOdd(bet.odd)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <p>{formatUnits(bet.units)}</p>
                      <p className="text-xs text-muted-foreground">{formatBRL(bet.stakeAmount)}</p>
                    </TableCell>
                    <TableCell>
                      <ResultBadge result={bet.result} />
                    </TableCell>
                    <TableCell
                      className={cn("text-right font-medium", profitTone(bet))}
                    >
                      {bet.profitAmount === null ? "—" : formatSigned(bet.profitAmount)}
                    </TableCell>
                    <TableCell>
                      {renderBetActions(bet)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {bets && bets.meta.lastPage > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Página {bets.meta.currentPage} de {bets.meta.lastPage} ({bets.meta.total} apostas)
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            title="Página anterior"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            title="Próxima página"
            aria-label="Próxima página"
            disabled={page >= bets.meta.lastPage}
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value)
          if (!value) {
            setEditing(null)
            setCreateUnits("1")
            setEditUnits("1")
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar aposta" : "Nova aposta"}</DialogTitle>
          </DialogHeader>
          <form key={editing?.id ?? "new-bet-dialog"} onSubmit={handleSubmit}>
            <BetFormFields
              idPrefix="dialog-bet"
              accounts={accounts}
              tipsters={tipsters}
              methods={methods}
              markets={markets}
              lockedMethod={lockedMethod}
              editing={editing}
              unitValue={unitValue}
              units={editing ? editUnits : createUnits}
              onUnitsChange={editing ? setEditUnits : setCreateUnits}
              stakePreview={editing ? editStakePreview : createStakePreview}
              submitLabel={editing ? "Salvar alterações" : "Registrar aposta"}
              saving={saving}
            />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cashoutBet} onOpenChange={(value) => !value && setCashoutBet(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cashout</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCashout} className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Stake de {formatBRL(cashoutBet?.stakeAmount)} — informe o valor recebido no cashout.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="cashoutAmount">Valor recebido (R$)</Label>
              <DecimalInput
                id="cashoutAmount"
                name="cashoutAmount"
                step="0.01"
                min="0"
                required
                autoFocus
              />
            </div>
            <Button type="submit">Confirmar cashout</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
