// @ts-nocheck
'use client'

// import { useChat } from '@ai-sdk/react'
import { UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserProfile } from '@/types/profile'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, Sparkles, User, Bot, Mic, MicOff } from 'lucide-react'

export default function OnboardingChat({ initialProfile }: { initialProfile: UserProfile | null }) {
    const router = useRouter()

    // 2. Destructure available props. 
    // DEBUG: We found that input/handleInputChange/append are MISSING.
    // We found: messages, sendMessage, setMessages, status, etc.
    const [messages, setMessages] = useState<UIMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState<any>(null)

    // 3. Local state for input since hook didn't provide it
    const [inputValue, setInputValue] = useState('')

    // 4. Local state for current profile - updates after each successful response
    const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(initialProfile)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Detect completion
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant' && (
            lastMessage.content.includes('Dashboard unlocked') ||
            lastMessage.content.includes('Perfect! I have everything I need') ||
            lastMessage.content.includes('Setting up your dashboard')
        )) {
            setTimeout(() => {
                router.refresh();
                router.push('/dashboard');
            }, 2500); // Increased slightly to let user read the message
        }
    }, [messages, router]);

    useEffect(() => {
        console.log('[Client] Messages updated:', messages);
    }, [messages]);

    const toggleListening = () => {
        if (!recognition) {
            toast.error('Voice input not available', { description: 'Please use Chrome/Edge' })
            return
        }

        if (isListening) {
            recognition.stop()
            setIsListening(false)
        } else {
            setInputValue('')
            recognition.start()
            setIsListening(true)

            // Silence Detection Timeout
            // If no result is received within 4 seconds, we assume silence/error attempt and stop
            // NOTE: 'onresult' resets this if user speaks.
            // Simplified: Just auto-stop if max duration (handled by browser usually) or we simple manual timeout if needed.
            // But user asked for specific behavior: "stop if no voice heard for 3s". 
            // Web Speech API 'onspeechend' helps, but manual timeout on silence is tricky without analyzing audio stream raw data.
            // Best standard approach with SpeechRecognition:
            // It automatically stops on silence. We just handle the 'onend'.
        }
    }

    // Improved Silence/Auto-Stop Logic in useEffect
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
            const recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = false // Stops automatically after one sentence
            recognitionInstance.interimResults = true // We want to see if they are talking
            recognitionInstance.lang = 'en-US'

            let silenceTimer: NodeJS.Timeout

            recognitionInstance.onstart = () => {
                console.log('🎤 [Voice] Listening...')
            }

            recognitionInstance.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                setInputValue(transcript) // Show live text

                // Clear existing timer
                clearTimeout(silenceTimer)

                // Set new timer: if no new result for 2.5s, stop and send
                silenceTimer = setTimeout(() => {
                    console.log('🎤 [Voice] Silence detected. Stopping...')
                    recognitionInstance.stop()
                }, 2500)
            }

            recognitionInstance.onend = () => {
                setIsListening(false)
                clearTimeout(silenceTimer)

                // If we have text, send it
                setInputValue(prev => {
                    if (prev.trim().length > 1) {
                        sendMessage(prev)
                        return ''
                    }
                    return prev
                })
            }

            setRecognition(recognitionInstance)
        }
    }, [])

    const VoiceWaves = () => (
        <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-full h-full rounded-full bg-red-500/30"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "easeOut",
                    }}
                />
            ))}
        </div>
    );

    // Helper for unique IDs
    const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extracted message sending logic
    const sendMessage = async (messageText: string) => {
        console.log('📤 [SendMessage] Called with:', messageText)
        console.log('📤 [SendMessage] trimmed:', messageText.trim())

        if (!messageText.trim()) {
            console.warn('📤 [SendMessage] Aborted - empty message')
            return
        }

        const userMessage: UIMessage = {
            id: generateId('user'),
            role: 'user',
            content: messageText,
        }

        setInputValue('')
        setMessages((m) => [...m, userMessage])
        setIsLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    data: {
                        mode: 'onboarding',
                        profile: currentProfile, // Use current profile instead of initialProfile
                    },
                }),
            })

            const json = await res.json()

            if (json?.assistantText) {
                setMessages((m) => [
                    ...m,
                    {
                        id: generateId('assistant'),
                        role: 'assistant',
                        content: json.assistantText,
                        metadata: json.error
                            ? { error: true, errorType: json.errorType }
                            : undefined,
                    },
                ])

                // Update current profile if server sent updated profile data
                if (json?.updatedProfile) {
                    console.log('[Client] Updating profile with server data:', json.updatedProfile);
                    setCurrentProfile(json.updatedProfile);
                }
            } else {
                setMessages((m) => [
                    ...m,
                    {
                        id: `assistant - error - ${Date.now()} `,
                        role: 'assistant',
                        content: '⚠️ Something went wrong. Please try again.',
                        metadata: { error: true },
                    },
                ])
            }
        } catch (err) {
            setMessages((m) => [
                ...m,
                {
                    id: generateId('assistant-network'),
                    role: 'assistant',
                    content: '🚫 Network or server error. Please retry.',
                    metadata: { error: true },
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    // Custom submit handler using sendMessage
    const onSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        await sendMessage(inputValue)
    }


    // Handle Start using sendMessage
    // assume chatHelpers is useChat() result and has setMessages
    // client: chat component

    // helper to append assistant + tool invocations
    function appendAssistantAndTools(setMessages, assistantText, toolInvocations) {
        setMessages((cur) => {
            const next = [...cur];
            next.push({
                id: `assistant - ${Date.now()} `,
                role: 'assistant',
                content: assistantText,
                toolInvocations: toolInvocations.map((t) => ({
                    toolCallId: t.toolCallId,
                    toolName: t.toolName,
                    result: t.output ?? null,
                    input: t.input ?? null,
                })),
            });
            return next;
        });
    }

    // When you call the API (debug mode), do:
    const handleStart = async () => {
        const userMessage: UIMessage = {
            id: generateId('user-start'),
            role: 'user',
            content: 'Hi, I am ready to start.',
        }

        setMessages([userMessage])
        setIsLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [userMessage],
                    data: {
                        mode: 'onboarding',
                        profile: currentProfile,
                    },
                }),
            })

            const json = await res.json()

            if (json?.assistantText) {
                setMessages((m) => [
                    ...m,
                    {
                        id: generateId('assistant-start'),
                        role: 'assistant',
                        content: json.assistantText,
                    },
                ])

                // Update current profile if server sent updated profile data
                if (json?.updatedProfile) {
                    console.log('[Client] Updating profile with server data:', json.updatedProfile);
                    setCurrentProfile(json.updatedProfile);
                }
            }
        } catch {
            setMessages((m) => [
                ...m,
                {
                    id: generateId('assistant-error'),
                    role: 'assistant',
                    content: '⚠️ Unable to start onboarding right now.',
                    metadata: { error: true },
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }


    function TypingIndicator() {
        return (
            <div className="flex justify-start">
                <div className="bg-muted/30 text-foreground rounded-2xl rounded-tl-sm px-6 py-4 flex gap-1 items-center shadow-sm">
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        )
    }


    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-primary/5 text-foreground font-sans">
            <header className="py-5 bg-background/40 backdrop-blur-xl border-b border-primary/10 sticky top-0 z-10 shadow-lg shadow-primary/5">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <h1 className="text-sm font-semibold tracking-wide uppercase bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        AI Counsellor Onboarding
                    </h1>
                </div>
            </header>

            <div className="flex-1 w-full max-w-3xl mx-auto px-4 overflow-y-auto scrollbar-hide pt-8 pb-32">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-6 animate-in fade-in zoom-in duration-700">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/20 shadow-xl shadow-primary/20">
                                <Sparkles className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Welcome!</h2>
                            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                                I'm your AI education counsellor. I'll help you build your profile to find your best university matches.
                            </p>
                        </div>
                        <button
                            onClick={handleStart}
                            className="group relative bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-10 py-4 rounded-full font-medium hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 flex items-center gap-2 overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                            <span className="relative">Start Interview</span>
                            <Send className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    {messages.filter((m: any) => m.role !== 'system').map((m: any, i: number) => (
                        (m.role === 'user' && m.content === 'Start the onboarding conversation.') ? null :
                            <motion.div
                                key={m.id || i}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} `}
                            >
                                <div
                                    className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-6 py-4 text-md leading-relaxed backdrop-blur-md ${m.role === 'user'
                                        ? 'bg-gradient-to-br from-primary/90 to-primary text-primary-foreground ml-12 rounded-tr-md shadow-lg shadow-primary/20'
                                        : 'bg-muted/60 text-foreground mr-12 rounded-tl-md shadow-lg shadow-black/5 border border-primary/5 whitespace-pre-line'
                                        } `}
                                >
                                    <p className={m.metadata?.error ? 'text-red-500 italic' : ''}> {m.content} </p>


                                    {m.toolInvocations?.map((toolInvocation: any) => {
                                        const toolCallId = toolInvocation.toolCallId;
                                        if ('result' in toolInvocation) {
                                            return (
                                                <div key={toolCallId} className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium border-t border-white/10 pt-3 flex items-center gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] shadow-sm">✓</span>
                                                    <span>{toolInvocation.result}</span>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div key={toolCallId} className="mt-3 flex items-center gap-2 text-xs text-primary animate-pulse">
                                                <span className="w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                                                Updating profile...
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                    ))}

                    {isLoading && <TypingIndicator />}

                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm pb-8 pt-12 px-4">
                <form
                    onSubmit={onSubmit}
                    className="max-w-3xl mx-auto relative flex items-center"
                >
                    {isListening && (
                        <div className="absolute left-14 bottom-1 flex items-end gap-0.5 h-4 pointer-events-none">
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-0.5 bg-primary/40 rounded-full"
                                    animate={{ height: [4, 12, 4] }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    <input
                        className="w-full bg-background/80 backdrop-blur-md border border-primary/20 rounded-full pl-6 pr-24 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-black/50 focus:bg-background shadow-xl shadow-black/10 transition-all placeholder:text-muted-foreground/50"
                        placeholder="Type your answer..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        autoFocus
                    />
                    <div className="absolute right-16 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10">
                        <AnimatePresence>
                            {isListening && <VoiceWaves />}
                        </AnimatePresence>

                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`relative z-10 p-2.5 rounded-xl transition-all duration-500 ${isListening
                                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110'
                                : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10'
                                }`}
                            title={isListening ? "Stop recording" : "Start voice input"}
                        >
                            <motion.div
                                animate={isListening ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1 }}
                            >
                                {isListening ? (
                                    <MicOff className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                    <Mic className="w-4 h-4 stroke-[2.5]" />
                                )}
                            </motion.div>

                            {/* Small active dot indicator */}
                            {isListening && (
                                <motion.span
                                    layoutId="activeDot"
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-red-500 rounded-full z-20"
                                />
                            )}
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 disabled:hover:scale-100 disabled:opacity-40 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    )
}
