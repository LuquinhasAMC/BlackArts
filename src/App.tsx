import { useEffect } from "react"

import { AppProviders } from "@/app/providers"
import { AppRouter } from "@/app/router"
import { autoHideScrollbar } from "@/lib/scrollbar"

export function App() {
  // Barra de rolagem só enquanto algo rola (ou sob o ponteiro).
  useEffect(() => autoHideScrollbar(), [])

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
