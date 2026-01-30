import { SupabaseClient } from '@supabase/supabase-js'

export async function generateUniversityTasks({
    supabase,
    userId,
    university,
    profile,
}: {
    supabase: SupabaseClient
    userId: string
    university: any
    profile: any
}) {
    console.log('[GEN TASKS] Generating for:', university.name, 'Code:', university.requirement_profile_code)

    // 1. Load requirement profile
    const { data: reqProfile, error } = await supabase
        .from('requirement_profiles')
        .select('*')
        .eq('code', university.requirement_profile_code)
        .single()

    if (error) console.error('[GEN TASKS] Profile fetch error:', error)

    if (!reqProfile) {
        console.warn('[GEN TASKS] No requirement profile found for code:', university.requirement_profile_code)
        // Fallback or just return for now
        return []
    }

    console.log('[GEN TASKS] Found profile:', reqProfile.code)
    const tasks: any[] = []

    // 2. Document tasks
    for (const doc of reqProfile.doc_codes ?? []) {
        tasks.push({
            user_id: userId,
            university_id: university.university_id,
            title: `${university.name} — Prepare ${doc.toUpperCase()}`,
            category: 'documentation',
            ai_generated: true,
            ai_meta: { source: 'requirement_profile', doc },
            priority: 2,
            est_hours: 3,
        })
    }

    // 3. Test tasks (only if missing)
    for (const test of reqProfile.test_codes ?? []) {
        const hasTest =
            profile?.exam_readiness?.[`${test}_score`] ||
            profile?.exam_readiness?.[test]

        if (!hasTest) {
            tasks.push({
                user_id: userId,
                university_id: university.university_id,
                title: `${university.name} — Prepare ${test.toUpperCase()}`,
                category: 'test_prep',
                ai_generated: true,
                ai_meta: { source: 'requirement_profile', test },
                priority: 1,
                est_hours: 40,
            })
        }
    }

    // 4. Visa-aware tasks
    if (university.visa_risk_level === 'High') {
        tasks.push({
            user_id: userId,
            university_id: university.university_id,
            title: `${university.name} — Start visa documentation early`,
            category: 'application',
            ai_generated: true,
            priority: 1,
            est_hours: 5,
        })
    }

    // 5. Idempotent insert
    for (const t of tasks) {
        await supabase
            .from('tasks')
            .insert(t)
            .select()
            .throwOnError()
            .maybeSingle()
    }

    return tasks
}
