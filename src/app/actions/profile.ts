
'use server'

import { createClient } from '@/utils/supabase/server'
import { UserProfile } from '@/types/profile'

export async function getUserProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error)
        }
        return null
    }

    return profile as UserProfile
}
