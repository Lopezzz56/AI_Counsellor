'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useUniversityLocks } from '@/app/hooks/useUniversityLocks'
import { GraduationCap, Sparkles, ArrowLeft, Filter } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import TimelineProgress from '@/components/timeline-progress'
import CategoryCard from '@/components/category-card'

interface LockedUniversity {
    university_id: string
    name: string
    country: string
    city: string
}

export default function AIGuidancePage() {
    const { lockedUniversityIds, hasLockedUniversities, isLoading } = useUniversityLocks()
    const [lockedUniversities, setLockedUniversities] = useState<LockedUniversity[]>([])
    const [tasks, setTasks] = useState<any[]>([])

    useEffect(() => {
        if (lockedUniversityIds.length > 0) {
            fetchData()
        } else {
            setTasks([])
            setLockedUniversities([])
        }
    }, [lockedUniversityIds])

    useEffect(() => {
        // Listen for task updates - but only refresh if it's for a locked university
        const handleTaskUpdate = (event: any) => {
            const detail = event.detail
            // Only refresh if the task belongs to a locked university
            if (detail?.university_id && lockedUniversityIds.includes(detail.university_id)) {
                fetchData()
            } else if (!detail?.university_id) {
                // Refresh if no university_id (might be a general update)
                fetchData()
            }
        }

        window.addEventListener('task-updated', handleTaskUpdate)
        window.addEventListener('university-lock-changed', fetchData)

        return () => {
            window.removeEventListener('task-updated', handleTaskUpdate)
            window.removeEventListener('university-lock-changed', fetchData)
        }
    }, [lockedUniversityIds])

    const fetchData = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || lockedUniversityIds.length === 0) return

        // Fetch universities
        const { data: universities } = await supabase
            .from('universities')
            .select('university_id, name, country, city')
            .in('university_id', lockedUniversityIds)

        setLockedUniversities(universities || [])

        // Fetch ONLY AI-generated tasks for locked universities
        const { data: tasksData } = await supabase
             .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('priority', { ascending: true })
            .order('due_date', { ascending: true, nullsFirst: false })


        setTasks(tasksData || [])
    }

    const getTasksByCategory = (category: string) => {
        return tasks.filter(t => t.category === category)
    }

    if (isLoading) {
        return (
            <div className="min-h-full p-6">
                <div className="max-w-7xl mx-auto">
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
                <div className="max-w-7xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-12 shadow-md border border-primary/10 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="font-bold text-2xl mb-2">No AI Guidance Yet</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            Lock universities from the AI Counsellor to get personalized guidance and strategic recommendations.
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
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] p-8 border border-primary/10 shadow-2xl shadow-primary/5">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="bg-primary/10 p-3 rounded-xl text-primary border border-primary/20">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-2xl">AI Guidance & Progress</h2>
                                    <p className="text-sm text-muted-foreground">
                                        AI-generated tasks for {lockedUniversityIds.length} locked {lockedUniversityIds.length === 1 ? 'university' : 'universities'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Progress */}
                <TimelineProgress tasks={tasks} />

                {/* Category Cards */}
                <div>
                    <h3 className="font-semibold text-lg mb-4">Tasks by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <CategoryCard
                            category="documentation"
                            tasks={getTasksByCategory('documentation')}
                            onTaskToggle={fetchData}
                        />
                        <CategoryCard
                            category="test_prep"
                            tasks={getTasksByCategory('test_prep')}
                            onTaskToggle={fetchData}
                        />
                        <CategoryCard
                            category="application"
                            tasks={getTasksByCategory('application')}
                            onTaskToggle={fetchData}
                        />
                        <CategoryCard
                            category="research"
                            tasks={getTasksByCategory('research')}
                            onTaskToggle={fetchData}
                        />
                    </div>
                </div>

                {/* Locked Universities */}
                <div className="bg-card rounded-[2rem] p-4 border border-border/50 shadow-lg">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        Your Locked Universities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lockedUniversities.map((uni) => (
                            <motion.div
                                key={uni.university_id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-primary/5 to-transparent rounded-2xl p-5 border border-primary/10 hover:border-primary/20 transition-all hover:shadow-md"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                                        <GraduationCap className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-base mb-1 line-clamp-2">{uni.name}</h4>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <span>📍</span> {uni.city}, {uni.country}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center pt-6">
                    <Link
                        href="/dashboard/counsellor"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                        <Sparkles className="w-5 h-5" />
                        Ask AI Counsellor for More Guidance
                    </Link>
                </div>
            </div>
        </div>
    )
}
