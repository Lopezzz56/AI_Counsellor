'use client'

import { motion } from 'framer-motion'
import { FileText, Globe, GraduationCap, Plane, Info, X } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'

const GUIDES = [
    {
        id: 'sop',
        title: 'What is an SOP?',
        icon: FileText,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        short: 'Your personal story requiring careful drafting.',
        details: 'A Statement of Purpose (SOP) is an essay that tells the admission committee who you are, why you want to study this course, and your future goals. It is often the deciding factor in admissions.',
        tips: ['Be authentic', 'Connect past experiences to future goals', 'Customize for each university']
    },
    {
        id: 'ielts',
        title: 'IELTS / TOEFL',
        icon: Globe,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        short: 'English proficiency tests required for most countries.',
        details: 'These tests evaluate your English reading, writing, listening, and speaking skills. Most universities have strict minimum score requirements (e.g., IELTS 6.5+ or TOEFL 90+).',
        tips: ['Practice time management', 'Focus on the speaking section', 'Valid for 2 years']
    },
    {
        id: 'gre',
        title: 'GRE / GMAT',
        icon: GraduationCap,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        short: 'Standardized tests for graduate school.',
        details: 'The GRE (Graduate Record Exam) tests analytical writing, verbal reasoning, and quantitative reasoning. It is widely required for MS/PhD programs in the US, though some schools are making it optional.',
        tips: ['Focus on vocabulary', 'Practice quantitative sections', 'Check university waivers']
    },
    {
        id: 'visa',
        title: 'Visa & Immigration',
        icon: Plane,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        short: 'Critical final step. Regulations vary by country.',
        details: 'The student visa allows you to live and study abroad. \n\n• **USA**: Stricter interviews, requires "intent to return".\n• **Europe (Schengen)**: Allows travel across 27+ countries with a single visa.\n• **UK/Canada**: Points-based systems, generally paperwork-heavy but straightforward.',
        tips: ['Show financial proof', 'Be honest in interviews', 'Apply early']
    }
]

export default function BeginnerGuideCards() {
    const [selectedId, setSelectedId] = useState<string | null>(null)

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-primary/70" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Beginner's Guide</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {GUIDES.map((guide) => (
                    <motion.div
                        key={guide.id}
                        layoutId={`card-${guide.id}`}
                        onClick={() => setSelectedId(guide.id)}
                        className={`cursor-pointer group relative overflow-hidden rounded-xl border ${guide.border} bg-card/50 hover:bg-card/80 backdrop-blur-sm p-4 transition-all hover:shadow-md`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${guide.bg.replace('/10', '/30')} to-transparent`} />

                        <div className="flex items-start justify-between mb-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${guide.bg}`}>
                                <guide.icon className={`w-5 h-5 ${guide.color}`} />
                            </div>
                        </div>

                        <h4 className="font-semibold text-sm mb-1">{guide.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {guide.short}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Expandable Modal/Overlay for Details */}
            <AnimatePresence>
                {selectedId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedId(null)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4"
                        >
                            <motion.div
                                layoutId={`card-${selectedId}`}
                                className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl relative overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(() => {
                                    const guide = GUIDES.find(g => g.id === selectedId)!
                                    return (
                                        <div className="flex flex-col">
                                            {/* Header */}
                                            <div className={`p-6 ${guide.bg} border-b ${guide.border} relative`}>
                                                <button
                                                    onClick={() => setSelectedId(null)}
                                                    className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-white/50 backdrop-blur shadow-sm`}>
                                                        <guide.icon className={`w-7 h-7 ${guide.color}`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold">{guide.title}</h3>
                                                        <span className="text-xs font-medium opacity-70 uppercase tracking-widest">Guide</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6 space-y-6">
                                                <div className="prose prose-sm dark:prose-invert">
                                                    <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line">
                                                        {guide.details}
                                                    </p>
                                                </div>

                                                <div className="bg-muted/30 rounded-lg p-4">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                                        <Info className="w-3 h-3" /> Quick Tips
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {guide.tips.map((tip, i) => (
                                                            <span key={i} className="text-xs bg-background border px-2.5 py-1.5 rounded-full font-medium shadow-sm">
                                                                {tip}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
