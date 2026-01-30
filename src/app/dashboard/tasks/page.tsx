'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, X, Calendar as CalendarIcon, Clock, Tag, GraduationCap, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import CategoryCard from '@/components/category-card'

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([])
    const [universities, setUniversities] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'user'>('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        category: 'documentation',
        university_id: '',
        due_date: '',
        priority: 3,
        est_hours: 0,
        description: ''
    })

    useEffect(() => {
        fetchData()

        // Listen for task updates
        const handleUpdate = () => fetchData()
        window.addEventListener('task-updated', handleUpdate)
        window.addEventListener('university-lock-changed', handleUpdate)

        return () => {
            window.removeEventListener('task-updated', handleUpdate)
            window.removeEventListener('university-lock-changed', handleUpdate)
        }
    }, [])

    const fetchData = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch tasks
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('priority', { ascending: true })
            .order('due_date', { ascending: true, nullsFirst: false })

        setTasks(tasksData || [])

        // Fetch locked universities for dropdown
        const { data: locksData } = await supabase
            .from('university_locks')
            .select('university_id')
            .eq('user_id', user.id)

        if (locksData && locksData.length > 0) {
            const uniIds = locksData.map(l => l.university_id)
            const { data: unisData } = await supabase
                .from('universities')
                .select('university_id, name')
                .in('university_id', uniIds)

            setUniversities(unisData || [])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                title: formData.title,
                category: formData.category,
                university_id: formData.university_id || null,
                due_date: formData.due_date || null,
                priority: formData.priority,
                est_hours: formData.est_hours || null,
                description: formData.description || null,
                created_by: 'user',
                ai_generated: false,
                status: 'pending'
            })

        setIsSubmitting(false)

        if (error) {
            toast.error('Failed to create task', {
                description: error.message
            })
        } else {
            toast.success('Task created successfully!')
            setShowAddModal(false)
            setFormData({
                title: '',
                category: 'documentation',
                university_id: '',
                due_date: '',
                priority: 3,
                est_hours: 0,
                description: ''
            })
            fetchData()
        }
    }

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 'ai') return task.ai_generated === true
        if (activeTab === 'user') return task.ai_generated === false || !task.ai_generated
        return true
    })

    const getTasksByCategory = (category: string) => {
        return filteredTasks.filter(t => t.category === category)
    }

    return (
        <div className="min-h-full p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
                        <p className="text-muted-foreground">
                            Manage your application tasks and track progress
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Task
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        All Tasks ({tasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ai' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        AI Generated ({tasks.filter(t => t.ai_generated).length})
                    </button>
                    <button
                        onClick={() => setActiveTab('user')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'user' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        My Tasks ({tasks.filter(t => !t.ai_generated).length})
                    </button>
                </div>

                {/* Category Cards */}
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

                {/* Empty State */}
                {filteredTasks.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">
                            {activeTab === 'ai' ? 'No AI-generated tasks yet. Lock a university to get started!' :
                                activeTab === 'user' ? 'No custom tasks yet. Click "Add Task" to create one!' :
                                    'No tasks yet. Lock a university or create a custom task!'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add Task Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-xl p-6 max-w-lg w-full shadow-xl border border-border"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Add New Task</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                        placeholder="e.g., Complete SOP draft"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="documentation">Documentation</option>
                                        <option value="test_prep">Test Preparation</option>
                                        <option value="application">Application</option>
                                        <option value="research">Research</option>
                                    </select>
                                </div>

                                {/* University (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        University <span className="text-xs text-muted-foreground">(Optional)</span>
                                    </label>
                                    <select
                                        value={formData.university_id}
                                        onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="">None (Personal Task)</option>
                                        {universities.map(uni => (
                                            <option key={uni.university_id} value={uni.university_id}>
                                                {uni.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Due Date & Priority */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Due Date</label>
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Priority (1-5)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                {/* Estimated Hours */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.est_hours}
                                        onChange={(e) => setFormData({ ...formData, est_hours: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20"
                                        placeholder="e.g., 5"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                                        placeholder="Add any additional details..."
                                    />
                                </div>

                                {/* Submit */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
