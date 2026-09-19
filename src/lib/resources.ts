import { apiFetch, apiUpload } from "@/lib/api"

export interface Paginated<T> {
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
  data: T[]
}

export interface AccountBalance {
  deposits: number
  withdrawals: number
  profit: number
  extractedFreebets: number
  pendingFreebets: number
  balance: number
}

export interface Bookmaker {
  id: number
  name: string
  website: string | null
  notes: string | null
  active: boolean
  accounts?: Account[]
  totalBalance?: number
}

export interface Account {
  id: number
  bookmakerId: number
  label: string | null
  notes: string | null
  active: boolean
  bookmaker?: Bookmaker
  balance?: AccountBalance
}

export interface Transaction {
  id: number
  bookmakerAccountId: number
  type: "deposit" | "withdrawal"
  amount: number
  occurredAt: string
  notes: string | null
}

export interface Tipster {
  id: number
  name: string
  channel: string | null
  notes: string | null
  active: boolean
}

export interface Method {
  id: number
  name: string
  description: string | null
  active: boolean
}

export interface Market {
  id: number
  name: string
}

export const BET_RESULTS = [
  "pending",
  "green",
  "red",
  "half_green",
  "half_red",
  "void",
  "cashout",
] as const

export type BetResult = (typeof BET_RESULTS)[number]

export type FreebetTrigger = "on_loss" | "on_win" | "always"
export type FreebetStatus = "pending" | "extracted" | "discarded"

export interface Bet {
  id: number
  bookmakerAccountId: number
  tipsterId: number | null
  methodId: number | null
  marketId: number | null
  event: string
  selection: string
  sport: string | null
  competition: string | null
  eventDate: string | null
  odd: number
  units: number
  unitValue: number
  stakeAmount: number
  result: BetResult
  cashoutAmount: number | null
  profitAmount: number | null
  isFreebet: boolean
  generatesFreebet: boolean
  freebetValue: number | null
  freebetExtraction: number | null
  freebetTrigger: FreebetTrigger | null
  placedAt: string
  settledAt: string | null
  notes: string | null
  account?: Account
  tipster?: Tipster | null
  method?: Method | null
  market?: Market | null
}

export interface Freebet {
  id: number
  bookmakerAccountId: number
  sourceBetId: number | null
  value: number
  extractionRate: number
  extractedValue: number
  trigger: FreebetTrigger
  status: FreebetStatus
  createdAt: string
  resolvedAt: string | null
  account?: Account
  sourceBet?: Bet | null
}

export interface BetImageAnalysisLeg {
  selection: string | null
  marketName: string | null
  odd: number | null
  stakeAmount: number | null
  bookmaker: string | null
  type: "back" | "lay" | null
}

export interface BetImageAnalysisResult {
  isBet: boolean
  bookmaker?: string | null
  warnings?: string[]
  metadata?: { model: string; durationMs: number; cacheHit: boolean; inputTokens: number; outputTokens: number; thinkingTokens: number; attempts: number }
  event: string | null
  selection: string | null
  marketName: string | null
  odd: number | null
  units: number | null
  stakeAmount: number | null
  sport: string | null
  competition: string | null
  placedAt: string | null
  notes: string | null
  legs: BetImageAnalysisLeg[]
}

export interface StatsSummary {
  totalBets: number
  pendingBets: number
  wins: number
  losses: number
  voids: number
  cashouts: number
  staked: number
  pendingStake: number
  profit: number
  profitUnits: number
  roi: number
  hitRate: number
  avgOdd: number
  totalBalance: number
}

export interface StatsRow {
  key: string | number | null
  label: string | null
  totalBets: number
  pendingBets: number
  staked: number
  profit: number
  profitUnits: number
  roi: number
  hitRate: number
}

export interface TimelinePoint {
  day: string
  profit: number
  cumulativeProfit: number
}

export type BetFilters = Partial<{
  from: string
  to: string
  accountId: number | string
  bookmakerId: number | string
  tipsterId: number | string
  methodId: number | string
  marketId: number | string
  result: string
  search: string
  page: number
  perPage: number
}>

export function buildQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export type CostKind = "one_time" | "monthly"

export interface Cost {
  id: number
  description: string
  amount: number
  kind: CostKind
  startsOn: string
  endsOn: string | null
  notes: string | null
  tipsters?: Tipster[]
}

export interface CostSummary {
  total: number
  byTipster: Record<string, number>
  costs: {
    id: number
    description: string
    kind: CostKind
    amount: number
    occurrences: number
    total: number
    tipsterIds: number[]
    perTipster: number
  }[]
}

