import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./styles/globals.css"
import App from "./App"
import { ThemeProvider } from "@/components/theme-provider"
import { setupNativeApp } from "@/lib/capacitor"

// Quando rodando nativo (Capacitor): trava orientação retrato (liberando
// no fullscreen do vídeo) e estiliza as barras do sistema.
setupNativeApp()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
