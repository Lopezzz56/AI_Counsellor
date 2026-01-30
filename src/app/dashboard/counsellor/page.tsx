
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CounsellorChatInterface from './chat-interface'

export default async function CounsellorPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/onboarding')
    }

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col">
            <CounsellorChatInterface initialProfile={profile} />
        </div>
    )
}
