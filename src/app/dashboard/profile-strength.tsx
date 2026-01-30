'use client'

import { UserProfile } from '@/types/profile'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Circle, BarChart3 } from 'lucide-react'

export default function ProfileStrength({ profile }: { profile: UserProfile }) {
    // 1. Academics Strength
    const gpa = parseFloat(profile.academic_background?.gpa_percentage || '0')
    let academicStatus = 'Average'
    let academicColor = 'text-yellow-500'
    if (gpa > 3.5 || gpa > 85) {
        academicStatus = 'Strong'
        academicColor = 'text-green-500'
    } else if (gpa < 2.5 || gpa < 60) {
        academicStatus = 'Weak'
        academicColor = 'text-red-500'
    }

    // 2. Exams Status
    const ielts = profile.exam_readiness?.ielts_toefl_score
    const gre = profile.exam_readiness?.gre_gmat_score
    let examStatus = 'Not started'
    let examColor = 'text-muted-foreground'

    if (ielts && ielts !== 'Not taken') {
        examStatus = 'In progress'
        examColor = 'text-blue-500'
        if (gre && gre !== 'Not taken') {
            examStatus = 'Completed'
            examColor = 'text-green-500'
        }
    }

    // 3. SOP Status
    const sop = profile.exam_readiness?.sop_status || 'not_started'
    const sopMap = {
        'not_started': { label: 'Not started', color: 'text-muted-foreground' },
        'draft': { label: 'Draft', color: 'text-yellow-500' },
        'ready': { label: 'Ready', color: 'text-green-500' }
    }
    const sopInfo = sopMap[sop as keyof typeof sopMap] || sopMap['not_started']

    return (
        <div className="bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] p-8 border border-primary/10 shadow-2xl shadow-primary/5 h-full transition-all">
            <div className="flex items-center gap-3 mb-10">
                <BarChart3 className="w-6 h-6 text-primary" />
                <h3 className="font-bold text-xl tracking-tight">Profile Strength</h3>
            </div>

            <div className="space-y-8">
                {[
                    { label: 'Academics', status: academicStatus, color: academicColor, percent: academicStatus === 'Strong' ? '100%' : academicStatus === 'Average' ? '60%' : '30%' },
                    { label: 'Exams', status: examStatus, color: examColor, percent: examStatus === 'Completed' ? '100%' : examStatus === 'In progress' ? '50%' : '5%' },
                    { label: 'SOP', status: sopInfo.label, color: sopInfo.color, percent: sopInfo.label === 'Ready' ? '100%' : sopInfo.label === 'Draft' ? '50%' : '5%' }
                ].map((item, i) => (
                    <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{item.label}</span>
                            <span className={`text-xs font-black uppercase ${item.color}`}>{item.status}</span>
                        </div>
                        <div className="relative w-full bg-muted/30 h-3 rounded-full overflow-hidden border border-primary/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: item.percent }}
                                transition={{ duration: 1, ease: "easeOut", delay: i * 0.2 }}
                                className={`h-full rounded-full ${item.color.replace('text-', 'bg-')} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                                style={{
                                    boxShadow: `0 0 12px ${item.color === 'text-green-500' ? 'rgba(34,197,94,0.3)' : item.color === 'text-yellow-500' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
