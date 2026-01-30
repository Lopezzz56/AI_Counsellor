'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface Phase {
    name: string
    offset: number // months before target intake
    category: string
    color: string
    bgColor: string
}

interface TimelineProgressProps {
    tasks: any[]
    targetIntake?: string // e.g., "Fall 2026"
}

const PHASES: Phase[] = [
    { name: 'Test Prep', offset: -6, category: 'test_prep', color: 'text-blue-600', bgColor: 'bg-blue-500' },
    { name: 'SOP Draft', offset: -4, category: 'documentation', color: 'text-purple-600', bgColor: 'bg-purple-500' },
    { name: 'Application', offset: -2, category: 'application', color: 'text-green-600', bgColor: 'bg-green-500' },
    { name: 'Visa', offset: -1, category: 'documentation', color: 'text-orange-600', bgColor: 'bg-orange-500' },
]

export default function TimelineProgress({ tasks, targetIntake }: TimelineProgressProps) {
    // Calculate progress for each phase
    const getPhaseProgress = (phase: Phase) => {
        const phaseTasks = tasks.filter(t => {
            // 1. Must match category
            if (t.category !== phase.category) return false

            // 2. Special handling for 'documentation' category overlap
            if (phase.category === 'documentation') {
                const title = t.title.toLowerCase()

                // Visa Phase: specific filter
                if (phase.name === 'Visa') {
                    // Only include tasks mentioning 'visa'
                    return title.includes('visa')
                }

                // SOP Draft Phase: specific filter (exclude visa tasks)
                if (phase.name === 'SOP Draft') {
                    // Include standard docs but EXCLUDE visa tasks
                    return !title.includes('visa')
                }
            }

            // 3. If task has due_date, check if it's in the phase range (optional refinement)
            if (t.due_date) {
                const dueDate = new Date(t.due_date)
                const now = new Date()
                const monthsUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)

                // Task is in this phase if due date is within ±1 month of phase offset
                return Math.abs(monthsUntilDue - Math.abs(phase.offset)) < 1.5
            }

            // Default: include if it passed the category/keyword checks
            return true
        })

        const completed = phaseTasks.filter(t => t.status === 'completed').length
        const total = phaseTasks.length
        const percentage = total > 0 ? (completed / total) * 100 : 0

        return { completed, total, percentage, tasks: phaseTasks }
    }

    // Calculate overall progress
    const allProgress = PHASES.map(phase => getPhaseProgress(phase))
    const totalTasks = allProgress.reduce((sum, p) => sum + p.total, 0)
    const totalCompleted = allProgress.reduce((sum, p) => sum + p.completed, 0)
    const overallProgress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0

    // Calculate estimated hours remaining
    const hoursRemaining = tasks
        .filter(t => t.status === 'pending' && t.est_hours)
        .reduce((sum, t) => sum + (t.est_hours || 0), 0)

    return (
        <div className="space-y-6">
            {/* Overall Progress Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold">Application Timeline</h3>
                        <p className="text-sm text-muted-foreground">
                            {totalCompleted} of {totalTasks} tasks completed
                            {hoursRemaining > 0 && ` • ${hoursRemaining}h remaining`}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-primary">{Math.round(overallProgress)}%</div>
                        <div className="text-xs text-muted-foreground">Overall Progress</div>
                    </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary to-primary/80"
                    />
                </div>
            </div>

            {/* Phase Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {PHASES.map((phase, index) => {
                    const progress = allProgress[index]
                    const isCompleted = progress.percentage === 100
                    const isInProgress = progress.percentage > 0 && progress.percentage < 100
                    const isUpcoming = progress.percentage === 0

                    return (
                        <motion.div
                            key={phase.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                        >
                            {/* Connector Line (except for last item) */}
                            {index < PHASES.length - 1 && (
                                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-border z-0" />
                            )}

                            <div className={`relative z-10 bg-card rounded-xl p-4 border ${isCompleted ? 'border-green-500/50 bg-green-500/5' :
                                isInProgress ? 'border-primary/50 bg-primary/5' :
                                    'border-border/50'
                                } hover:shadow-md transition-all`}>
                                {/* Phase Icon */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500' :
                                        isInProgress ? phase.bgColor :
                                            'bg-muted'
                                        }`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        ) : isInProgress ? (
                                            <Clock className="w-5 h-5 text-white" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-sm">{phase.name}</h4>
                                        <p className="text-xs text-muted-foreground">{Math.abs(phase.offset)} months before</p>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{progress.completed}/{progress.total}</span>
                                    </div>
                                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress.percentage}%` }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                            className={`h-full ${isCompleted ? 'bg-green-500' : phase.bgColor
                                                }`}
                                        />
                                    </div>
                                </div>

                                {/* Estimated Hours */}
                                {progress.tasks.some(t => t.est_hours) && (
                                    <div className="mt-3 text-xs text-muted-foreground">
                                        {progress.tasks
                                            .filter(t => t.status === 'pending' && t.est_hours)
                                            .reduce((sum, t) => sum + t.est_hours, 0)}h remaining
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
