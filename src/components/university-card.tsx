'use client'

import { motion } from 'framer-motion'
import { Sparkles, GraduationCap, Lock, Unlock, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export interface UniversityCardProps {
    university: {
        university_id: string
        name: string
        country: string
        city: string
        image_url?: string
        why?: string
        status?: 'locked' | 'shortlisted' | null
        // Fit Analysis Data
        bucket?: 'Dream' | 'Target' | 'Safe'
        acceptanceChance?: string
        costLevel?: string
        total_annual_cost_usd?: number
    }
    onLockToggle?: () => void
}

export function UniversityCard({ university: u, onLockToggle }: UniversityCardProps) {
    const isLocked = u.status === 'locked'
    const isShortlisted = u.status === 'shortlisted'

    const handleShortlist = async () => {
        const action = isShortlisted ? 'remove' : 'shortlist'

        try {
            const res = await fetch('/api/universities/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    university_id: u.university_id,
                    action: action
                })
            })

            if (res.ok) {
                if (action === 'remove') {
                    toast.success('Removed from shortlist')
                } else {
                    toast.success('Shortlisted!', {
                        description: `${u.name} added to your shortlist.`
                    })
                }
                window.dispatchEvent(new Event('university-lock-changed'))
            } else {
                toast.error('Failed to update shortlist')
            }
        } catch (e) {
            toast.error('Network error')
        }
    }

    const handleLock = async () => {
        const action = isLocked ? 'unlock' : 'lock'
        toast.loading(isLocked ? `Unlocking ${u.name}...` : `Locking ${u.name}...`)

        try {
            const response = await fetch('/api/universities/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    university_id: u.university_id,
                    action: action,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                toast.dismiss()
                if (action === 'lock') {
                    toast.success(`${u.name} Locked!`, {
                        description: `Created ${data.tasksCount || 0} application tasks`
                    })
                } else {
                    toast.info(`${u.name} Unlocked`, {
                        description: `Moved back to shortlist.`
                    })
                }
                window.dispatchEvent(new Event('university-lock-changed'))
                if (onLockToggle) onLockToggle()
            } else {
                toast.dismiss()
                toast.error('Failed to update status')
            }
        } catch (err) {
            toast.dismiss()
            toast.error('Network error')
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`group relative rounded-2xl overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-xl border ${isLocked ? 'border-green-500/30' : 'border-primary/20'} shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/40 min-w-[320px] max-w-[320px] md:min-w-[380px] md:max-w-[380px] shrink-0 h-full flex flex-col`}
        >
            {/* Image with Overlay */}
            <div className="relative h-44 overflow-hidden shrink-0">
                <img
                    src={u.image_url?.startsWith('http') ? u.image_url : '/placeholder-uni.jpg'}
                    alt={u.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

                <div className="absolute top-3 right-3 flex gap-2">
                    {/* Locked Badge */}
                    {isLocked && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white backdrop-blur-md shadow-lg border border-green-400/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                        </span>
                    )}
                    {/* Bucket Badge */}
                    {u.bucket && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/90 text-primary-foreground backdrop-blur-md shadow-lg border border-primary/30">
                            {u.bucket}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3 flex-1 flex flex-col">
                <h3 className="font-bold text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {u.name}
                </h3>

                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="text-primary">📍</span>
                    {u.city}, {u.country}
                </p>

                {/* Acceptance Chance */}
                {u.acceptanceChance && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${u.acceptanceChance?.includes('High')
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 w-4/5'
                                    : u.acceptanceChance?.includes('Medium')
                                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 w-3/5'
                                        : 'bg-gradient-to-r from-red-500 to-red-600 w-2/5'
                                    }`}
                            />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {u.acceptanceChance}
                        </span>
                    </div>
                )}

                {/* Why Text */}
                {u.why && (
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 mb-2">
                        {u.why}
                    </p>
                )}

                <div className="flex-1" /> {/* Spacer */}

                {/* Actions */}
                <div className="flex gap-2 pt-2 mt-auto">
                    {!isLocked && (
                        <button
                            onClick={handleShortlist}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-bold border transition-colors ${isShortlisted
                                ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' // Unshortlist style
                                : 'bg-muted text-foreground border-border hover:bg-muted/80' // Shortlist style
                                }`}
                        >
                            {isShortlisted ? 'Unshortlist' : 'Shortlist'}
                        </button>
                    )}

                    <button
                        onClick={handleLock}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-colors shadow-lg ${isLocked
                            ? 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500' // Unlock style
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20' // Lock style
                            }`}
                    >
                        {isLocked ? 'Unlock' : 'Lock & Apply 🔒'}
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
