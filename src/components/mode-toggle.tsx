"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground w-full">
                <div className="h-5 w-5 rounded-md bg-muted animate-pulse" />
                <span>Theme</span>
            </div>
        )
    }

    const isDark = theme === 'dark'

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground w-full hover:bg-muted/50 rounded-xl transition-all group"
            aria-label="Toggle theme"
        >
            <div className="relative h-5 w-5 flex items-center justify-center overflow-hidden">
                {/* Sun Icon: Slides up when dark */}
                <Sun 
                    className={`h-5 w-5 transition-all duration-500 absolute ${
                        isDark ? "-translate-y-10 opacity-0" : "translate-y-0 opacity-100"
                    } group-hover:text-yellow-500`} 
                />
                {/* Moon Icon: Slides up from bottom when dark */}
                <Moon 
                    className={`h-5 w-5 transition-all duration-500 absolute ${
                        isDark ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                    } group-hover:text-blue-400`} 
                />
            </div>
            
            <span className="capitalize transition-all">
                {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
        </button>
    )
}