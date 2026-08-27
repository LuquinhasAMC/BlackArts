import * as React from "react"

// O app é exclusivamente em modo escuro: não existe mais alternância de
// tema. O provider apenas garante que a classe `.dark` esteja no <html>.
type Theme = "dark"

type ThemeProviderProps = {
  children: React.ReactNode
}

type ThemeProviderState = {
  theme: Theme
}

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Garante o modo escuro mesmo se o script inline do index.html não
  // tiver rodado (ex.: montagem via outro entry point).
  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light")
    root.classList.add("dark")
  }, [])

  const value = React.useMemo(() => ({ theme: "dark" as Theme }), [])

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
