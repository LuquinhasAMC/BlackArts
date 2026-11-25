import { lazy, Suspense, useEffect, type ReactNode } from "react"
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
} from "react-router-dom"

import { AppLayout } from "@/components/layout/layout"
import { PageLoader } from "@/components/layout/page-loader"
import { STORAGE_KEYS } from "@/config/archive"
import { readScrollPosition, rememberScrollPosition } from "@/lib/scroll-memory"
import { readStorage } from "@/lib/storage"

const WelcomePage = lazy(() => import("@/pages/welcome"))
const HomePage = lazy(() => import("@/pages/home"))
const SearchPage = lazy(() => import("@/pages/search"))
const ItemDetailPage = lazy(() => import("@/pages/item-detail"))
const FavoritesPage = lazy(() => import("@/pages/favorites"))
const NotFoundPage = lazy(() => import("@/pages/not-found"))

/**
 * Restaura a rolagem de cada rota: voltar para o Início (vindo dos
 * favoritos, da pesquisa ou de uma obra) cai na mesma posição em vez de
 * recomeçar do topo. Só navegação nova (rota nunca visitada) começa em 0.
 * A restauração espera o conteúdo montar — as páginas carregam num chunk
 * lazy, então o primeiro scroll pode acontecer com a tela de carregamento.
 */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }
  }, [])

  useEffect(() => {
    const target = readScrollPosition(pathname)
    // Enquanto a posição ainda não foi alcançada (a página pode estar
    // carregando e ser curta demais), os eventos de rolagem intermediários
    // não podem sobrescrever a posição lembrada.
    let restoring = target > 2
    let attempts = 0
    let timer = 0
    let restoreFrame = 0
    let writeFrame = 0

    const restore = () => {
      window.scrollTo(0, target)
      if (Math.abs(window.scrollY - target) > 2 && attempts < 20) {
        attempts += 1
        timer = window.setTimeout(restore, 60)
        return
      }
      restoring = false
    }

    const onScroll = () => {
      if (restoring || writeFrame) {
        return
      }
      writeFrame = window.requestAnimationFrame(() => {
        writeFrame = 0
        rememberScrollPosition(pathname, window.scrollY)
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    restoreFrame = window.requestAnimationFrame(restore)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.cancelAnimationFrame(restoreFrame)
      window.cancelAnimationFrame(writeFrame)
      window.clearTimeout(timer)
    }
  }, [pathname])

  return null
}

/**
 * Redireciona para /welcome na primeira execução do app.
 *
 * Lê o localStorage a cada render (em vez de guardar o valor em estado):
 * assim, quando a tela de boas-vindas marca a flag e navega para "/", o
 * gate já enxerga o novo valor no render seguinte — sem redirecionar de
 * volta para o onboarding nem exigir um reload da página.
 */
function FirstRunGate() {
  const location = useLocation()
  const hasSeenWelcome = readStorage(STORAGE_KEYS.hasSeenWelcome, false)

  if (!hasSeenWelcome && location.pathname !== "/welcome") {
    return <Navigate to="/welcome" replace />
  }

  return null
}

/** Envolve a página no carregamento dos chunks lazy. */
function page(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}

/** Layout raiz: rolagem restaurada e gate de primeira execução. */
function RootGate() {
  return (
    <>
      <ScrollToTop />
      <FirstRunGate />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootGate />}>
      <Route path="/welcome" element={page(<WelcomePage />)} />
      {/* Tela de pesquisa em viewport cheio (sem bottom bar, com voltar). */}
      <Route path="/search" element={page(<SearchPage />)} />
      {/* Tela de item em viewport cheio, no formato app mobile. */}
      <Route path="/item/:identifier" element={page(<ItemDetailPage />)} />
      <Route element={<AppLayout />}>
        <Route index element={page(<HomePage />)} />
        <Route path="favorites" element={page(<FavoritesPage />)} />
        <Route path="*" element={page(<NotFoundPage />)} />
      </Route>
    </Route>
  )
)

/** Rotas da aplicação. */
export function AppRouter() {
  return <RouterProvider router={router} />
}
