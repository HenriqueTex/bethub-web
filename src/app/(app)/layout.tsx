"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChartLine,
  ClipboardList,
  Landmark,
  LogOut,
  Megaphone,
  Scale,
  Settings,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { User, getToken, logout, me } from "@/lib/api"

const MAIN_NAV = [
  { href: "/punter", label: "Punter", icon: TrendingUp },
  { href: "/surebet", label: "Surebet", icon: Scale },
]

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: ChartLine },
  { href: "/bets", label: "Todas as apostas", icon: ClipboardList },
  { href: "/bookmakers", label: "Casas & Contas", icon: Landmark },
  { href: "/tipsters", label: "Tipsters", icon: Megaphone },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login")
      return
    }
    me()
      .then(setUser)
      .catch(() => router.replace("/login"))
  }, [router])

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center border-b px-5">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Bet<span className="text-emerald-500">Hub</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {MAIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-base font-semibold text-foreground transition-colors hover:bg-accent",
                pathname.startsWith(href) &&
                  "border-emerald-600/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
          <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Geral
          </p>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname.startsWith(href) && "bg-accent text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{user.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="ml-60 flex-1 bg-muted/30 p-6 lg:p-8">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
