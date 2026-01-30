'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useUniversityLocks } from '@/app/hooks/useUniversityLocks'
import { GraduationCap, CheckCircle, Circle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface LockedUniversity {
    university_id: string
    name: string
    country: string
}

interface Task {
    id: string
    title: string
    status: 'pending' | 'completed'
    category: string
    university_id: string
}

export default function ApplicationGuidancePage() {
    const { lockedUniversityIds, hasLockedUniversities, isLoading } = useUniversityLocks()
    const [lockedUniversities, setLockedUniversities] = useState<LockedUniversity[]>([])
    const [tasks, setTasks] = useState<Task[]>([])

    useEffect(() => {
        if (lockedUniversityIds.length > 0) {
            fetchData()
        } else {
            // Clear tasks if no locked universities
            setTasks([])
            setLockedUniversities([])
        }
    }, [lockedUniversityIds])

    useEffect(() => {
        // Listen for university lock changes
        const handleLockChange = () => {
            console.log('🔄 University lock changed, refreshing data...')
            if (lockedUniversityIds.length > 0) {
                fetchData()
            }
        }

        window.addEventListener('university-lock-changed', handleLockChange)
        return () => window.removeEventListener('university-lock-changed', handleLockChange)
    }, [lockedUniversityIds])

    const fetchData = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Safety check: Don't query if we don't have IDs yet
        if (!user || !lockedUniversityIds || lockedUniversityIds.length === 0) {
            return
        }

        // 1. Fetch Universities
        const { data: universities } = await supabase
            .from('universities')
            .select('university_id, name, country')
            .in('university_id', lockedUniversityIds)

        setLockedUniversities(universities || [])

        // 2. Fetch Tasks (Make sure university_id column in DB is populated!)
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('priority', { ascending: true })

        setTasks(tasksData || [])
    }

    const getTasksByCategory = (universityId: string) => {
        // Filter tasks by university_id (not by title!)
        const universityTasks = tasks.filter(task => task.university_id === universityId)

        console.log(`📋 Tasks for ${universityId}:`, universityTasks)

        return {
            documentation: universityTasks.filter(t => t.category === 'documentation'),
            application: universityTasks.filter(t => t.category === 'application'),
            test_prep: universityTasks.filter(t => t.category === 'test_prep'),
            research: universityTasks.filter(t => t.category === 'research'),
        }
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

    if (isLoading) {
        return (
            <div className="min-h-full p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/3"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!hasLockedUniversities) {
        return (
            <div className="min-h-full p-6">
                <div className="max-w-6xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-12 shadow-md border border-primary/10 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <GraduationCap className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="font-bold text-2xl mb-2">No Universities Locked</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            Lock universities from the AI Counsellor to get personalized application guidance and tasks.
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
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="font-bold text-xl">Application Guidance</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            You have {lockedUniversityIds.length} {lockedUniversityIds.length === 1 ? 'university' : 'universities'} locked.
                            Track your application progress below.
                        </p>
                    </div>
                </div>

                {lockedUniversities.map((uni) => {
                    const tasksByCategory = getTasksByCategory(uni.university_id)
                    const allTasks = [...tasksByCategory.documentation, ...tasksByCategory.application, ...tasksByCategory.test_prep, ...tasksByCategory.research]
                    const completedCount = allTasks.filter(t => t.status === 'completed').length
                    const progress = allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0

                    return (
                        <motion.div
                            key={uni.university_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card rounded-xl p-6 border border-border/50 shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{uni.name}</h3>
                                    <p className="text-sm text-muted-foreground">{uni.country}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
                                    <p className="text-xs text-muted-foreground">{completedCount}/{allTasks.length} completed</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-muted/50 rounded-full overflow-hidden mb-6">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-gradient-to-r from-primary to-primary/80"
                                />
                            </div>

                            {/* Tasks by Category */}
                            {allTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No tasks yet. Ask the AI Counsellor to create tasks for this university.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
                                        categoryTasks.length > 0 && (
                                            <div key={category} className="space-y-2">
                                                <h4 className="text-sm font-semibold capitalize text-muted-foreground">
                                                    {category.replace('_', ' ')}
                                                </h4>
                                                {categoryTasks.map(task => (
                                                    <div key={task.id} className="flex items-start gap-2 text-sm">
                                                        <button
                                                            onClick={() => toggleTask(task.id, task.status)}
                                                            className="mt-0.5 hover:scale-110 transition-transform"
                                                        >
                                                            {task.status === 'completed' ? (
                                                                <CheckCircle className="w-4 h-4 text-primary" />
                                                            ) : (
                                                                <Circle className="w-4 h-4 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                        <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                                            {task.title.replace(`${uni.name} — `, '')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
