import { ArrowUpCircle } from "lucide-react"
import { useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAppUpdate } from "@/hooks/use-app-update"

/**
 * Botão "Atualizar app" na top bar da tela inicial.
 *
 * Aparece apenas no app nativo, quando a release mais recente tem um APK
 * diferente do instalado (ou uma versão maior). O toque baixa o APK; o
 * Android se encarrega de instalar por cima do app atual.
 */
export function UpdateAppButton() {
  const { pathname } = useLocation()
  const { available, version, apkUrl, markSeen } = useAppUpdate({
    enabled: pathname === "/",
  })

  if (!available) return null

  return (
    <Button
      asChild
      size="sm"
      onClick={markSeen}
      title={
        version
          ? `Nova versão ${version} do app disponível`
          : "Nova versão do app disponível"
      }
    >
      <a href={apkUrl} target="_blank" rel="noreferrer">
        <ArrowUpCircle aria-hidden />
        Atualizar app
      </a>
    </Button>
  )
}
