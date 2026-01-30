// app/api/universities/recommend/route.ts
import { findUniversitiesForProfile } from '@/utils/searchUniversities'
import { createClient } from '@/utils/supabase/server'
import { UniversityResult } from '@/types/profile'

export async function POST(req: Request) {
  const { profile } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const universities = await findUniversitiesForProfile(profile, { k: 12 })


const categorized = (universities as UniversityResult[]).map((u) => {
  let bucket: 'Dream' | 'Target' | 'Safe' = 'Target'

  if (u.distance < 0.18) bucket = 'Safe'
  else if (u.distance < 0.28) bucket = 'Target'
  else bucket = 'Dream'

  return {
    ...u,
    bucket,
    acceptanceChance:
      bucket === 'Safe' ? 'High' :
      bucket === 'Target' ? 'Medium' : 'Low',
    costLevel:
      (u.total_annual_cost_usd ?? 0) < 20000 ? 'Low' :
      (u.total_annual_cost_usd ?? 0) < 35000 ? 'Medium' : 'High'
  }
})


  return Response.json({ universities: categorized })
}
