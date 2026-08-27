import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { ScreenOrientation } from "@capacitor/screen-orientation"

/** Se o app está rodando dentro do Capacitor (Android/iOS nativo). */
export const isNative = Capacitor.isNativePlatform()

const FULLSCREEN_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
] as const

/** Se algum elemento está em fullscreen no momento. */
function isFullscreenActive(): boolean {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null
  }
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement)
}

async function lockPortrait() {
  try {
    await ScreenOrientation.lock({ orientation: "portrait" })
  } catch {
    // Em alguns dispositivos o bloqueio falha sem impacto real; ignora.
  }
}

async function unlockOrientation() {
  try {
    await ScreenOrientation.unlock()
  } catch {
    // ignora
  }
}

/** Handler chamado sempre que o estado de fullscreen muda. */
async function handleFullscreenChange() {
  if (isFullscreenActive()) {
    // Vídeo em tela cheia: libera a orientação para girar em landscape.
    await unlockOrientation()
  } else {
    // Saiu do fullscreen: volta a travar o app em retrato.
    await lockPortrait()
  }
}

/** Se existe histórico de navegação no React Router (além da raiz). */
function canGoBackInRouter(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === "number" && idx > 0
}

/**
 * Configura o app para rodar nativo:
 * - mantém a orientação sempre em retrato, exceto durante o fullscreen
 *   do player de vídeo (quando a tela pode girar para landscape);
 * - as barras do sistema (status/navigation) ficam sobre a interface,
 *   com os ícones claros (tema escuro) — os safe areas são resolvidos
 *   no CSS via `var(--safe-area-inset-*)`;
 * - o botão voltar do Android navega para a tela anterior do app (em
 *   vez de fechar o app imediatamente); na raiz, minimiza o app.
 */
export function setupNativeApp() {
  if (!isNative) {
    return
  }

  void lockPortrait()

  for (const eventName of FULLSCREEN_EVENTS) {
    document.addEventListener(eventName, handleFullscreenChange)
  }

  // Botão voltar do Android: segue o histórico do React Router em vez de
  // fechar o app. O `canGoBack` do Capacitor reflete o histórico do
  // WebView (quase sempre vazio num SPA), então usamos o idx do history.
  void App.addListener("backButton", () => {
    if (isFullscreenActive()) {
      document.exitFullscreen?.().catch(() => {})
      return
    }
    if (canGoBackInRouter()) {
      window.history.back()
      return
    }
    // Sem histórico: minimiza em vez de fechar (padrão Android).
    void App.minimizeApp()
  })
}
