import { createClient } from '@/utils/supabase/server'
import { generateUniversityTasks } from '@/utils/tasks/generateUniversityTasks'
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('Auth Error:', authError)
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 🔹 Pick university (dynamic or fallback)
        const reqBody = await req.json().catch(() => ({}))
        const targetId = reqBody.university_id || 'aalto-university'

        const { data: uni, error: uniError } = await supabase
            .from('universities')
            .select('*')
            .eq('university_id', targetId)
            .single()

        if (uniError || !uni) {
            return Response.json({ error: 'University not found' }, { status: 404 })
        }

        // 🔹 Load profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        // 🔹 Generate Tasks
        const tasks = await generateUniversityTasks({
            supabase,
            userId: user.id,
            university: uni,
            profile,
        })

        return Response.json({
            success: true,
            created: tasks?.length || 0,
            tasks,
        })

    } catch (error: any) {
        console.error('CRITICAL ROUTE ERROR:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }
}