import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.blackarts.app",
  appName: "BlackArts",
  webDir: "dist",
  plugins: {
    SystemBars: {
      // App 100% escuro: ícones claros na status bar e na navigation bar.
      style: "LIGHT",
    },
  },
}

export default config
