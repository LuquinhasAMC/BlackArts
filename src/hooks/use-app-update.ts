import { useCallback, useEffect, useState } from "react"

import { PROJECT_LINKS } from "@/config/links"
import { isNative } from "@/lib/capacitor"
import { readStorage, writeStorage } from "@/lib/storage"

/**
 * Verificação de nova versão do APK no GitHub Releases.
 *
 * O repositório publica sempre na release `latest` (tag fixa "app"), então
 * o número de versão vem do nome da release ("2.0.1") e a identidade do
 * arquivo vem do digest do asset `app-debug.apk`. A release é a mesma, mas
 * o APK pode ser substituído: o digest revela essa troca.
 */

const RELEASE_URL =
  "https://api.github.com/repos/LuquinhasAMC/BlackArts/releases/latest"

/** Identidade (digest) do APK que o app já conhece. */
const SEEN_KEY = "blackarts:apk-seen:v1"

/** Cache da resposta da API para não gastar o limite do GitHub. */
const CACHE_KEY = "blackarts:apk-release-cache:v1"
const CACHE_TTL_MS = 10 * 60 * 1000

interface ReleaseInfo {
  version: string | null
  identity: string | null
}

interface CacheEntry extends ReleaseInfo {
  checkedAt: number
}

/** "v2.0.1" / "2.0.1 (beta)" → [2, 0, 1]. */
function parseVersion(value: string): number[] | null {
  const match = value.match(/(\d+(?:\.\d+)*)/)
  if (!match) return null
  return match[1].split(".").map((part) => Number(part))
}

/** Compara versões numéricas: 2.1.0 é mais nova que 2.0.9. */
export function isNewerVersion(latest: string, current: string): boolean {
  const next = parseVersion(latest)
  const installed = parseVersion(current)
  if (!next || !installed) return false

  const length = Math.max(next.length, installed.length)
  for (let index = 0; index < length; index += 1) {
    const left = next[index] ?? 0
    const right = installed[index] ?? 0
    if (left !== right) return left > right
  }
  return false
}

async function fetchRelease(signal?: AbortSignal): Promise<ReleaseInfo | null> {
  const cached = readStorage<CacheEntry | null>(CACHE_KEY, null)
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return { version: cached.version, identity: cached.identity }
  }

  try {
    const response = await fetch(RELEASE_URL, {
      signal,
      headers: { Accept: "application/vnd.github+json" },
    })
    if (!response.ok) {
      return cached ? { version: cached.version, identity: cached.identity } : null
    }

    const release = (await response.json()) as {
      tag_name?: unknown
      name?: unknown
      assets?: {
        name?: unknown
        id?: unknown
        updated_at?: unknown
        digest?: unknown
      }[]
    }

    const candidates = [release.name, release.tag_name].filter(
      (value): value is string => typeof value === "string"
    )
    const version =
      candidates.find((value) => parseVersion(value) !== null) ?? null

    const apk = (release.assets ?? []).find(
      (asset) =>
        typeof asset.name === "string" && asset.name.toLowerCase().endsWith(".apk")
    )
    const identity = apk
      ? typeof apk.digest === "string" && apk.digest.length > 0
        ? apk.digest
        : `${String(apk.id ?? apk.name)}:${String(apk.updated_at ?? "")}`
      : null

    writeStorage<CacheEntry>(CACHE_KEY, {
      version,
      identity,
      checkedAt: Date.now(),
    })
    return { version, identity }
  } catch {
    return cached ? { version: cached.version, identity: cached.identity } : null
  }
}

export interface AppUpdate {
  /** Há uma versão nova do APK para instalar. */
  available: boolean
  /** Versão publicada na release, quando o nome permite ler. */
  version: string | null
  apkUrl: string
  /** Marca o APK atual como conhecido (chamado ao tocar em atualizar). */
  markSeen: () => void
}

/**
 * Só verifica no app nativo. A primeira verificação apenas guarda a
 * referência do APK; depois disso, um digest diferente ou um número de
 * versão maior libera o botão de atualização.
 */
export function useAppUpdate({ enabled }: { enabled: boolean }): AppUpdate {
  const [latest, setLatest] = useState<ReleaseInfo | null>(null)
  const [seen, setSeen] = useState<string | null>(() =>
    readStorage<string | null>(SEEN_KEY, null)
  )

  useEffect(() => {
    if (!enabled || !isNative) return

    const controller = new AbortController()
    void fetchRelease(controller.signal).then((release) => {
      if (!release) return
      setLatest(release)

      if (!release.identity) return
      const stored = readStorage<string | null>(SEEN_KEY, null)
      if (stored === null) {
        // Instalação sem referência: adota o APK atual sem avisar.
        writeStorage(SEEN_KEY, release.identity)
        setSeen(release.identity)
      } else {
        setSeen(stored)
      }
    })

    return () => controller.abort()
  }, [enabled])

  const markSeen = useCallback(() => {
    if (!latest?.identity) return
    writeStorage(SEEN_KEY, latest.identity)
    setSeen(latest.identity)
  }, [latest])

  const apkChanged = Boolean(
    latest?.identity && seen && latest.identity !== seen
  )
  const versionNewer = Boolean(
    latest?.version && isNewerVersion(latest.version, __APP_VERSION__)
  )

  return {
    available:
      isNative && enabled && Boolean(latest) && (apkChanged || versionNewer),
    version: latest?.version ?? null,
    apkUrl: PROJECT_LINKS.androidApk,
    markSeen,
  }
}
