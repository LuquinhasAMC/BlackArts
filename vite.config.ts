import { readFileSync } from "node:fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Versão do app (package.json), injetada em tempo de build.
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Escuta em todas as interfaces de rede, permitindo abrir o dev
    // server de outros dispositivos (celular, tablet) na mesma rede
    // via o IP da máquina, ex.: http://192.168.0.10:5173
    host: true,
    // Aceita acesso por qualquer host/IP da rede local.
    allowedHosts: true,
  },
})
