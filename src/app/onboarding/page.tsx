
import { getUserProfile } from '@/app/actions/profile'
import { redirect } from 'next/navigation'
import OnboardingChat from './chat'

export default async function OnboardingPage() {
    const profile = await getUserProfile()

    if (!profile) {
        // Should verify auth via middleware, but double check
        redirect('/login')
    }

    if (profile.onboarding_completed) {
        redirect('/dashboard')
    }

    return <OnboardingChat initialProfile={profile} />
}
