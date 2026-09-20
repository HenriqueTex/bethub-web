"use client"

import { ThemeProvider as NextThemeProvider } from "next-themes"

export { useTheme } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" storageKey="bethub-theme" enableSystem themes={["light", "dark", "black", "system"]} disableTransitionOnChange>
      {children}
    </NextThemeProvider>
  )
}