export const resources = {
  bookmakers: {
    list: () => apiFetch<Bookmaker[]>("/bookmakers"),
    create: (data: Partial<Bookmaker>) =>
      apiFetch<Bookmaker>("/bookmakers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Bookmaker>) =>
      apiFetch<Bookmaker>(`/bookmakers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => apiFetch<unknown>(`/bookmakers/${id}`, { method: "DELETE" }),
  },
  accounts: {
    list: () => apiFetch<Account[]>("/accounts"),
    create: (data: { bookmakerId: number; label?: string | null; initialDeposit?: number }) =>
      apiFetch<Account>("/accounts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Account>) =>
      apiFetch<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => apiFetch<unknown>(`/accounts/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: (accountId: number) =>
      apiFetch<Transaction[]>(`/accounts/${accountId}/transactions`),
    create: (
      accountId: number,
      data: { type: "deposit" | "withdrawal"; amount: number; notes?: string }
    ) =>
      apiFetch<Transaction>(`/accounts/${accountId}/transactions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    remove: (id: number) => apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }),
  },
  costs: {
    list: () => apiFetch<Cost[]>("/costs"),
    summary: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams()
      if (params?.from) qs.set("from", params.from)
      if (params?.to) qs.set("to", params.to)
      const suffix = qs.toString() ? `?${qs}` : ""
      return apiFetch<CostSummary>(`/costs/summary${suffix}`)
    },
    create: (data: Record<string, unknown>) =>
      apiFetch<Cost>("/costs", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      apiFetch<Cost>(`/costs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => apiFetch<unknown>(`/costs/${id}`, { method: "DELETE" }),
  },
  tipsters: {
    list: () => apiFetch<Tipster[]>("/tipsters"),
    create: (data: Partial<Tipster>) =>
      apiFetch<Tipster>("/tipsters", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Tipster>) =>
      apiFetch<Tipster>(`/tipsters/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => apiFetch<unknown>(`/tipsters/${id}`, { method: "DELETE" }),
  },
  methods: {
    list: () => apiFetch<Method[]>("/methods"),
    create: (data: Partial<Method>) =>
      apiFetch<Method>("/methods", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Method>) =>
      apiFetch<Method>(`/methods/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => apiFetch<unknown>(`/methods/${id}`, { method: "DELETE" }),
  },
  markets: {
    list: (search?: string) =>
      apiFetch<Market[]>(`/markets${buildQuery({ search })}`),
    create: (name: string) =>
      apiFetch<Market>("/markets", { method: "POST", body: JSON.stringify({ name }) }),
  },
  bets: {
    list: (filters: BetFilters = {}) =>
      apiFetch<Paginated<Bet>>(`/bets${buildQuery(filters)}`),
    analyzeImage: (image: File | null, contextText?: string, options?: { mode?: "punter" | "surebet"; signal?: AbortSignal }) => {
      const formData = new FormData()
      if (image) formData.append("image", image)
      if (contextText) formData.append("contextText", contextText)
      formData.append("mode", options?.mode ?? "punter")
      formData.append("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone)
      return apiUpload<BetImageAnalysisResult>("/bets/analyze-image", formData, options?.signal)
    },
    uploadReceipt: (image: File) => {
      const formData = new FormData()
      formData.append("image", image)
      return apiUpload<{ receiptKey: string }>("/bets/receipts", formData)
    },
    receiptUrl: (id: number) => apiFetch<{ url: string }>(`/bets/${id}/receipt`),
    create: (data: Record<string, unknown>) =>
      apiFetch<Bet>("/bets", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      apiFetch<Bet>(`/bets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    settle: (id: number, result: BetResult, cashoutAmount?: number) =>
      apiFetch<Bet>(`/bets/${id}/settle`, {
        method: "PATCH",
        body: JSON.stringify({ result, cashoutAmount }),
      }),
    remove: (id: number) => apiFetch<void>(`/bets/${id}`, { method: "DELETE" }),
  },
  freebets: {
    list: (status?: FreebetStatus) =>
      apiFetch<Freebet[]>(`/freebets${buildQuery({ status })}`),
    extract: (id: number) =>
      apiFetch<Freebet>(`/freebets/${id}/extract`, { method: "PATCH" }),
    discard: (id: number) =>
      apiFetch<Freebet>(`/freebets/${id}/discard`, { method: "PATCH" }),
    reopen: (id: number) =>
      apiFetch<Freebet>(`/freebets/${id}/reopen`, { method: "PATCH" }),
  },
  settings: {
    get: () => apiFetch<{ unitValue: number }>("/me/settings"),
    update: (unitValue: number) =>
      apiFetch<{ unitValue: number }>("/me/settings", {
        method: "PUT",
        body: JSON.stringify({ unitValue }),
      }),
  },
  stats: {
    summary: (filters: BetFilters = {}) =>
      apiFetch<StatsSummary>(`/stats/summary${buildQuery(filters)}`),
    by: (dimension: string, filters: BetFilters = {}) =>
      apiFetch<StatsRow[]>(`/stats/by${buildQuery({ dimension, ...filters })}`),
    timeline: (filters: BetFilters = {}) =>
      apiFetch<TimelinePoint[]>(`/stats/timeline${buildQuery(filters)}`),
  },
}
