// @ts-nocheck
import { google } from '@ai-sdk/google'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { UserProfile } from '@/types/profile'
import { findUniversitiesForProfile } from '@/utils/searchUniversities'

export const maxDuration = 30
function detectIntent(text: string) {
  const t = text.toLowerCase()

  return {
    wantsUniversities:
      /(find|recommend|suggest|shortlist|universities|options)/.test(t),

    wantsTasks:
      /(task|todo|what should i do|steps|documents|apply|application|guidance)/.test(t),

    wantsProfileAnalysis:
      /(profile|strength|weakness|gap|analysis)/.test(t),

    wantsUniversityFit:
      /(why|fit|risk|chance|suitable|good for me)/.test(t),



  }
}


export async function POST(body: any) {
  const { messages, data } = body
  const currentProfile = data?.profile as UserProfile

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: locks } = await supabase
    .from('user_university_locks')
    .select('university_id')
    .eq('user_id', user.id)

  const lastUserMessage =
    messages?.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''

  const intent = detectIntent(lastUserMessage)
  console.log('================ AI COUNSELLOR DEBUG ================')
  console.log('User ID:', user.id)
  console.log('Last User Message:', lastUserMessage)
  console.log('Detected Intent:', intent)
  console.log('Locked Universities Count:', locks?.length ?? 0)
  console.log('Profile Snapshot:', {
    degree: currentProfile?.study_goal?.intended_degree,
    field: currentProfile?.study_goal?.field_of_study,
    countries: currentProfile?.study_goal?.preferred_countries,
    budget: currentProfile?.budget?.budget_range,
  })
  console.log('====================================================')

  // 🔒 Gate ONLY strategy


  // Fetch BOTH locked and shortlisted universities
  let lockedAndShortlisted: any[] = []
  if (locks && locks.length > 0) {
    const { data } = await supabase
      .from('universities')
      .select('*')
      .in(
        'university_id',
        locks.map((l) => l.university_id)
      )
    lockedAndShortlisted = data || []
  }

  // Create a context summary
  const universitiesContext = lockedAndShortlisted.map(u => {
    const lockStatus = locks?.find(l => l.university_id === u.university_id)?.status || 'shortlisted'
    return `- ${u.name} (${u.city}, ${u.country}) [Status: ${lockStatus.toUpperCase()}]\n  Risks: ${u.known_risks || 'None listed'}\n  Why fits: ${u.why_students_choose_it || 'N/A'}`
  }).join('\n')

  const systemPrompt = `
You are an AI Education Counsellor.

Student Profile:
${JSON.stringify(currentProfile, null, 2)}

My Universities (Shortlisted/Locked):
${universitiesContext.length > 0 ? universitiesContext : 'No universities shortlisted yet.'}

STRICT RULES:
1. **Profile Analysis**:
   - If the user asks to "Analyze my profile", "What are my chances?", or "Evaluate me":
   - DO NOT call 'recommend_universities'.
   - Just WRITE A TEXT RESPONSE.
   - Provide a SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis based on their profile.
   - Highlight gaps in their profile for their target degree/country (e.g., low GRE, missing research).
   - Be honest but encouraging.

2. **Task Creation**:
   - If user confirms a university or asks "What next?" for a LOCKED university, use 'add_task'.
   - Use correct categories: documentation, application, test_prep, research.

3. **Recommendations**:
   - Only use 'recommend_universities' if explicitly asked for "suggestions", "find universities", or "options".
   - Do NOT use it for "Analysis" or "Comparison".

4. **Comparisons & Fit**:
   - If asked "Which should I lock?" or "Compare these", use the "My Universities" list above.
   - Compare them based on the student's profile (e.g. "Aalto is better for AI, but TUM has lower fees").
   - Explicitly mention Risks if asked.

5. **Tone**:
   - Professional, supportive, and directive.
   - Short paragraphs.
`



  const tools = {
    recommend_universities: tool({
      description:
        'Recommend universities. Use ONLY for explicit requests like "find universities" or "suggest options". DO NOT USE for "Analyze profile".',
      parameters: z.object({}),
      execute: async () => {
        const universities = await findUniversitiesForProfile(currentProfile, { k: 12 })

        return universities.map((u) => {
          let bucket: 'Dream' | 'Target' | 'Safe' = 'Target'

          if (u.distance < 0.18) bucket = 'Safe'
          else if (u.distance < 0.28) bucket = 'Target'
          else bucket = 'Dream'

          return {
            university_id: u.university_id,
            name: u.name,
            country: u.country,
            city: u.city,
            image_url: u.image_url,
            bucket,
            acceptanceChance:
              bucket === 'Safe' ? 'High' :
                bucket === 'Target' ? 'Medium' : 'Low',
            costLevel:
              (u.total_annual_cost_usd ?? 0) < 20000 ? 'Low' :
                (u.total_annual_cost_usd ?? 0) < 35000 ? 'Medium' : 'High',
            why: u.why_students_choose_it,
            risks: u.known_risks
          }
        })
      },
    }),
    add_task: tool({
      description: `
Create a concrete application task for a LOCKED university.
`,
      parameters: z.object({
        university_name: z.string(),
        task_title: z.string(),
        task_category: z.enum([
          'documentation',
          'application',
          'test_prep',
          'research',
        ]),
      }),
      execute: async (args) => {
        const title = `${args.university_name} — ${args.task_title}`

        const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          title,
          category: args.task_category,
          status: 'pending',
          created_by: 'ai',
        })

        if (error) throw error

        return `Task created: ${title}`
      },
    })



  }

  // ✅ Stream response from AI
  let assistantText = ''
  let toolInvocations: any[] = []

  const result = await streamText({
    model: google('gemini-2.5-flash-lite'),
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5,
    experimental_continueAfterToolCall: true,

    onChunk: (ev) => {
      const c = ev?.chunk
      if (!c) return

      if (c.type === 'text-delta') {
        assistantText += c.text
      }

      if (c.type === 'tool-call') {
        toolInvocations.push({
          toolName: c.toolName,
          input: c.input,
        })
      }

      if (c.type === 'tool-result') {
        const last = toolInvocations[toolInvocations.length - 1]
        if (last) last.output = c.output
      }
    },
  })

  // Wait for stream to complete
  await result.text

  console.log('========== STREAM RESULT ==========')
  console.log('Assistant text length:', assistantText.length)
  console.log('Tool invocations:', JSON.stringify(toolInvocations, null, 2))
  console.log('===================================')

  return new Response(
    JSON.stringify({
      assistantText: assistantText || null,
      toolInvocations,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )

}
