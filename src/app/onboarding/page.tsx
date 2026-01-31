
import { getUserProfile } from '@/app/actions/profile'
import { redirect } from 'next/navigation'
import OnboardingChat from './chat'

import { createClient } from '@/utils/supabase/server'

export default async function OnboardingPage() {
    let profile = await getUserProfile()

    // If no profile exists but user is authenticated, create one
    if (!profile) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect('/login')
        }

        // Create new profile
        const { error } = await supabase.from('profiles').insert({
            id: user.id,
            onboarding_completed: false,
            current_stage: 'building_profile'
        })

        if (error) {
            console.error('Failed to create profile:', error)
            throw error // Or handle more gracefully
        }

        // Refresh profile
        profile = await getUserProfile()
    }

    if (profile?.onboarding_completed) {
        redirect('/dashboard')
    }

    return <OnboardingChat initialProfile={profile} />
}
