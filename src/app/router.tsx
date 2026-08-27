import { lazy, Suspense, useEffect } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import { AppLayout } from "@/components/layout/layout"
import { PageLoader } from "@/components/layout/page-loader"
import { STORAGE_KEYS } from "@/config/archive"
import { readStorage } from "@/lib/storage"

const WelcomePage = lazy(() => import("@/pages/welcome"))
const HomePage = lazy(() => import("@/pages/home"))
const SearchPage = lazy(() => import("@/pages/search"))
const ItemDetailPage = lazy(() => import("@/pages/item-detail"))
const FavoritesPage = lazy(() => import("@/pages/favorites"))
const NotFoundPage = lazy(() => import("@/pages/not-found"))

/** Rola ao topo a cada mudança de rota. */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
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

/** Rotas da aplicação. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <FirstRunGate />
      <Routes>
        <Route
          path="/welcome"
          element={
            <Suspense fallback={<PageLoader />}>
              <WelcomePage />
            </Suspense>
          }
        />
        {/* Tela de pesquisa em viewport cheio (sem bottom bar, com voltar). */}
        <Route
          path="/search"
          element={
            <Suspense fallback={<PageLoader />}>
              <SearchPage />
            </Suspense>
          }
        />
        {/* Tela de item em viewport cheio, no formato app mobile. */}
        <Route
          path="/item/:identifier"
          element={
            <Suspense fallback={<PageLoader />}>
              <ItemDetailPage />
            </Suspense>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
