import type { CSSProperties } from "react"

/** Largura do desvanecimento nas laterais de uma faixa rolável (px). */
const EDGE_FADE = 20

/**
 * Máscara para as laterais de uma faixa horizontal: a miniatura que está
 * saindo da área visível desvanece em vez de ser cortada na régua.
 *
 * O lado que já chegou ao fim (sem conteúdo escondido) fica sólido — não há
 * nada para revelar ali, então a primeira/última miniatura aparece inteira.
 */
export function edgeFadeMask(
  start: boolean,
  end: boolean,
  size = EDGE_FADE
): CSSProperties {
  const gradient =
    `linear-gradient(to right, ${start ? "black" : "transparent"}, ` +
    `black ${size}px, black calc(100% - ${size}px), ` +
    `${end ? "black" : "transparent"})`
  return { maskImage: gradient, WebkitMaskImage: gradient }
}
