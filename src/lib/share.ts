/**
 * Compartilhamento de itens: usa a Web Share API quando disponível e
 * copia o link para a área de transferência como fallback.
 */

export interface SharePayload {
  title: string
  text: string
  url: string
}

/** URL pública de um item dentro do app. */
export function buildItemShareUrl(identifier: string): string {
  return `${window.location.origin}/item/${encodeURIComponent(identifier)}`
}

/** Copia texto para a área de transferência (com fallback legado). */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

/**
 * Compartilha um item. Retorna "shared" quando a Web Share API foi
 * usada, "copied" quando o link foi copiado e "cancelled" quando a
 * pessoa usuária cancelou a ação nativa.
 */
export async function shareItem(
  payload: SharePayload
): Promise<"shared" | "copied" | "cancelled"> {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      })
      return "shared"
    } catch (error) {
      // AbortError = usuário cancelou; não trata como erro.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled"
      }
      // Outros erros caem no fallback de copiar link.
    }
  }

  try {
    await copyToClipboard(payload.url)
    return "copied"
  } catch {
    throw new Error("Não foi possível copiar o link")
  }
}
