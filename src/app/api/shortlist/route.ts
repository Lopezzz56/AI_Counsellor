// src/app/api/universities/shortlist/route.ts
// @ts-nocheck
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { findUniversitiesForProfile } from '@/utils/searchUniversities'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    // read optional body: { limit?: number } or default
    const body = await req.json().catch(() => ({}))
    const limit = body.limit ?? 12

    // read user profile to pass to recommendation
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    // find recommended universities (use your existing util)
    const recommendations = await findUniversitiesForProfile(profile, { k: limit })

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return new Response(JSON.stringify({ success: true, created: 0, message: 'No recommendations' }), { status: 200 })
    }

    // Build upsert payload
    const records = recommendations.map((u: any) => ({
      user_id: user.id,
      university_id: u.university_id,
      status: 'shortlisted',
      status_changed_at: new Date().toISOString()
    }))

    // Upsert so we don't create duplicates; onConflict uses unique index (user_id, university_id)
    const { data: inserted, error } = await supabase
      .from('user_university_locks')
      .upsert(records, { onConflict: ['user_id', 'university_id'] })
      .select()

    if (error) {
      console.error('shortlist upsert error', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({
      success: true,
      created: inserted.length,
      universities: recommendations.map(u => ({ university_id: u.university_id, name: u.name })),
      inserted
    }), { status: 200 })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
