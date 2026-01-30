"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="p-2 rounded-md flex items-center gap-2 text-muted-foreground w-[100px] h-[36px]">
                <span className="text-sm font-medium">Theme</span>
            </div>
        )
    }

    return (
        <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground w-full"
            aria-label="Toggle theme"
        >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute left-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
            <span className="text-sm font-medium capitalize">{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
    )
}
