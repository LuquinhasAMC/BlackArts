import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ARCHIVE } from "@/config/archive"
import { FavoritesProvider } from "@/hooks/use-favorites"

/** Providers globais do app (Query, favoritos, tooltips e toasts). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: ARCHIVE.staleTimeMs,
            retry: ARCHIVE.retry,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <FavoritesProvider>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  )
}
