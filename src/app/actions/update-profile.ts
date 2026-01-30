'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(section: string, data: any): Promise<{ error?: string, success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Map section names to DB columns
    const sectionMap: Record<string, string> = {
        'academic': 'academic_background',
        'study_goal': 'study_goal',
        'budget': 'budget',
        'exams': 'exam_readiness'
    }

    const column = sectionMap[section]
    if (!column) return { error: 'Invalid section' }

    const { error } = await supabase
        .from('profiles')
        .update({ [column]: data })
        .eq('id', user.id)

    if (error) {
        console.error('Update profile error:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/profile')
    return { success: true }
}
