// scripts/generate_university_embeddings.ts
// Run with: node -r ts-node/register scripts/generate_university_embeddings.ts
// @ts-nocheck
import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Choose your embedding model (as in your stack)
const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');

// Helper to create a compact textual "document" for each uni
function buildSummaryRow(row) {
  // row fields adjusted to your schema
  const strengths = (row.program_strengths || '')
    .replace(/\|/g, ', ')
    .slice(0, 300); // keep it short
  const gpa = row.req_gpa_range ?? 'N/A';
  const tuition = row.avg_annual_tuition_usd ?? 'N/A';
  const col = row.cost_of_living_usd ?? 'N/A';
  return `${row.name} — ${row.city ?? row.country}.
Ranking: ${row.global_ranking_band ?? 'N/A'}.
Strengths: ${strengths}.
Tuition: ${tuition} USD / yr. Cost of living: ${col} USD/yr.
Competition: ${row.competition_level ?? 'N/A'}. Visa risk: ${row.visa_risk_level ?? 'N/A'}.
Ideal GPA: ${gpa}.`;
}

async function generateEmbeddings({ batchSize = 32 } = {}) {
  let offset = 0;
  while (true) {
    const { data: universities, error } = await supabase
      .from('universities')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!universities || universities.length === 0) break;

    // Build summaries
    const docs = universities.map((u) => buildSummaryRow(u));
    // Create embeddings - if embed supports batch, use it; else iterate
    // Using embed() from 'ai' - assume it supports single call per document here.
    for (let i = 0; i < universities.length; i++) {
      const uni = universities[i];
      const text = docs[i];

      try {
            const { embedding } = await embed({
              model: embeddingModel,
              value: text,
              // ADD THIS BLOCK BELOW
              providerOptions: {
                google: {
                  outputDimensionality: 768,
                },
              },
            });

        // update by university_id (your PK is university_id)
        // Add .select() to the end of your update to confirm the change
        const { data, error: upErr } = await supabase
          .from('universities')
          .update({ embedding }) // Ensure lowercase to match your SQL
          .eq('university_id', uni.university_id)
          .select();

        if (upErr) {
          // This will now catch RLS or Permission errors
          console.error('❌ Update Failed for:', uni.name, upErr.message);
        } else if (data?.length === 0) {
          // This happens if the ID in your script doesn't match the database ID
          console.warn('⚠️ No matching row found for ID:', uni.university_id);
        } else {
          console.log('✅ Embedded and Updated:', uni.name);
        }
      } catch (e) {
        console.error('Embedding error for', uni.university_id, e);
      }
    }

    offset += batchSize;
  }

  console.log('Done embedding all universities.');
}

generateEmbeddings().catch((err) => {
  console.error('Fatal error generating embeddings:', err);
  process.exit(1);
});
