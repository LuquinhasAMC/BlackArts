import { Suspense, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { BottomNav } from "./bottom-nav"
import { Header } from "./header"
import { PageLoader } from "./page-loader"

/** Layout principal: cabeçalho, conteúdo e bottom bar de navegação. */
export function AppLayout() {
  const location = useLocation()

  // App estilo mobile: toda navegação volta ao topo da página. Sem isso,
  // o navegador mantém/restaura a rolagem anterior ao voltar para a tela
  // inicial, e a top bar apareceria sólida (a transparência só vale com
  // a página no topo).
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="w-full flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 sm:pb-32">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
