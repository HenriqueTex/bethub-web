"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--surface-glass)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--surface-glass-border)",
          "--success-bg": "color-mix(in oklab, var(--profit) 12%, var(--popover))",
          "--success-border": "color-mix(in oklab, var(--profit) 35%, transparent)",
          "--success-text": "var(--profit)",
          "--error-bg": "color-mix(in oklab, var(--loss) 12%, var(--popover))",
          "--error-border": "color-mix(in oklab, var(--loss) 35%, transparent)",
          "--error-text": "var(--loss)",
          "--warning-bg": "color-mix(in oklab, var(--warning) 12%, var(--popover))",
          "--warning-border": "color-mix(in oklab, var(--warning) 35%, transparent)",
          "--warning-text": "var(--warning)",
          "--info-bg": "var(--surface-glass)",
          "--info-border": "var(--surface-glass-border)",
          "--info-text": "var(--popover-foreground)",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-panel backdrop-blur-xl",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
