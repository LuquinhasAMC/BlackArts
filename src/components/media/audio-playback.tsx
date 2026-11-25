import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

/** Faixa de áudio carregada no player global. */
export interface NowPlaying {
  identifier: string
  src: string
  /** Título do item. */
  title: string
  creator?: string
  /** Nome da faixa em reprodução. */
  track: string
}

interface AudioPlaybackContextValue {
  nowPlaying: NowPlaying | null
  /** Já houve reprodução nesta faixa (o mini player só aparece depois do play). */
  active: boolean
  playing: boolean
  loading: boolean
  failed: boolean
  currentTime: number
  duration: number
  /** Carrega uma faixa; com `autoplay`, inicia assim que estiver pronta. */
  load: (track: NowPlaying, options?: { autoplay?: boolean }) => void
  toggle: () => void
  /** Move a reprodução para a posição (0–1) da faixa. */
  seek: (ratio: number) => void
  /** Para e limpa a faixa atual (fecha o mini player). */
  stop: () => void
  retry: () => void
  /** Handler chamado ao terminar a faixa (avanço automático). */
  setOnEnded: (handler: (() => void) | null) => void
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(
  null
)

/**
 * Player de áudio único da aplicação: o elemento `<audio>` vive aqui, no topo
 * da árvore, para a reprodução continuar ao navegar entre as telas. Quem
 * mostra os controles (viewer do item, mini player da navegação) lê e comanda
 * esse mesmo estado.
 */
export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  // Fonte carregada agora (ref: `load` não precisa recriar a cada troca).
  const srcRef = useRef<string | null>(null)
  // Pede o play assim que o áudio estiver pronto (sem gesto novo).
  const autoplayRef = useRef(false)
  const endedRef = useRef<(() => void) | null>(null)

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  // Só fica verdadeiro depois que o usuário manda tocar: carregar a faixa
  // (abrir o item) não é suficiente para mostrar o mini player.
  const [active, setActive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // Muda ao "tentar novamente" para remontar o elemento de áudio.
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(
    (track: NowPlaying, options?: { autoplay?: boolean }) => {
      if (srcRef.current === track.src) {
        // Mesma faixa (ex.: voltar para o item): só atualiza os metadados,
        // sem reiniciar a reprodução.
        setNowPlaying(track)
        if (options?.autoplay) {
          void audioRef.current?.play().catch(() => setFailed(true))
        }
        return
      }
      srcRef.current = track.src
      autoplayRef.current = Boolean(options?.autoplay)
      setActive(false)
      setNowPlaying(track)
      setFailed(false)
      setLoading(true)
      setCurrentTime(0)
      setDuration(0)
    },
    []
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !srcRef.current) {
      return
    }
    if (audio.paused) {
      void audio.play().catch(() => setFailed(true))
    } else {
      audio.pause()
    }
  }, [])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return
    }
    const next = Math.min(Math.max(ratio, 0), 1) * audio.duration
    audio.currentTime = next
    setCurrentTime(next)
  }, [])

  const stop = useCallback(() => {
    audioRef.current?.pause()
    srcRef.current = null
    autoplayRef.current = false
    setNowPlaying(null)
    setActive(false)
    setPlaying(false)
    setLoading(false)
    setFailed(false)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const retry = useCallback(() => {
    if (!srcRef.current) {
      return
    }
    setFailed(false)
    setLoading(true)
    setAttempt((value) => value + 1)
  }, [])

  const setOnEnded = useCallback((handler: (() => void) | null) => {
    endedRef.current = handler
  }, [])

  const value = useMemo<AudioPlaybackContextValue>(
    () => ({
      nowPlaying,
      active,
      playing,
      loading,
      failed,
      currentTime,
      duration,
      load,
      toggle,
      seek,
      stop,
      retry,
      setOnEnded,
    }),
    [
      nowPlaying,
      active,
      playing,
      loading,
      failed,
      currentTime,
      duration,
      load,
      toggle,
      seek,
      stop,
      retry,
      setOnEnded,
    ]
  )

  return (
    <AudioPlaybackContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        key={`${nowPlaying?.src ?? ""}-${attempt}`}
        src={nowPlaying?.src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0)
          setLoading(false)
        }}
        onCanPlay={(event) => {
          setLoading(false)
          if (autoplayRef.current) {
            autoplayRef.current = false
            void event.currentTarget.play().catch(() => setFailed(true))
          }
        }}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onPlay={() => {
          setPlaying(true)
          setActive(true)
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          endedRef.current?.()
        }}
        onError={() => {
          setLoading(false)
          setFailed(true)
        }}
      >
        Seu navegador não suporta reprodução de áudio.
      </audio>
    </AudioPlaybackContext.Provider>
  )
}

/** Estado e comandos do player de áudio global. */
export function useAudioPlayback(): AudioPlaybackContextValue {
  const context = useContext(AudioPlaybackContext)
  if (!context) {
    throw new Error("useAudioPlayback precisa do AudioPlaybackProvider")
  }
  return context
}
