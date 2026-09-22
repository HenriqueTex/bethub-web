import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { BankrollChart } from "./bankroll-chart"
import { MetricCard } from "./metric-card"
import { cn } from "@/lib/utils"

const BETS = [
  { event: "Real Madrid", market: "Moneyline", odd: "2.10", result: "+ R$ 110", won: true },
  { event: "Lakers", market: "Spread -4.5", odd: "1.92", result: "− R$ 100", won: false },
  { event: "Manchester City", market: "Over 2.5", odd: "1.85", result: "+ R$ 85", won: true },
]

export function PortfolioPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-px right-10 left-10 -z-10 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block"
      />

      <section
        aria-label="Exemplo ilustrativo do painel de banca"
        className="rounded-[20px] border border-white/10 bg-[rgba(10,12,11,0.70)] p-4 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-5"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[13.5px] font-semibold tracking-tight text-white">
            Visão geral
            <span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] font-medium tracking-[0.06em] text-white/45 uppercase">
              Exemplo
            </span>
          </h2>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/55">
            Últimos 30 dias
          </span>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
          <MetricCard label="Banca atual" value="R$ 5.240,00" detail="+12,4%" trend="up" />
          <MetricCard label="Resultado" value="+ R$ 1.240" detail="este mês" positive />
          <MetricCard label="ROI" value="+12,8%" detail="128 apostas" trend="up" positive />
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-3.5">
          <BankrollChart />
        </div>

        <div className="mt-5">
          <h3 className="text-[11.5px] font-medium tracking-[0.06em] text-white/55 uppercase">
            Últimas apostas
          </h3>

          <ul className="mt-2.5 divide-y divide-white/[0.07]">
            {BETS.map((bet, index) => (
              <li
                key={bet.event}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  index === BETS.length - 1 && "hidden sm:flex",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border",
                    bet.won ? "border-profit/25 bg-profit/10" : "border-loss/25 bg-loss/10",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      bet.won ? "bg-profit" : "bg-loss",
                    )}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-white">{bet.event}</p>
                  <p className="truncate text-[11px] text-white/55">{bet.market}</p>
                </div>

                <span className="numeric shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[11px] text-white/70">
                  {bet.odd}
                </span>

                <span
                  className={cn(
                    "numeric flex w-[74px] shrink-0 items-center justify-end gap-1 text-[12px] font-medium",
                    bet.won ? "text-profit" : "text-loss",
                  )}
                >
                  {bet.won ? (
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="size-3" aria-hidden="true" />
                  )}
                  {bet.result}
                  <span className="sr-only">{bet.won ? "aposta ganha" : "aposta perdida"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
