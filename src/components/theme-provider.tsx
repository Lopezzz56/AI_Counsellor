"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider 
            attribute="class"    // This is the critical missing line
            defaultTheme="system" // Optional: starts with system theme
            enableSystem         // Optional: allows laptop to override
            {...props}
        >
            {children}
        </NextThemesProvider>
    )
}