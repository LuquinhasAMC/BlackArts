/** Rodapé do app. */
export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full flex-col items-center gap-2 px-4 py-6 text-center sm:px-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <img
            src="/logo.jpeg"
            alt=""
            aria-hidden
            className="size-4 overflow-hidden rounded-md object-cover"
          />
          <span>
            Black
            <span className="text-amber-600 dark:text-amber-400">Arts</span>
          </span>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Museu digital da negritude — valorizando a memória, a arte e a cultura
          da diáspora africana. Conteúdos provenientes do acervo público do
          Internet Archive.
        </p>
      </div>
    </footer>
  )
}
