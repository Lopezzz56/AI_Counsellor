import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all tasks for the user
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, university_id, ai_generated, category, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get locked universities
    const { data: locks } = await supabase
        .from('university_locks')
        .select('university_id, locked')
        .eq('user_id', user.id)

    return NextResponse.json({
        tasks,
        locks,
        totalTasks: tasks?.length || 0,
        tasksWithUniversityId: tasks?.filter(t => t.university_id).length || 0,
        aiGeneratedTasks: tasks?.filter(t => t.ai_generated).length || 0,
    })
}
