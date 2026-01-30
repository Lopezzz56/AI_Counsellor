// @ts-nocheck
import { supabaseAdmin } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'


/**
 * POST body:
 * { university_id: string, action?: 'lock'|'unlock' }
 *
 * Returns:
 * { locked: boolean, lock?: object, createdTasks?: object[], removedTasksCount?: number }
 */

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}))
    const { university_id, action = 'lock' } = body || {}
    console.log('🔥 LOCK ROUTE LOADED')

    const supabase = await createClient()
    const {
        data: { user },
        error: userErr
    } = await supabase.auth.getUser()

    console.log('[LOCK ROUTE] Received request', { userErr, user, university_id, action })

    if (!user) {
        console.warn('[LOCK ROUTE] Unauthorized request')
        return new Response('Unauthorized', { status: 401 })
    }

    // Guard
    if (!university_id) {
        return new Response(JSON.stringify({ error: 'missing university_id' }), { status: 400 })
    }

    try {
        if (action === 'lock') {
            // 1) insert lock (unique index avoids duplicates)
            const { data: lock, error: lockErr } = await supabase
                .from('user_university_locks')
                .insert({ user_id: user.id, university_id })
                .select()
                .single()

            if (lockErr) {
                // if unique violation, fetch existing lock
                console.warn('[LOCK ROUTE] lock insert error', lockErr)
                // try to return existing lock
                const { data: existing } = await supabase
                    .from('user_university_locks')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('university_id', university_id)
                    .single()
                // continue even if not found
                // 2) fetch university for titles
                const { data: uni } = await supabase
                    .from('universities')
                    .select('name')
                    .eq('university_id', university_id)
                    .single()

                // 3) create AI-generated tasks (only if not already present)
                const suggestedTasks = [
                    {
                        title: `Draft SOP for ${uni?.name ?? university_id}`,
                        user_id: user.id,
                        created_by: 'ai',
                        university_id,
                        category: 'documentation',
                        status: 'pending',
                        description: 'Write a compelling Statement of Purpose highlighting your goals and fit'
                    },
                    {
                        title: `Collect transcripts for ${uni?.name ?? university_id}`,
                        user_id: user.id,
                        created_by: 'ai',
                        university_id,
                        category: 'documentation',
                        status: 'pending',
                        description: 'Gather official academic transcripts from all institutions'
                    },
                    {
                        title: `Prepare language test (IELTS/TOEFL) for ${uni?.name ?? university_id}`,
                        user_id: user.id,
                        created_by: 'ai',
                        university_id,
                        category: 'test_prep',
                        status: 'pending',
                        description: 'Check requirements and schedule your English proficiency test'
                    },
                    {
                        title: `Complete application form for ${uni?.name ?? university_id}`,
                        user_id: user.id,
                        created_by: 'ai',
                        university_id,
                        category: 'application',
                        status: 'pending',
                        description: 'Fill out the university application form with accurate information'
                    },
                ]

                // insert only tasks that do not already exist (by exact title)
                const createdTasks = []
                for (const t of suggestedTasks) {
                    const { data: exists } = await supabase
                        .from('tasks')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('title', t.title)
                        .limit(1)
                    if (!exists || exists.length === 0) {
                        const { data: created, error: taskErr } = await supabase
                            .from('tasks')
                            .insert(t)
                            .select()
                            .single()
                        if (taskErr) console.warn('[LOCK ROUTE] task insert error', taskErr)
                        else createdTasks.push(created)
                    }
                }

                return Response.json({ locked: true, lock: existing ?? null, createdTasks })
            }

            // If insert success -> create suggested tasks
            console.log('[LOCK ROUTE] lock inserted', lock)

            // fetch university name for task titles
            const { data: uni } = await supabase
                .from('universities')
                .select('name')
                .eq('university_id', university_id)
                .single()

            const suggestedTasks = [
                {
                    title: `Draft SOP for ${uni?.name ?? university_id}`,
                    user_id: user.id,
                    created_by: 'ai',
                    university_id,
                    category: 'documentation',
                    status: 'pending',
                    description: 'Write a compelling Statement of Purpose highlighting your goals and fit'
                },
                {
                    title: `Collect transcripts for ${uni?.name ?? university_id}`,
                    user_id: user.id,
                    created_by: 'ai',
                    university_id,
                    category: 'documentation',
                    status: 'pending',
                    description: 'Gather official academic transcripts from all institutions'
                },
                {
                    title: `Prepare language test (IELTS/TOEFL) for ${uni?.name ?? university_id}`,
                    user_id: user.id,
                    created_by: 'ai',
                    university_id,
                    category: 'test_prep',
                    status: 'pending',
                    description: 'Check requirements and schedule your English proficiency test'
                },
                {
                    title: `Complete application form for ${uni?.name ?? university_id}`,
                    user_id: user.id,
                    created_by: 'ai',
                    university_id,
                    category: 'application',
                    status: 'pending',
                    description: 'Fill out the university application form with accurate information'
                },
                {
                    title: `Research program details for ${uni?.name ?? university_id}`,
                    user_id: user.id,
                    created_by: 'ai',
                    university_id,
                    category: 'research',
                    status: 'pending',
                    description: 'Review curriculum, faculty, and program requirements'
                },
            ]

            const { data: createdTasks, error: tasksErr } = await supabase
                .from('tasks')
                .insert(suggestedTasks)
                .select()

            if (tasksErr) console.warn('[LOCK ROUTE] tasks insert error', tasksErr)

            return Response.json({ locked: true, lock, createdTasks })
        }

        if (action === 'unlock') {
            // delete lock
            const { error: delErr } = await supabase
                .from('user_university_locks')
                .delete()
                .eq('user_id', user.id)
                .eq('university_id', university_id)

            if (delErr) {
                console.warn('[LOCK ROUTE] unlock delete error', delErr)
                return new Response(JSON.stringify({ error: delErr.message }), { status: 500 })
            }

            // remove AI-generated tasks related to this university (only those created_by = 'ai')
            // requires tasks.university_id column (see migration below).
            const { data: removed, error: removedErr } = await supabase
                .from('tasks')
                .delete()
                .eq('user_id', user.id)
                .eq('university_id', university_id)
                .eq('created_by', 'ai')
                .select()

            if (removedErr) console.warn('[LOCK ROUTE] remove tasks error', removedErr)

            return Response.json({ locked: false, removedTasksCount: (removed?.length ?? 0) })
        }

        return new Response(JSON.stringify({ error: 'invalid action' }), { status: 400 })
    } catch (err) {
        console.error('[LOCK ROUTE] unexpected error', err)
        return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 })
    }
}



export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: locks, error } = await supabase
        .from('user_university_locks')
        .select('university_id')
        .eq('user_id', user.id)

    if (error) {
        console.error('[MY LOCKS] error', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ lockedUniversityIds: locks.map(l => l.university_id) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
}
