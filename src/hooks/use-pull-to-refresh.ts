import { useEffect, useRef, useState } from "react"

/** Distância (px) que precisa ser puxada para disparar a atualização. */
const THRESHOLD = 64
/** Distância máxima que o conteúdo desce. */
const MAX_PULL = 104
/** Resistência: quanto do dedo vira deslocamento do conteúdo. */
const RESISTANCE = 0.55
/** Tempo mínimo do giro da bolinha (evita um piscar). */
const MIN_SPIN_MS = 650

/**
 * "Puxe para atualizar" no estilo Android: com a página no topo, arrastar
 * para baixo além do limite mostra uma bolinha de recarregar e, ao soltar,
 * executa `onRefresh` sem recarregar o navegador.
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ y: number; x: number; active: boolean } | null>(null)
  const refreshRef = useRef(onRefresh)
  const refreshingRef = useRef(false)
  const pullRef = useRef(0)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    refreshingRef.current = refreshing
  }, [refreshing])

  useEffect(() => {
    pullRef.current = pull
  }, [pull])

  useEffect(() => {
    const trigger = async () => {
      if (refreshingRef.current) {
        return
      }
      setRefreshing(true)
      setPull(56)
      const started = Date.now()
      try {
        await refreshRef.current()
      } finally {
        const elapsed = Date.now() - started
        if (elapsed < MIN_SPIN_MS) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, MIN_SPIN_MS - elapsed)
          )
        }
        setRefreshing(false)
        setPull(0)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) {
        start.current = null
        return
      }
      if (window.scrollY > 0) {
        start.current = null
        return
      }
      const touch = event.touches[0]
      start.current = { y: touch.clientY, x: touch.clientX, active: true }
    }

    const onTouchMove = (event: TouchEvent) => {
      const state = start.current
      if (!state || !state.active || refreshingRef.current) {
        return
      }
      if (event.touches.length !== 1) {
        return
      }
      const touch = event.touches[0]
      const deltaY = touch.clientY - state.y
      const deltaX = Math.abs(touch.clientX - state.x)
      // Rolagem lateral (fileiras) e gestos para cima não puxam a tela.
      if (deltaY <= 0 || deltaX > Math.abs(deltaY)) {
        if (deltaY < -8) {
          state.active = false
        }
        return
      }
      // A página saiu do topo por conta própria: cancela o gesto.
      if (window.scrollY > 0) {
        start.current = null
        setDragging(false)
        setPull(0)
        return
      }
      if (!dragging) {
        setDragging(true)
      }
      setPull(Math.min(MAX_PULL, deltaY * RESISTANCE))
      // Segura a rolagem nativa/estilingue enquanto a puxada acontece.
      if (event.cancelable) {
        event.preventDefault()
      }
    }

    const onTouchEnd = () => {
      const state = start.current
      start.current = null
      if (!state) {
        return
      }
      setDragging(false)
      if (refreshingRef.current) {
        return
      }
      if (pullRef.current >= THRESHOLD) {
        void trigger()
      } else {
        setPull(0)
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("touchcancel", onTouchEnd)
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [dragging])

  return { pull, refreshing, dragging }
}
