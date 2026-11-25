import { Suspense } from "react"
import { Outlet } from "react-router-dom"

import { useAudioPlayback } from "@/components/media/audio-playback"
import { cn } from "@/lib/utils"
import { BottomNav } from "./bottom-nav"
import { Header } from "./header"
import { PageLoader } from "./page-loader"

/** Layout principal: cabeçalho, conteúdo e bottom bar de navegação. */
export function AppLayout() {
  // Com o mini player acima da navegação, o conteúdo precisa de mais
  // espaço embaixo para não ficar escondido atrás dos dois.
  const { active } = useAudioPlayback()

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main
        className={cn(
          "w-full flex-1 px-4 pt-6 sm:px-6 sm:pt-8",
          active ? "pb-44 sm:pb-48" : "pb-28 sm:pb-32"
        )}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
