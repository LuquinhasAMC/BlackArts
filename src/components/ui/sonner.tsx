"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/theme-provider"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

/**
 * Altura da status bar/notch. O Capacitor injeta `--safe-area-inset-top`
 * (edge-to-edge); os fallbacks cobrem iOS e o navegador no desktop.
 */
const SAFE_AREA_TOP =
  "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      // Sem a safe area o toast nasce embaixo da status bar no app. Os
      // valores base são os padrões do sonner (24px no desktop, 16px no
      // celular), só somados ao inset do topo.
      offset={{ top: `calc(24px + ${SAFE_AREA_TOP})` }}
      mobileOffset={{ top: `calc(16px + ${SAFE_AREA_TOP})` }}
      {...props}
    />
  )
}

export { Toaster }
