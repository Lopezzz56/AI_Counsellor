// @ts-nocheck
import { supabaseAdmin } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { generateUniversityTasks } from '@/utils/tasks/generateUniversityTasks'


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
            // 0) Enforce Single Lock: Downgrade any EXISTING locks to 'shortlisted'
            // We want to allow only ONE locked university at a time.
            const { error: downgradeError } = await supabaseAdmin
                .from('user_university_locks')
                .update({ status: 'shortlisted' })
                .eq('user_id', user.id)
                .eq('status', 'locked')
                .neq('university_id', university_id) // Don't downgrade the one we are about to lock (if it was already locked)

            if (downgradeError) {
                console.warn('[LOCK ROUTE] downgrade error', downgradeError)
            }

            // 1) Upsert lock with 'locked' status
            // This handles both new locks AND promoting existing 'shortlisted' records
            const { data: lock, error: lockErr } = await supabaseAdmin
                .from('user_university_locks')
                .upsert(
                    {
                        user_id: user.id,
                        university_id: university_id,
                        status: 'locked'
                        // status_changed_at removed as column does not exist
                    },
                    { onConflict: 'user_id,university_id' }
                )
                .select()
                .single()

            if (lockErr) {
                console.warn('[LOCK ROUTE] lock upsert error', lockErr)
                throw lockErr
            }

            // 2) Fetch university details (if needed for task generation context)
            const { data: uni } = await supabase
                .from('universities')
                .select('*')
                .eq('university_id', university_id)
                .single()

            // 3) Fetch user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            // 4) Check if tasks already exist (idempotency check)
            // We only want to generate tasks if they don't already exist for this uni
            const { count: existingTaskCount } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('university_id', university_id)
                .eq('ai_generated', true)

            let createdTasks = []

            // Only generate tasks if none exist (or very few)
            if (!existingTaskCount || existingTaskCount === 0) {
                try {
                    createdTasks = await generateUniversityTasks({
                        supabase: supabaseAdmin, // USE ADMIN CLIENT to bypass RLS on tasks table
                        userId: user.id,
                        university: uni,
                        profile,
                    })
                } catch (taskGenError) {
                    console.warn('[LOCK ROUTE] Task generation error:', taskGenError)
                }
            } else {
                console.log('[LOCK ROUTE] Tasks already exist for this university, skipping generation')
            }

            console.log('[LOCK ROUTE] Lock upserted successfully', lock)
            return Response.json({
                locked: true,
                lock,
                createdTasks,
                tasksCount: createdTasks.length,
                existingTaskCount
            })
        }

        if (action === 'shortlist') {
            // Upsert with 'shortlisted' status
            const { data: lock, error: lockErr } = await supabaseAdmin
                .from('user_university_locks')
                .upsert(
                    {
                        user_id: user.id,
                        university_id: university_id,
                        status: 'shortlisted'
                        // status_changed_at removed
                    },
                    { onConflict: 'user_id,university_id' }
                )
                .select()
                .single()

            if (lockErr) throw lockErr

            return Response.json({
                success: true,
                status: 'shortlisted',
                lock
            })
        }

        // UNLOCK now downgrades to 'shortlisted' instead of deleting
        if (action === 'unlock') {
            const { data: lock, error: lockErr } = await supabaseAdmin
                .from('user_university_locks')
                .upsert(
                    {
                        user_id: user.id,
                        university_id: university_id,
                        status: 'shortlisted'
                    },
                    { onConflict: 'user_id,university_id' }
                )
                .select()
                .single()

            if (lockErr) {
                console.warn('[LOCK ROUTE] unlock error', lockErr)
                return new Response(JSON.stringify({ error: lockErr.message }), { status: 500 })
            }

            // Remove AI-generated tasks (cleanup)
            const { data: removed, error: removedErr } = await supabaseAdmin
                .from('tasks')
                .delete()
                .eq('user_id', user.id)
                .eq('university_id', university_id)
                .eq('created_by', 'ai')
                .select()

            if (removedErr) console.warn('[LOCK ROUTE] remove tasks error', removedErr)

            return Response.json({ locked: false, lock, removedTasksCount: (removed?.length ?? 0) })
        }

        // NEW ACTION: REMOVE (Unshortlist)
        if (action === 'remove') {
            const { error: delErr } = await supabaseAdmin
                .from('user_university_locks')
                .delete()
                .eq('user_id', user.id)
                .eq('university_id', university_id)

            if (delErr) {
                console.warn('[LOCK ROUTE] remove error', delErr)
                return new Response(JSON.stringify({ error: delErr.message }), { status: 500 })
            }

            return Response.json({ success: true, removed: true })
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
        .select('university_id, status') // Selected status
        .eq('user_id', user.id)

    if (error) {
        console.error('[MY LOCKS] error', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({
        locks: locks // Return full objects
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
}
