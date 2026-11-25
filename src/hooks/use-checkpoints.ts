import { useSyncExternalStore } from "react"

import {
  getCheckpoint,
  getCheckpoints,
  subscribeCheckpoints,
  type Checkpoint,
} from "@/lib/checkpoints"

/** Obras vistas, da mais recente para a mais antiga (atualiza sozinho). */
export function useCheckpoints(): Checkpoint[] {
  return useSyncExternalStore(
    subscribeCheckpoints,
    getCheckpoints,
    getCheckpoints
  )
}

/** Checkpoint de uma obra específica. */
export function useCheckpoint(identifier: string): Checkpoint | null {
  const checkpoints = useCheckpoints()
  return (
    checkpoints.find((entry) => entry.identifier === identifier) ??
    getCheckpoint(identifier)
  )
}
