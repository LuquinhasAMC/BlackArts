/**
 * Sanitização e formatação de HTML vindo da API do Internet Archive.
 *
 * As descrições/metadados do IA são HTML (ex.: `<div>`, `<span>`, `<b>`,
 * `<i>`, `<a>`, `<br>`). Em vez de exibir as tags como texto puro, fazemos
 * parse com DOMParser e removemos tudo que possa executar código ou
 * quebrar o layout (scripts, iframes, estilos, atributos `on*`, links
 * `javascript:`), devolvendo HTML seguro para `dangerouslySetInnerHTML`.
 */

const DANGEROUS_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "link",
  "meta",
  "base",
  "noscript",
])

/** Remove atributos perigosos (handlers de evento, javascript: URLs…). */
function stripDangerousAttributes(node: Element): void {
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase()
    const value = attr.value.trim().toLowerCase()
    if (name.startsWith("on")) {
      node.removeAttribute(attr.name)
    } else if (
      (name === "href" || name === "src" || name === "action") &&
      (value.startsWith("javascript:") ||
        value.startsWith("vbscript:") ||
        value.startsWith("data:"))
    ) {
      node.removeAttribute(attr.name)
    }
  }
}

/**
 * Sanitiza um HTML retornado pelo Internet Archive: remove tags e
 * atributos perigosos e devolve o HTML limpo para renderização.
 * Se o texto não contiver tags HTML, devolve-o com quebras de linha
 * preservadas (seguro para `dangerouslySetInnerHTML`).
 */
export function sanitizeHtml(input: string | undefined | null): string {
  if (!input) {
    return ""
  }

  if (!/<[a-z][\s\S]*>/i.test(input)) {
    // Texto puro: preserva quebras de linha como <br>.
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")
  }

  const doc = new DOMParser().parseFromString(input, "text/html")

  // Remove tags perigosas (mantendo o conteúdo de texto onde fizer
  // sentido, ex.: <noscript>).
  doc.querySelectorAll([...DANGEROUS_TAGS].join(",")).forEach((node) => {
    node.remove()
  })

  // Remove atributos perigosos de todos os elementos restantes.
  doc.querySelectorAll("*").forEach(stripDangerousAttributes)

  // Garante que links abram em nova aba com segurança.
  doc.querySelectorAll("a").forEach((anchor) => {
    anchor.setAttribute("target", "_blank")
    anchor.setAttribute("rel", "noreferrer")
  })

  return doc.body.innerHTML
}
