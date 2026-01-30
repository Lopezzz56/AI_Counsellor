'use client'

import { motion } from 'framer-motion'
import { FileText, GraduationCap, Award, Search, CheckCircle2, Circle, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { toast } from 'sonner'

interface CategoryCardProps {
    category: string
    tasks: any[]
    onTaskToggle?: () => void
}

const CATEGORY_CONFIG = {
    documentation: {
        name: 'Documentation',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        progressColor: 'bg-blue-500'
    },
    test_prep: {
        name: 'Test Preparation',
        icon: Award,
        color: 'text-green-600',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        progressColor: 'bg-green-500'
    },
    application: {
        name: 'Application',
        icon: GraduationCap,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        progressColor: 'bg-purple-500'
    },
    research: {
        name: 'Research',
        icon: Search,
        color: 'text-orange-600',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        progressColor: 'bg-orange-500'
    }
}

export default function CategoryCard({ category, tasks, onTaskToggle }: CategoryCardProps) {
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]

    if (!config) return null

    const Icon = config.icon
    const completed = tasks.filter(t => t.status === 'completed').length
    const total = tasks.length
    const percentage = total > 0 ? (completed / total) * 100 : 0
    const hoursRemaining = tasks
        .filter(t => t.status === 'pending' && t.est_hours)
        .reduce((sum, t) => sum + (t.est_hours || 0), 0)

    const toggleTask = async (taskId: string, currentStatus: string, task: any) => {
        setIsUpdating(taskId)
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

        const supabase = createClient()
        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus, modified_by_user: true })
            .eq('id', taskId)

        if (error) {
            toast.error('Failed to update task', {
                description: error.message
            })
        } else {
            // Dispatch event for real-time updates with university_id
            window.dispatchEvent(new CustomEvent('task-updated', {
                detail: {
                    taskId,
                    status: newStatus,
                    category,
                    university_id: task.university_id  // Include university_id for smart filtering
                }
            }))
            onTaskToggle?.()
        }

        setIsUpdating(null)
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-card rounded-xl p-5 border ${config.borderColor} shadow-sm hover:shadow-md transition-all`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-base">{config.name}</h3>
                    <p className="text-xs text-muted-foreground">
                        {completed}/{total} completed
                        {hoursRemaining > 0 && ` • ${hoursRemaining}h left`}
                    </p>
                </div>
            </div>

            {/* Progress Ring */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Progress</span>
                    <span className={`text-lg font-bold ${config.color}`}>{Math.round(percentage)}%</span>
                </div>
                <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${config.progressColor}`}
                    />
                </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-2 max-h-64 overflow-y-auto ">
                {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                        No tasks in this category
                    </p>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                            <button
                                onClick={() => toggleTask(task.id, task.status, task)}
                                disabled={isUpdating === task.id}
                                className="mt-0.5 shrink-0"
                            >
                                {task.status === 'completed' ? (
                                    <CheckCircle2 className={`w-4 h-4 ${config.color}`} />
                                ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm ${task.status === 'completed'
                                    ? 'line-through text-muted-foreground'
                                    : 'text-foreground'
                                    }`}>
                                    {task.title}
                                </p>
                                {task.due_date && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {task.est_hours && task.status === 'pending' && (
                                    <span className="text-xs text-muted-foreground">
                                        {task.est_hours}h
                                    </span>
                                )}
                            </div>
                            {!task.ai_generated && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                                    Custom
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    )
}
