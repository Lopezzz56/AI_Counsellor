'use client'
import { Check, Lock, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useUniversityLocks } from '@/app/hooks/useUniversityLocks'

const stages = [
    { id: 'building_profile', label: 'Building Profile', description: 'Personal details' },
    { id: 'discovering', label: 'Discovering', description: 'Finding matches' },
    { id: 'strategizing', label: 'Strategizing', description: 'Locked & planning' },
    { id: 'applying', label: 'Applications', description: 'The final push' },
]

export default function StageBar({ currentStage }: { currentStage: string }) {
    const { hasLockedUniversities } = useUniversityLocks()

    // Dynamically determine the actual stage based on locked universities
    const actualStage = hasLockedUniversities ? 'strategizing' : currentStage
    const currentIndex = stages.findIndex(s => s.id === actualStage)

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] p-8 border border-primary/10 shadow-2xl shadow-primary/5 mb-10">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Your Journey
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Track your progress toward global education.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" />
                    Stage {currentIndex + 1} of {stages.length}
                </div>
            </div>

            <div className="relative px-2">
                {/* Background Track */}
                <div className="absolute top-5 left-0 w-full h-[2px] bg-muted/30" />

                {/* Animated Progress Track */}
                <motion.div
                    className="absolute top-5 left-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                />

                <div className="relative flex justify-between">
                    {stages.map((stage, index) => {
                        const isActive = index === currentIndex
                        const isCompleted = index < currentIndex
                        const isFuture = index > currentIndex

                        return (
                            <div key={stage.id} className="group flex flex-col items-center">
                                {/* The "Node" */}
                                <div className="relative">
                                    {isActive && (
                                        <motion.div
                                            layoutId="glow"
                                            className="absolute -inset-4 bg-primary/20 rounded-full blur-xl"
                                        />
                                    )}

                                    <div className={`
                                        relative w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500
                                        ${isActive ? 'bg-primary border-primary text-primary-foreground rotate-12 shadow-xl shadow-primary/40' :
                                            isCompleted ? 'bg-background border-primary text-primary' :
                                                'bg-background border-muted text-muted-foreground opacity-50'}
                                    `}>
                                        {isCompleted ? (
                                            <Check className="w-5 h-5" />
                                        ) : isFuture ? (
                                            <Lock className="w-4 h-4" />
                                        ) : (
                                            <span className="text-sm font-black italic">{index + 1}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Label Area */}
                                <div className={`mt-4 text-center transition-all duration-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-60'}`}>
                                    <p className={`text-sm font-bold tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {stage.label}
                                    </p>
                                    <p className="hidden md:block text-[10px] text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                                        {stage.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}