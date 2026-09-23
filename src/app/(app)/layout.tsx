"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChartLine,
  ClipboardList,
  Gift,
  Landmark,
  LogOut,
  Megaphone,
  Receipt,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Settings,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { BrandMark } from "@/components/landing/brand-mark"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { User, getToken, logout, me } from "@/lib/api"

const MAIN_NAV = [
  { href: "/punter", label: "Punter", icon: TrendingUp },
  { href: "/surebet", label: "Surebet", icon: Scale }
]

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: ChartLine },
  { href: "/bets", label: "Todas as apostas", icon: ClipboardList },
  { href: "/bookmakers", label: "Casas & Contas", icon: Landmark },
  { href: "/freebets", label: "Freebets", icon: Gift },
  { href: "/tipsters", label: "Tipsters", icon: Megaphone },
  { href: "/costs", label: "Custos", icon: Receipt },
  { href: "/settings", label: "Configurações", icon: Settings }
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login")
      return
    }
    me()
      .then((value) => {
        setUser(value)
        setCollapsed(
          localStorage.getItem("bethub_sidebar_collapsed") === "true"
        )
      })
      .catch(() => router.replace("/login"))
  }, [router])

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  if (!user) {
    return (
      <div className="grid-backdrop flex min-h-dvh flex-col items-center justify-center gap-4">
        <BrandMark />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("bethub_sidebar_collapsed", String(next))
  }

  function navigation(compact: boolean) {
    return (
      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {[MAIN_NAV, NAV].map((items, group) => (
          <div
            key={group}
            className={group ? "mt-3 space-y-1 border-t border-glass-border pt-3" : "space-y-1"}
          >
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                title={compact ? label : undefined}
                aria-label={label}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-control-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground",
                  compact && "justify-center px-0",
                  pathname.startsWith(href) &&
                    "bg-primary/10 text-foreground ring-1 ring-primary/25 hover:bg-primary/10",
                  group === 0 && "font-semibold"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    pathname.startsWith(href) && "text-primary dark:text-brand-bright"
                  )}
                />
                {!compact && label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    )
  }

  return (
    <div className="min-h-dvh">
      <div aria-hidden="true" className="grid-backdrop fixed inset-0 -z-10" />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:p-3 focus:text-primary-foreground">Pular para o conteúdo</a>
      <aside
        id="desktop-sidebar"
        aria-label="Menu lateral"
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden flex-col border-r panel-glass md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-glass-border",
            collapsed ? "justify-center" : "justify-between px-4"
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" aria-label="BetHub, ir para o dashboard">
              <BrandMark />
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-controls="desktop-sidebar"
            aria-label={
              collapsed ? "Expandir menu lateral" : "Retrair menu lateral"
            }
            title={collapsed ? "Expandir menu lateral" : "Retrair menu lateral"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </Button>
        </div>
        {navigation(collapsed)}
        <div className="border-t border-glass-border p-3">
          <ThemeSwitcher compact={collapsed} />
          {!collapsed && (
            <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
              {user.email}
            </p>
          )}
          <Button
            variant="ghost"
            className={cn("w-full gap-3", collapsed ? "px-0" : "justify-start")}
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && "Sair"}
          </Button>
        </div>
      </aside>
      <div className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b panel-glass px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 max-w-[85vw]"
            aria-describedby={undefined}
          >
            <SheetHeader>
              <SheetTitle>
                <BrandMark />
              </SheetTitle>
            </SheetHeader>
            {navigation(false)}
            <div className="border-t border-glass-border p-3">
              <p className="truncate px-3 text-xs text-muted-foreground">
                {user.email}
              </p>
              <Button
                variant="ghost"
                className="mt-2 w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/punter" aria-label="BetHub, ir para o Punter">
          <BrandMark />
        </Link>
        <div className="ml-auto"><ThemeSwitcher compact /></div>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "min-h-dvh min-w-0 p-4 sm:p-6 lg:p-8",
          collapsed ? "md:ml-16" : "md:ml-60"
        )}
      >
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
