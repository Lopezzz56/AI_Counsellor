// D:\Projects\assignments\AI_counsellor\src\utils\lockUniversity.ts
// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);


export async function lockUniversity({ user_id, university_id }) {
  // Insert lock; unique constraint prevents duplicates
  const { data, error } = await supabase.from('user_university_locks').insert({
    user_id,
    university_id
  }).select().single();

  if (error) throw error;
  return data;
}

export async function unlockUniversity({ user_id, university_id }) {
  const { error } = await supabase.from('user_university_locks')
    .delete()
    .eq('user_id', user_id)
    .eq('university_id', university_id);

  if (error) throw error;
  return { success: true };
}

