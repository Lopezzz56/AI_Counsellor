'use client'
import { useEffect, useRef, useState } from 'react'
import { m, motion } from 'framer-motion'
import { UserProfile } from '@/types/profile'
import { Send, Sparkles, User, Bot, Mic, MicOff } from 'lucide-react'
import { RecommendedUniversity } from '@/types/profile'
import React from 'react'
import { toast } from 'sonner'
import { UniversityCard } from '@/components/university-card'

export default function CounsellorChatInterface({ initialProfile }: { initialProfile: UserProfile }) {
    // Manual state management (same pattern as onboarding after debugging)
    const [messages, setMessages] = useState<Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        toolInvocations?: Array<{
            toolCallId?: string;
            toolName?: string;
            input?: any;
            output?: any;
        }>;
    }>>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I’m your AI Counsellor. 

Here’s what I can help you with:
• Analyze your profile strengths & gaps
• Recommend universities
• Compare Shortlisted universities fits and risks

You can start by asking:
“Analyze my profile” or “Recommend universities”
`
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState<any>(null)
    const [recommendedUnis, setRecommendedUnis] = useState<RecommendedUniversity[]>([])
    const [showRecommendations, setShowRecommendations] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [lockedUniversities, setLockedUniversities] = useState<any[]>([])

    const fetchLocks = async () => {
        try {
            const res = await fetch('/api/universities/lock')
            if (res.ok) {
                const json = await res.json()
                setLockedUniversities(json.locks || [])
            }
        } catch (e) { console.error(e) }
    }

    // Initial fetch and event listener
    useEffect(() => {
        fetchLocks()
        window.addEventListener('university-lock-changed', fetchLocks)
        return () => window.removeEventListener('university-lock-changed', fetchLocks)
    }, [])




    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
            const recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = false
            recognitionInstance.interimResults = false
            recognitionInstance.lang = 'en-US'
            recognitionInstance.maxAlternatives = 1
            recognitionInstance.onstart = () => {
                console.log('🎤 [Voice] Mic is active, speak now...')
            }
            recognitionInstance.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                console.log('🎤 [Voice] Transcript received:', transcript)
                setIsListening(false)
                // Automatically send the transcribed message
                console.log('🎤 [Voice] Scheduling sendMessage...')
                setTimeout(() => {
                    console.log('🎤 [Voice] Calling sendMessage with:', transcript)
                    sendMessage(transcript)
                }, 100)
            }

            recognitionInstance.onerror = (event: any) => {
                console.error('🎤 [Voice] Error:', event.error)

                if (event.error === 'no-speech') {
                    setMessages((m) => [
                        ...m,
                        {
                            id: `assistant-voice-${Date.now()}`,
                            role: 'assistant',
                            content: 'I didn’t catch that. Please speak clearly after tapping the mic 🎤',
                        },
                    ])
                }

                setIsListening(false)
            }


            recognitionInstance.onend = () => {
                console.log('🎤 [Voice] Recognition ended')
                setIsListening(false)
            }

            setRecognition(recognitionInstance)
        }
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const toggleListening = () => {
        if (!recognition) return

        if (isListening) {
            recognition.stop()
            setIsListening(false)
        } else {
            setInput('')
            setIsListening(true)

            // ⏱️ Delay start slightly
            setTimeout(() => {
                try {
                    recognition.start()
                } catch (e) {
                    console.error('🎤 start failed', e)
                }
            }, 300)
        }
    }

    // Extracted message sending logic
    const sendMessage = async (messageText: string) => {
        console.log('📤 [SendMessage] Called with:', messageText)
        console.log('📤 [SendMessage] isLoading:', isLoading)
        console.log('📤 [SendMessage] trimmed:', messageText.trim())

        if (!messageText.trim() || isLoading) {
            console.warn('📤 [SendMessage] Aborted - empty or loading')
            return
        }

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user' as const,
            content: messageText,
        }

        setInput('')
        setMessages((m) => [...m, userMessage])
        setIsLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    data: {
                        mode: 'counsellor',
                        profile: initialProfile,
                    },
                }),
            })

            const json = await res.json()

            const hasText = typeof json.assistantText === 'string'
            const hasTools = Array.isArray(json.toolInvocations) && json.toolInvocations.length > 0

            if (hasText || hasTools) {
                setMessages((m) => [
                    ...m,
                    {
                        id: `assistant-${Date.now()}`,
                        role: 'assistant',
                        content: json.assistantText || '',
                        toolInvocations: json.toolInvocations || [],
                    },
                ])

                // Handle tool toasts (Imperative UI effect)
                if (json.toolInvocations) {
                    json.toolInvocations.forEach((t: any) => {
                        if (t.toolName === 'add_task' && t.output) {
                            // Extract pretty name
                            // output format: "Task created: <University Name> — <Task Title>"
                            const match = t.output.match(/Task created: (.+?) — (.+)/)
                            const title = match ? match[2] : t.input.task_title

                            toast.success('Task Added', {
                                description: title
                            })
                        }
                    })
                }
            } else {
                setMessages((m) => [
                    ...m,
                    {
                        id: `assistant-error-${Date.now()}`,
                        role: 'assistant',
                        content: '⚠️ Something went wrong. Please try again.',
                    },
                ])
            }
        } catch (err) {
            setMessages((m) => [
                ...m,
                {
                    id: `assistant-network-${Date.now()}`,
                    role: 'assistant' as const,
                    content: '🚫 Network or server error. Please retry.',
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await sendMessage(input)
    }

    // const fetchRecommendations = async () => {
    //     const res = await fetch('/api/universities/recommend', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ profile: initialProfile }),
    //     })

    //     const json = await res.json()
    //     setRecommendedUnis(json.universities)
    //     setShowRecommendations(true)
    // }


    return (
        <div className="h-full w-full p-4 md:p-6 flex flex-col box-border overflow-hidden">
            <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5 text-foreground font-sans rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-primary/20">
                {/* Header */}
                <header className="py-4 px-6 bg-background/40 backdrop-blur-xl border-b border-primary/10 flex items-center justify-between sticky top-0 z-10 shadow-lg shadow-primary/5">
                    <div className="flex items-center gap-2 font-semibold">

                        <span className="text-l font-bold text-primary flex items-center gap-3">AI Counsellor Chat</span>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full backdrop-blur-sm border border-primary/10">
                        {initialProfile.study_goal?.intended_degree} in {initialProfile.study_goal?.field_of_study}
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
                    {messages.map((m) => (
                        <React.Fragment key={m.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 shrink-0">
                                    {m.role === 'user' ? <User /> : <Bot />}
                                </div>

                                {/* Bubble */}
                                <div className="max-w-[75%] rounded-3xl px-5 py-3.5 bg-muted/60">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {m.role === 'assistant' ? (
                                            // Simple Markdown Parser
                                            m.content.split('\n').map((line, i) => {
                                                // Header-ish (Bold line)
                                                if (line.match(/^\*\*.+\*\*$/) || line.startsWith('###')) {
                                                    return <p key={i} className="font-bold text-base mt-3 mb-1">{line.replace(/\*\*/g, '').replace(/^### /, '')}</p>
                                                }
                                                // Bullet point
                                                if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                                                    const content = line.trim().substring(2);
                                                    // Handle bolding within bullet
                                                    const parts = content.split(/(\*\*.*?\*\*)/g);
                                                    return (
                                                        <div key={i} className="flex gap-2 ml-1 my-1">
                                                            <span className="text-primary mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                                            <p className="flex-1">
                                                                {parts.map((p, j) => {
                                                                    if (p.startsWith('**') && p.endsWith('**')) {
                                                                        return <strong key={j} className="text-foreground">{p.slice(2, -2)}</strong>
                                                                    }
                                                                    return p;
                                                                })}
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                                // Regular paragraph with potential bolding
                                                const parts = line.split(/(\*\*.*?\*\*)/g);
                                                return (
                                                    <p key={i} className={line.trim() === '' ? 'h-2' : 'mb-1'}>
                                                        {parts.map((p, j) => {
                                                            if (p.startsWith('**') && p.endsWith('**')) {
                                                                return <strong key={j}>{p.slice(2, -2)}</strong>
                                                            }
                                                            return p;
                                                        })}
                                                    </p>
                                                )
                                            })
                                        ) : (
                                            <p>{m.content}</p>
                                        )}
                                    </div>

                                    {/* SMALL tool status */}
                                    {m.toolInvocations?.map((t, idx) => {
                                        if (!Array.isArray(t.output)) return null
                                        return (
                                            <div
                                                key={`${m.id}-status-${idx}`}
                                                className="mt-2 text-xs text-green-500 flex items-center gap-1"
                                            >
                                                ✓ Found {t.output.length} universities
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>

                            {m.toolInvocations
                                ?.filter(t => t.toolName === 'recommend_universities' && Array.isArray(t.output))
                                .map((t, idx) => (
                                    <motion.div
                                        key={`${m.id}-recommendations-${idx}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: 0.2 }}
                                        className="mt-6 w-full"
                                    >
                                        {/* Section Header */}
                                        <div className="mb-4 flex items-center gap-2 justify-between">
                                            <div className="flex items-center gap-2 flex-1">
                                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                                <span className="text-xs font-medium text-primary/80 px-3 py-1 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
                                                    🎓 Recommended Universities
                                                </span>
                                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    const unis = t.output;
                                                    if (!Array.isArray(unis)) return;

                                                    toast.loading(`Shortlisting ${unis.length} universities...`)
                                                    let successCount = 0;

                                                    await Promise.all(unis.map(async (u: any) => {
                                                        try {
                                                            const res = await fetch('/api/universities/lock', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    university_id: u.university_id,
                                                                    action: 'shortlist'
                                                                })
                                                            })
                                                            if (res.ok) successCount++;
                                                        } catch (e) { console.error(e) }
                                                    }))

                                                    toast.dismiss()
                                                    toast.success(`Shortlisted ${successCount} universities`)
                                                    fetchLocks() // Refresh status
                                                    window.dispatchEvent(new Event('university-lock-changed'))
                                                }}
                                                className="text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                                            >
                                                Shortlist All
                                            </button>
                                        </div>

                                        {/* Horizontal Scroll Container */}
                                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50 -mx-2 px-2">
                                            {t.output.map((u: any) => {
                                                const lockStatus = lockedUniversities.find(l => l.university_id === u.university_id)?.status

                                                // Clone to avoid mutating original tool output permanently if that matters, 
                                                // but for UI it's fine. 
                                                // We construct the object expected by UniversityCard

                                                const uniWithStatus = {
                                                    ...u,
                                                    status: lockStatus || undefined
                                                }

                                                return (
                                                    <UniversityCard
                                                        key={`uni-${u.university_id}`}
                                                        university={uniWithStatus}
                                                        onLockToggle={fetchLocks}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                ))
                            }
                        </React.Fragment>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20 border border-green-500/20">
                                <Sparkles className="w-4 h-4 text-green-600 animate-pulse" />
                            </div>
                            <div className="bg-muted/60 text-foreground rounded-3xl rounded-tl-md px-5 py-3.5 flex gap-1.5 items-center shadow-lg shadow-black/5 border border-primary/5">
                                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm ">
                    <form
                        onSubmit={handleSubmit}
                        className="relative flex items-center gap-2"
                    >
                        <input
                            className="w-full bg-background/80 backdrop-blur-md border border-primary/20 rounded-full pl-5 pr-24 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-background shadow-xl shadow-black/10 transition-all placeholder:text-muted-foreground/50"
                            placeholder="Ask for advice, universities, or next steps..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            title={isListening ? "Stop recording" : "Start voice input"}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div></div>
    )


}
