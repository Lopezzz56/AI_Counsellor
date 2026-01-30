
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EditableProfile from './editable-profile'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) redirect('/onboarding')

    return (
        <div className="p-6 md:p-10">
            <EditableProfile profile={profile} />
        </div>
    )
}
