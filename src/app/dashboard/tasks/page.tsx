'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GraduationCap, FileText, Calendar, CheckCircle2, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUniversityLocks } from '@/app/hooks/useUniversityLocks'

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

export default function TasksPage() {
    const { lockedUniversityIds, hasLockedUniversities, isLoading: locksLoading } = useUniversityLocks()
    const [lockedUniversities, setLockedUniversities] = useState<LockedUniversity[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

    useEffect(() => {
        fetchData()
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

        // Fetch all tasks for the user (AI-created tasks may not have university_id)
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        setTasks(tasksData || [])
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

    const getCategoryName = (category: string) => {
        switch (category) {
            case 'documentation': return 'Documentation'
            case 'application': return 'Application'
            case 'test_prep': return 'Test Prep'
            case 'research': return 'Research'
            default: return category
        }
    }

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true
        return task.status === filter
    })

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    if (locksLoading) {
        return (
            <div className="min-h-full p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/3"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (tasks.length === 0 && !locksLoading) {
        return (
            <div className="min-h-full p-6">
                <div className="max-w-5xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-12 shadow-md border border-primary/10 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="font-bold text-2xl mb-2">No Tasks Yet</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            Lock a university from the AI Counsellor to generate personalized application tasks.
                        </p>
                        <Link
                            href="/dashboard/counsellor"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            Go to AI Counsellor
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-full p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">My Tasks</h1>
                    <p className="text-muted-foreground">
                        Track your application progress across {lockedUniversities.length} {lockedUniversities.length === 1 ? 'university' : 'universities'}
                    </p>
                </div>

                {/* Progress Overview */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-lg">Overall Progress</h3>
                            <p className="text-sm text-muted-foreground">{completedTasks} of {totalTasks} tasks completed</p>
                        </div>
                        <div className="text-3xl font-bold text-primary">{Math.round(progress)}%</div>
                    </div>
                    <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-primary to-primary/80"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                    >
                        All ({tasks.length})
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                    >
                        Pending ({tasks.filter(t => t.status === 'pending').length})
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                    >
                        Completed ({completedTasks})
                    </button>
                </div>

                {/* Tasks List */}
                <div className="space-y-4">
                    {filteredTasks.length === 0 ? (
                        <div className="bg-card rounded-xl p-12 text-center border border-border/50">
                            <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} tasks found</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const university = lockedUniversities.find(u => u.university_id === task.university_id)
                            return (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={() => toggleTask(task.id, task.status)}
                                            className={`mt-1 w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 ${task.status === 'completed'
                                                ? 'bg-primary border-primary text-primary-foreground'
                                                : 'border-input group-hover:border-primary'
                                                }`}
                                        >
                                            {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <h4 className={`font-semibold ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {task.title}
                                                </h4>
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 ${getCategoryColor(task.category)}`}>
                                                    {getCategoryIcon(task.category)}
                                                    {getCategoryName(task.category)}
                                                </div>
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                            )}
                                            {university && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <GraduationCap className="w-3.5 h-3.5" />
                                                    {university.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
