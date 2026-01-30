'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GraduationCap, Lock, Unlock, Check, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

import { UniversityCard } from '@/components/university-card'

interface University {
    university_id: string
    name: string
    country: string
    city: string
    image_url?: string
    status: 'locked' | 'shortlisted'
    // Enriched fields
    bucket?: 'Dream' | 'Target' | 'Safe'
    acceptanceChance?: string
    costLevel?: string
    why?: string
    total_annual_cost_usd?: number
}

export default function UniversitiesPage() {
    const [universities, setUniversities] = useState<University[]>([])
    const [loading, setLoading] = useState(true)

    const fetchUniversities = async () => {
        if (universities.length === 0) setLoading(true) // Only show loading if empty strings

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // Fetch locks with simplified query
        const { data: locks } = await supabase
            .from('user_university_locks')
            .select('university_id, status')
            .eq('user_id', user.id)

        if (!locks || locks.length === 0) {
            setUniversities([])
            setLoading(false)
            return
        }

        const ids = locks.map(l => l.university_id)

        // Fetch university details
        const { data: unis } = await supabase
            .from('universities')
            .select('*')
            .in('university_id', ids)

        // Merge status
        let initialList = unis?.map(u => ({
            ...u,
            status: locks.find(l => l.university_id === u.university_id)?.status || 'shortlisted'
        })) || []

        setUniversities(initialList)

        // Fetch enriched fit data (Dream/Target/Safe)
        try {
            const res = await fetch('/api/universities/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ university_ids: ids })
            })

            if (res.ok) {
                const { fitData } = await res.json()
                setUniversities(prev => prev.map(u => ({
                    ...u,
                    ...(fitData[u.university_id] || {})
                })))
            }
        } catch (e) {
            console.error('Failed to fetch fit data', e)
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchUniversities()

        const handleLockChange = () => fetchUniversities()
        window.addEventListener('university-lock-changed', handleLockChange)
        return () => window.removeEventListener('university-lock-changed', handleLockChange)
    }, [])

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-full p-6 md:p-8 max-w-7xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-primary" />
                        My Universities
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your application list. You can only <strong>Lock</strong> one university at a time for detailed guidance.
                    </p>
                </div>
                <Link
                    href="/dashboard/counsellor"
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium text-sm"
                >
                    <Star className="w-4 h-4" />
                    Find More
                </Link>
            </div>

            {universities.length === 0 ? (
                <div className="text-center py-20 bg-muted/5 rounded-3xl border border-dashed border-muted-foreground/20">
                    <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-foreground">No universities yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Chat with the AI Counsellor to get personalized recommendations and shortlist universities.
                    </p>
                    <Link
                        href="/dashboard/counsellor"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                    >
                        Start Exploring
                    </Link>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Locked Section */}
                    {universities.some(u => u.status === 'locked') && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-green-600">
                                <Lock className="w-5 h-5" /> Locked University
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {universities.filter(u => u.status === 'locked').map(uni => (
                                        <UniversityCard
                                            key={uni.university_id}
                                            university={uni}
                                            onLockToggle={fetchUniversities}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}

                    {/* Shortlisted Section */}
                    {universities.some(u => u.status !== 'locked') && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                                <Star className="w-5 h-5" /> Shortlisted
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {universities.filter(u => u.status !== 'locked').map(uni => (
                                        <UniversityCard
                                            key={uni.university_id}
                                            university={uni}
                                            onLockToggle={fetchUniversities}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
