/**
 * Barra de rolagem discreta: a classe `is-scrolling` no `<html>` é ligada
 * enquanto algo rola e desligada logo depois — o CSS usa isso para revelar
 * a barra só durante a rolagem (o hover sobre a barra é tratado no CSS).
 * A captura no document alcança também os contêineres com rolagem própria
 * (listas, galerias, documento).
 */
export function autoHideScrollbar(): () => void {
  const root = document.documentElement
  let timer = 0

  const onScroll = () => {
    root.classList.add("is-scrolling")
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      root.classList.remove("is-scrolling")
    }, 700)
  }

  document.addEventListener("scroll", onScroll, {
    passive: true,
    capture: true,
  })

  return () => {
    document.removeEventListener("scroll", onScroll, { capture: true })
    window.clearTimeout(timer)
    root.classList.remove("is-scrolling")
  }
}
