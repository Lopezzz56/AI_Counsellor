import { createClient } from '@/utils/supabase/server'
import { findUniversitiesForProfile } from '@/utils/searchUniversities'

export async function POST(req: Request) {
    const body = await req.json()
    const { university_ids } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return new Response('Unauthorized', { status: 401 })

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) return new Response('Profile not found', { status: 404 })

    // Run search to get distances (using a larger K to likely include our targets)
    // This is an approximation. Ideally we would allow searching specifically for the IDs.
    // Since we can't easily filter vector search by IDs in the RPC without modifying it,
    // we run a broader search. 
    // IF the university is NOT in the top 50, we assume it's a "Dream" (low similarity).

    // Attempt search
    let matches = []
    try {
        matches = await findUniversitiesForProfile(profile, { k: 50 })
    } catch (e) {
        console.error('Vector search failed', e)
        return new Response('Search failed', { status: 500 })
    }

    // Build map
    const fitData: Record<string, any> = {}

    for (const uid of university_ids) {
        const match = matches.find((m: any) => m.university_id === uid)

        let bucket = 'Dream'
        let acceptanceChance = 'Low'
        let costLevel = 'High' // Default pessimistic

        if (match) {
            // Apply logic derived from recommend_universities tool
            if (match.distance < 0.18) bucket = 'Safe'
            else if (match.distance < 0.28) bucket = 'Target'
            else bucket = 'Dream'

            acceptanceChance = bucket === 'Safe' ? 'High' : bucket === 'Target' ? 'Medium' : 'Low'

            // Cost calculation (approx if not in match, but universities table has it)
            // match object usually contains university columns if RPC returns them.
            // checking searchUniversities.ts -> it returns *
            const cost = match.total_annual_cost_usd || 50000
            costLevel = cost < 20000 ? 'Low' : cost < 35000 ? 'Medium' : 'High'

            fitData[uid] = { bucket, acceptanceChance, costLevel }
        } else {
            // Fallback for universities not in top 50
            // We can check the DB for cost at least if we fetched them separately
            // But for fit, we assume 'Dream' / Low match if it wasn't returned by semantic search
            fitData[uid] = { bucket: 'Dream', acceptanceChance: 'Low', costLevel: 'High' }
        }
    }

    return Response.json({ fitData })
}
