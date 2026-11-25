/**
 * Rolagem horizontal animada por código.
 *
 * `scrollBy({ behavior: "smooth" })` e `scroll-behavior: smooth` são
 * ignorados por alguns WebViews do Android (a faixa salta direto para o
 * destino), então a animação é feita aqui: mesmo resultado no navegador e
 * no app, com easing e cancelada assim que o usuário toca a faixa.
 */

/** Duração padrão do deslize acionado pelas setas (ms). */
const DEFAULT_DURATION = 320

/** Animação em andamento por elemento (uma por vez). */
const animations = new WeakMap<HTMLElement, () => void>()

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3)
}

/** Interrompe a rolagem animada do elemento, se houver. */
export function stopSmoothScroll(element: HTMLElement) {
  animations.get(element)?.()
}

/** Anima o `scrollLeft` do elemento até a posição indicada. */
export function smoothScrollTo(
  element: HTMLElement,
  left: number,
  duration = DEFAULT_DURATION
) {
  stopSmoothScroll(element)

  const max = Math.max(0, element.scrollWidth - element.clientWidth)
  const from = element.scrollLeft
  const to = Math.min(max, Math.max(0, left))
  if (duration <= 0 || Math.abs(to - from) < 1) {
    element.scrollLeft = to
    return
  }

  const startedAt = performance.now()
  const interrupts = ["pointerdown", "touchstart", "wheel"] as const
  let frame = 0

  const stop = () => {
    cancelAnimationFrame(frame)
    for (const type of interrupts) {
      element.removeEventListener(type, stop)
    }
    animations.delete(element)
  }

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    element.scrollLeft = from + (to - from) * easeOutCubic(progress)
    if (progress < 1) {
      frame = requestAnimationFrame(step)
    } else {
      stop()
    }
  }

  // Um toque/roda no meio do deslize assume o controle na hora.
  for (const type of interrupts) {
    element.addEventListener(type, stop, { passive: true })
  }
  animations.set(element, stop)
  frame = requestAnimationFrame(step)
}

/** Anima a rolagem horizontal em `delta` px a partir da posição atual. */
export function smoothScrollBy(
  element: HTMLElement,
  delta: number,
  duration = DEFAULT_DURATION
) {
  smoothScrollTo(element, element.scrollLeft + delta, duration)
}
