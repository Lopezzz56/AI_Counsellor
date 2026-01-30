'use client'

import { useEffect, useState } from 'react'
import { Check, CheckSquare } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function ToDoList() {
    const [tasks, setTasks] = useState<any[]>([])
    const [isUpdating, setIsUpdating] = useState<string | null>(null)

    const fetchTasks = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        setTasks(data || [])
    }

    useEffect(() => {
        fetchTasks()

        // Listen for lock changes to refresh tasks
        const refetch = () => fetchTasks()
        window.addEventListener('university-lock-changed', refetch)

        return () => window.removeEventListener('university-lock-changed', refetch)
    }, [])

    const toggleTask = async (id: string, currentStatus: string) => {
        setIsUpdating(id)
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))

        const supabase = createClient()
        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            // Revert on error
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t))
            console.error('Failed to update task:', error)
        }

        setIsUpdating(null)
    }

return (
        <div className="bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] p-6 border border-primary/10 shadow-2xl shadow-primary/5 h-full transition-all hover:shadow-primary/10">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                <span className="bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] p-2 rounded-xl text-primary-foreground">
                    <CheckSquare className="w-4 h-4" />
                </span>
                Your To-Do List
            </h3>

            <div className="space-y-3">
                {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground italic opacity-60">No pending tasks. Great job!</p>
                )}
                {tasks.map((task: any) => (
                    <div key={task.id} className="group flex items-start gap-3 p-4 rounded-2xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all duration-300">
                        <button
                            onClick={() => toggleTask(task.id, task.status)}
                            disabled={isUpdating === task.id}
                            className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.status === 'completed'
                                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                                : 'border-primary/20 hover:border-primary bg-background'
                                }`}
                        >
                            {task.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div className="flex-1">
                            <p className={`text-sm font-semibold transition-all ${task.status === 'completed' ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                                {task.title}
                            </p>
                            {task.description && (
                                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">{task.description}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
