
import { getUserProfile } from '@/app/actions/profile'
import { redirect } from 'next/navigation'
import StageBar from './stage-bar'
import ProfileSummary from './profile-summary'
import ProfileStrength from './profile-strength'
import ToDoList from './todo-list'
import ApplicationGuidance from './application-guidance'
import BeginnerGuideCards from '@/components/beginner-guide-cards'

export default async function DashboardPage() {
    const profile = await getUserProfile()

    if (!profile) redirect('/onboarding')
    if (!profile.onboarding_completed) redirect('/onboarding')

    return (
        <div className="min-h-full pb-10 p-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Section C: Stage Indicator */}
                <StageBar currentStage={profile.current_stage} />

                {/* Beginner Guides - Prominent Placement */}
                <BeginnerGuideCards />

                {/* Application Guidance - Full Width */}
                <ApplicationGuidance />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Summary & Strength */}
                    <div className="space-y-8 lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Section A: Profile Summary */}
                            <ProfileSummary profile={profile} />


                            {/* Section B: Profile Strength */}
                            <ProfileStrength profile={profile} />
                        </div>

                        <div className="pt-4">
                            {/* Guides moved to top */}
                        </div>
                    </div>

                    {/* Right Col: To-Do List */}
                    <div className="lg:col-span-1 h-full">
                        {/* Section D: AI To-Do List */}
                        <ToDoList />
                    </div>
                </div>
            </div>
        </div>
    )
}
