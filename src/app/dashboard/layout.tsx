'use client'

import Link from 'next/link'
import { signout } from '@/app/auth/actions'
import { LayoutDashboard, GraduationCap, CheckSquare, MessageSquare, LogOut, User } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { useUniversityLocks } from '@/app/hooks/useUniversityLocks'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { hasLockedUniversities } = useUniversityLocks()
    const pathname = usePathname()

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 bg-card/50 backdrop-blur-xl shadow-xl z-20 hidden md:flex flex-col p-6 m-4 my-6 rounded-2xl h-[calc(100vh-3rem)] sticky top-6">
                <div className="mb-10 px-2">
                    <h1 className="text-xl font-bold text-primary flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        AI Counsellor
                    </h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <Link
                        href="/dashboard"
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all group ${pathname === '/dashboard' ? 'bg-muted/50 text-primary' : ''
                            }`}
                    >
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        Dashboard
                    </Link>

                    {hasLockedUniversities ? (
                        <Link
                            href="/dashboard/tasks"
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all group ${pathname === '/dashboard/tasks' ? 'bg-muted/50 text-primary' : ''
                                }`}
                        >
                            <CheckSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            Tasks
                        </Link>
                    ) : (
                        <div className="px-4 py-3 text-sm font-medium text-muted-foreground flex items-center gap-3 opacity-50 cursor-not-allowed relative group">
                            <CheckSquare className="h-5 w-5" />
                            Tasks
                            <div className="absolute left-0 top-full mt-2 w-48 bg-popover text-popover-foreground text-xs p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border">
                                🔒 Lock a university to unlock tasks
                            </div>
                        </div>
                    )}

                    <Link
                        href="/dashboard/counsellor"
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all group ${pathname === '/dashboard/counsellor' ? 'bg-muted/50 text-primary' : ''
                            }`}
                    >
                        <MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        AI Counsellor
                    </Link>
                </nav>

                <div className="border-t border-border/50 pt-6 space-y-2">
                    <Link
                        href="/dashboard/profile"
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground w-full hover:bg-muted/50 rounded-xl transition-all ${pathname === '/dashboard/profile' ? 'bg-muted/50 text-primary' : ''
                            }`}
                    >
                        <User className="h-5 w-5" />
                        Profile
                    </Link>

                    <div className="px-2">
                        <ModeToggle />
                    </div>

                    <form action={signout}>
                        <button className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground w-full hover:bg-muted/50 rounded-xl transition-all">
                            <LogOut className="h-5 w-5" />
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
