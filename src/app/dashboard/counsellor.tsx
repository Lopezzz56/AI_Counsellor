// @ts-nocheck
'use client'

import { useChat } from '@ai-sdk/react'
import { UIMessage } from 'ai'
import { useRef, useEffect } from 'react'
import { UserProfile } from '@/types/profile'
import { Send, GraduationCap } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardCounsellor({ profile }: { profile: UserProfile }) {
    const router = useRouter()
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat', // Use unified route
        body: {
            data: {
                mode: 'counsellor',
                profile
            }
        },
        onFinish: () => {
            // Refresh to show new tasks or stage updates
            router.refresh()
        }
    })

    const scrollRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-muted/50 p-4 border-b flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">AI Counsellor</h3>
                    <p className="text-xs text-muted-foreground">Online • Context Aware</p>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm mt-10">
                        <p>Hello! I've analyzed your profile.</p>
                        <p>Ask me for university recommendations or what to do next.</p>
                    </div>
                )}

                {messages.map((m: UIMessage) => (
                    <div
                        key={m.id}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                                }`}
                        >
                            {m.content}
                            {m.toolInvocations?.map((t: any) => (
                                <div key={t.toolCallId} className="opacity-70 text-xs mt-2 italic border-t border-white/10 pt-1">
                                    {t.toolName === 'add_task' ? 'Adding task...' : 'Updating...'}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted text-foreground rounded-lg px-4 py-3 text-sm">
                            ...
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-muted/20">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        className="flex-1 bg-background border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Ask for advice..."
                        value={input}
                        onChange={handleInputChange}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !(input || '').trim()}
                        className="bg-primary text-primary-foreground p-2 rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
