// D:\Projects\assignments\AI_counsellor\src\utils\searchUniversities.ts
// @ts-nocheck
import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');

export async function findUniversitiesForProfile(profile, opts = { k: 12 }) {
  const shortQuery = `Student: ${profile.academic_background?.degree_major ?? ''}.
Degree wanted: ${profile.study_goal?.intended_degree ?? ''} in ${profile.study_goal?.field_of_study ?? ''}.
Budget: ${profile.budget?.budget_range ?? ''}.
Intake: ${profile.study_goal?.target_intake ?? ''}.
Scores: IELTS ${profile.exam_readiness?.ielts_toefl_score ?? 'N/A'}, GRE ${profile.exam_readiness?.gre_gmat_score ?? 'N/A'}.`;


            const { embedding } = await embed({
              model: embeddingModel,
                 value: shortQuery,
              providerOptions: {
                google: {
                  outputDimensionality: 768,
                },
              },
            });
  // call SQL function created earlier
const { data, error } = await supabase.rpc('search_universities', {
  query: embedding,
  k: opts.k,
  filter_country:
    profile.study_goal?.preferred_countries?.[0] || null,
  max_tuition: null
})

console.log('📡 RPC search_universities payload:', {
  query_dim: embedding.length,
  k: opts.k,
  filter_country:
    profile.study_goal?.preferred_countries?.[0] || null,
  max_tuition: null
})
  if (error) throw error;
  return data; // array of universities + distance
}
