import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import "../../globals.css"

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}