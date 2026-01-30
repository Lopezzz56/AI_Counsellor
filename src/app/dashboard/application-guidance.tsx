'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GraduationCap, FileText, Calendar, CheckCircle2, Lock, Unlock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

        // Fetch tasks for locked universities
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
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
            <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-8 shadow-md border border-primary/10">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">Application Guidance Locked</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Lock a university from the AI Counsellor chat to unlock personalized application guidance,
                        required documents, timeline, and AI-generated tasks.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-bold text-xl">Application Guidance</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    You have {lockedUniversityIds.length} {lockedUniversityIds.length === 1 ? 'university' : 'universities'} locked.
                    Track your application progress below.
                </p>
            </div>

            {lockedUniversities.map((uni) => {
                const tasksByCategory = getTasksByCategory(uni.university_id)
                const totalTasks = tasks.filter(t => t.university_id === uni.university_id).length
                const completedTasks = tasks.filter(t => t.university_id === uni.university_id && t.status === 'completed').length
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
                const isExpanded = expandedUni === uni.university_id

                return (
                    <motion.div
                        key={uni.university_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl shadow-lg border border-primary/10 overflow-hidden"
                    >
                        {/* University Header */}
                        <div className="p-6 bg-gradient-to-br from-background via-background to-primary/5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-1">{uni.name}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <span>📍</span> {uni.country}
                                    </p>
                                </div>
                                <button
                                    onClick={() => unlockUniversity(uni.university_id, uni.name)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors flex items-center gap-1.5 border border-red-500/20"
                                >
                                    <Unlock className="w-3.5 h-3.5" />
                                    Unlock
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-semibold">{completedTasks}/{totalTasks} tasks completed</span>
                                </div>
                                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                        className="h-full bg-gradient-to-r from-primary to-primary/80"
                                    />
                                </div>
                            </div>

                            {/* Toggle Button */}
                            <button
                                onClick={() => setExpandedUni(isExpanded ? null : uni.university_id)}
                                className="mt-4 w-full py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                            >
                                {isExpanded ? 'Hide Tasks' : 'View Tasks & Timeline'}
                            </button>
                        </div>

                        {/* Expandable Tasks Section */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="border-t border-primary/10"
                                >
                                    <div className="p-6 space-y-6">
                                        {/* Required Documents */}
                                        {tasksByCategory.documentation.length > 0 && (
                                            <div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-3 border ${getCategoryColor('documentation')}`}>
                                                    {getCategoryIcon('documentation')}
                                                    Required Documents
                                                </div>
                                                <div className="space-y-2">
                                                    {tasksByCategory.documentation.map(task => (
                                                        <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Test Preparation */}
                                        {tasksByCategory.test_prep.length > 0 && (
                                            <div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-3 border ${getCategoryColor('test_prep')}`}>
                                                    {getCategoryIcon('test_prep')}
                                                    Test Preparation
                                                </div>
                                                <div className="space-y-2">
                                                    {tasksByCategory.test_prep.map(task => (
                                                        <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Application Tasks */}
                                        {tasksByCategory.application.length > 0 && (
                                            <div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-3 border ${getCategoryColor('application')}`}>
                                                    {getCategoryIcon('application')}
                                                    Application Forms
                                                </div>
                                                <div className="space-y-2">
                                                    {tasksByCategory.application.map(task => (
                                                        <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Research Tasks */}
                                        {tasksByCategory.research.length > 0 && (
                                            <div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-3 border ${getCategoryColor('research')}`}>
                                                    {getCategoryIcon('research')}
                                                    Research & Planning
                                                </div>
                                                <div className="space-y-2">
                                                    {tasksByCategory.research.map(task => (
                                                        <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )
            })}
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
