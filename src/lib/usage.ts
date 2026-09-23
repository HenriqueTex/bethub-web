export interface UsageStats {
  betCount?: number
  lastBetAt?: string | null
}

/** Mais apostas nos últimos 90 dias primeiro; empate vai para a aposta mais recente e, por fim, o nome. */
export function byUsage<T extends UsageStats>(name: (item: T) => string) {
  const time = (value?: string | null) => (value ? Date.parse(value) || 0 : 0)
  return (a: T, b: T) =>
    (b.betCount ?? 0) - (a.betCount ?? 0) ||
    time(b.lastBetAt) - time(a.lastBetAt) ||
    name(a).localeCompare(name(b), "pt-BR")
}

export const accountName = (account: { label: string | null; bookmaker?: { name: string } }) =>
  `${account.bookmaker?.name ?? ""} ${account.label ?? ""}`.trim()
