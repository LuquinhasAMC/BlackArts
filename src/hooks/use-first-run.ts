import { useCallback, useState } from "react"

import { STORAGE_KEYS } from "@/config/archive"
import { readStorage, writeStorage } from "@/lib/storage"

const HAS_SEEN_WELCOME_KEY = STORAGE_KEYS.hasSeenWelcome

/**
 * Controla o comportamento de primeira execução do app.
 * Se a flag não existir, a tela de boas-vindas deve aparecer.
 */
export function useFirstRun() {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() =>
    readStorage(HAS_SEEN_WELCOME_KEY, false)
  )

  const markWelcomeSeen = useCallback(() => {
    writeStorage(HAS_SEEN_WELCOME_KEY, true)
    setHasSeenWelcome(true)
  }, [])

  return { hasSeenWelcome, markWelcomeSeen }
}
