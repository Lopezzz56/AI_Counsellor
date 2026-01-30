'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GraduationCap, Lock, Unlock, MapPin, ChevronDown, Check, Sparkles, FileText, CheckCircle2, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUniversityLocks } from '@/app/hooks/useUniversityLocks'
import { toast } from 'sonner'

interface LockedUniversity {
    university_id: string
    name: string
    country: string
}

interface Task {
    id: string
    title: string
    description: string
    status: 'pending' | 'completed'
    category: string
    university_id: string
}

export default function ApplicationGuidance() {
    const { lockedUniversityIds, hasLockedUniversities, isLoading: locksLoading } = useUniversityLocks()
    const [lockedUniversities, setLockedUniversities] = useState<LockedUniversity[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [expandedUni, setExpandedUni] = useState<string | null>(null)

    useEffect(() => {
        if (lockedUniversityIds.length > 0) {
            fetchData()
        } else {
            setLockedUniversities([])
            setTasks([])
        }
    }, [lockedUniversityIds])

    const fetchData = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || lockedUniversityIds.length === 0) return

        // Fetch university details
        const { data: universities } = await supabase
            .from('universities')
            .select('university_id, name, country')
            .in('university_id', lockedUniversityIds)

        setLockedUniversities(universities || [])

        // Fetch ONLY AI-generated tasks for locked universities
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('ai_generated', true)  // Only show AI-generated tasks
            .in('university_id', lockedUniversityIds)
            .order('created_at', { ascending: false })

        setTasks(tasksData || [])
    }

    const unlockUniversity = async (universityId: string, universityName: string) => {
        const confirmed = confirm(
            `Are you sure you want to unlock "${universityName}"?\n\nThis will remove all AI-generated tasks for this university.`
        )

        if (!confirmed) return

        await fetch('/api/universities/lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                university_id: universityId,
                action: 'unlock',
            }),
        })

        // Trigger event to refresh locks
        window.dispatchEvent(new Event('university-lock-changed'))
    }

    const toggleTask = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))

        const supabase = createClient()
        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId)

        if (error) {
            // Revert on error
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus as any } : t))
        }
    }

    const getTasksByCategory = (universityId: string) => {
        const uniTasks = tasks.filter(t => t.university_id === universityId)
        return {
            documentation: uniTasks.filter(t => t.category === 'documentation'),
            application: uniTasks.filter(t => t.category === 'application'),
            test_prep: uniTasks.filter(t => t.category === 'test_prep'),
            research: uniTasks.filter(t => t.category === 'research'),
        }
    }

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'documentation': return <FileText className="w-4 h-4" />
            case 'application': return <GraduationCap className="w-4 h-4" />
            case 'test_prep': return <CheckCircle2 className="w-4 h-4" />
            case 'research': return <Calendar className="w-4 h-4" />
            default: return <FileText className="w-4 h-4" />
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'documentation': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'application': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
            case 'test_prep': return 'bg-green-500/10 text-green-600 border-green-500/20'
            case 'research': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
            default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
        }
    }

    if (locksLoading) {
        return (
            <div className="bg-card rounded-xl p-6 shadow-md">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
            </div>
        )
    }

    if (!hasLockedUniversities) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] border border-primary/10 shadow-2xl shadow-primary/5">
                <div className="relative mb-6">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl"
                    />
                    <div className="relative w-20 h-20 bg-background border border-primary/20 rounded-3xl flex items-center justify-center shadow-xl rotate-3">
                        <Lock className="w-10 h-10 text-primary" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">Guidance Locked</h3>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Lock a university in the <span className="text-primary font-semibold">AI Chat</span> to unlock your personalized application timeline, document checklist, and automated tasks.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <header className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] p-8 border border-primary/10 shadow-2xl shadow-primary/5">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-primary/10 p-2.5 rounded-xl text-primary border border-primary/20">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight">Application Guidance</h2>
                        </div>
                        <p className="text-muted-foreground">
                            You are tracking <span className="text-primary font-bold">{lockedUniversityIds.length}</span> {lockedUniversityIds.length === 1 ? 'university' : 'universities'}.
                        </p>
                    </div>

                </div>
            </header>

            {/* University List */}
            <div className="space-y-6">
                {lockedUniversities.map((uni) => {
                    const tasksByCategory = getTasksByCategory(uni.university_id)
                    const isExpanded = expandedUni === uni.university_id
                    const totalTasks = tasks.filter(t => t.university_id === uni.university_id).length
                    const completedTasks = tasks.filter(t => t.university_id === uni.university_id && t.status === 'completed').length
                    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

                    return (
                        <motion.div
                            key={uni.university_id}
                            layout
                            className="group bg-card rounded-[2rem] shadow-xl border border-primary/10 overflow-hidden transition-all hover:shadow-primary/5"
                        >
                            {/* University Header Section */}
                            <div className="p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">

                                        <div>
                                            <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{uni.name}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {uni.country}</span>
                                                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                                                <span className="text-primary/80 uppercase tracking-tighter text-[10px] font-bold">Fall 2026 Intake</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => unlockUniversity(uni.university_id, uni.name)}
                                            className="p-2.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                            title="Unlock University"
                                        >
                                            <Unlock className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Shared Progress Bar */}
                                <div className="mt-8 space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                                        <span>Application Readiness</span>
                                        <span className="text-primary">{Math.round(progress)}% Complete</span>
                                    </div>
                                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden border border-primary/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-gradient-to-r from-primary via-primary to-blue-400 shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Task Breakdown */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-primary/10 bg-muted/20 backdrop-blur-sm"
                                    >
                                        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* We iterate categories dynamically to save code */}
                                            {['documentation', 'test_prep', 'application', 'research'].map((cat) => {
                                                const catTasks = tasksByCategory[cat as keyof typeof tasksByCategory];
                                                if (!catTasks || catTasks.length === 0) return null;

                                                return (
                                                    <div key={cat} className="space-y-4">
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(cat)}`}>
                                                            {getCategoryIcon(cat)}
                                                            {cat.replace('_', ' ')}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {catTasks.map(task => (
                                                                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}


function TaskItem({ task, onToggle }: { task: Task; onToggle: (id: string, status: string) => void }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
            <button
                onClick={() => onToggle(task.id, task.status)}
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${task.status === 'completed'
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-input group-hover:border-primary'
                    }`}
            >
                {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
            </button>
            <div className="flex-1">
                <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                </p>
                {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                )}
            </div>
        </div>
    )
}
