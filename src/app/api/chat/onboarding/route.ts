// @ts-nocheck
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { UserProfile } from '@/types/profile';

export const maxDuration = 30;

/* ------------------ helpers ------------------ */

function summarizeProfile(profile?: UserProfile | null) {
    if (!profile) return 'No profile data yet.'

    return `
Academic Background:
- Level: ${profile.academic_background?.education_level ?? 'Missing'}
- Major: ${profile.academic_background?.degree_major ?? 'Missing'}
- Graduation Year: ${profile.academic_background?.graduation_year ?? 'Missing'}
- GPA: ${profile.academic_background?.gpa_percentage ?? 'Missing'}

Study Goal:
- Degree: ${profile.study_goal?.intended_degree ?? 'Missing'}
- Field: ${profile.study_goal?.field_of_study ?? 'Missing'}
- Intake: ${profile.study_goal?.target_intake ?? 'Missing'}
- Countries: ${profile.study_goal?.preferred_countries?.join(', ') ?? 'Missing'}

Budget:
- Range: ${profile.budget?.budget_range ?? 'Missing'}
- Source: ${profile.budget?.funding_source ?? 'Missing'}

Exams:
- IELTS/TOEFL: ${profile.exam_readiness?.ielts_toefl_score ?? 'Missing'}
- GRE/GMAT: ${profile.exam_readiness?.gre_gmat_score ?? 'Missing'}
- SOP: ${profile.exam_readiness?.sop_status ?? 'Missing'}
`
}

// Determine the next missing field in the profile
function getNextMissingField(profile?: UserProfile | null): string {
    if (!profile) return 'education_level';

    // Check academic background
    if (!profile.academic_background?.education_level) return 'education_level';
    if (!profile.academic_background?.degree_major) return 'degree_major';
    if (!profile.academic_background?.graduation_year) return 'graduation_year';
    if (!profile.academic_background?.gpa_percentage) return 'gpa_percentage';

    // Check study goal
    if (!profile.study_goal?.intended_degree) return 'intended_degree';
    if (!profile.study_goal?.field_of_study) return 'field_of_study';
    if (!profile.study_goal?.target_intake) return 'target_intake';
    if (!profile.study_goal?.preferred_countries || profile.study_goal.preferred_countries.length === 0) return 'preferred_countries';

    // Check budget
    if (!profile.budget?.budget_range) return 'budget_range';
    if (!profile.budget?.funding_source) return 'funding_source';

    // Check exam readiness
    if (!profile.exam_readiness?.ielts_toefl_score) return 'ielts_toefl_score';
    if (!profile.exam_readiness?.gre_gmat_score) return 'gre_gmat_score';
    if (!profile.exam_readiness?.sop_status) return 'sop_status';

    return 'complete';
}

// Parse user input for a specific field
function parseUserInputForField(field: string, messages: any[], profile?: UserProfile | null): any {
    if (!messages || messages.length === 0) return null;

    const lastMessage = messages[messages.length - 1];
    const text = lastMessage?.content?.toLowerCase() || '';

    // Simple parsing logic - can be enhanced with more sophisticated NLP
    switch (field) {
        case 'education_level':
            if (text.includes('bachelor') || text.includes('undergraduate')) return 'Bachelors';
            if (text.includes('master') || text.includes('graduate')) return 'Masters';
            if (text.includes('phd') || text.includes('doctorate')) return 'PhD';
            if (text.includes('high school') || text.includes('12th')) return 'High School';
            return null;

        case 'degree_major':
        case 'field_of_study':
            // Extract potential major/field from text (basic extraction)
            const words = text.split(' ');
            // Accept inputs up to 8 words to allow for longer degree names
            if (words.length > 0 && words.length < 8) return lastMessage.content.trim();
            return null;

        case 'graduation_year':
            const yearMatch = text.match(/\b(19|20)\d{2}\b/);
            return yearMatch ? parseInt(yearMatch[0]) : null;

        case 'gpa_percentage':
            const numberMatch = text.match(/\b\d+(\.\d+)?\b/);
            return numberMatch ? parseFloat(numberMatch[0]) : null;

        case 'intended_degree':
            if (text.includes('bachelor') || text.includes('undergraduate')) return 'Bachelors';
            if (text.includes('master') || text.includes('graduate')) return 'Masters';
            if (text.includes('phd') || text.includes('doctorate')) return 'PhD';
            return null;

        case 'target_intake':
            if (text.includes('fall') || text.includes('autumn') || text.includes('september')) return 'Fall';
            if (text.includes('spring') || text.includes('january')) return 'Spring';
            if (text.includes('summer') || text.includes('may')) return 'Summer';
            // If user provides just a year (e.g., "2026"), default to Fall of that year
            const intakeYearMatch = text.match(/\b(20\d{2})\b/);
            if (intakeYearMatch) return `Fall ${intakeYearMatch[0]}`;
            // Accept the raw input if it's short enough (user might say "Fall 2026" directly)
            if (lastMessage.content.length < 20) return lastMessage.content;
            return null;

        case 'preferred_countries':
            const countries = ['usa', 'uk', 'canada', 'australia', 'germany', 'france', 'netherlands', 'singapore'];
            for (const country of countries) {
                if (text.includes(country)) {
                    return country.charAt(0).toUpperCase() + country.slice(1);
                }
            }
            return null;

        case 'budget_range':
            if (text.includes('10') || text.includes('ten')) return 'Under $10,000';
            if (text.includes('20') || text.includes('twenty')) return '$10,000 - $20,000';
            if (text.includes('30') || text.includes('thirty')) return '$20,000 - $30,000';
            if (text.includes('50') || text.includes('fifty')) return '$30,000 - $50,000';
            if (text.includes('above') || text.includes('more') || text.includes('over')) return 'Above $50,000';
            // If user provides a number, try to categorize it
            const budgetMatch = text.match(/\d+/);
            if (budgetMatch) {
                const num = parseInt(budgetMatch[0]);
                if (num < 10) return 'Under $10,000';
                if (num < 20) return '$10,000 - $20,000';
                if (num < 30) return '$20,000 - $30,000';
                if (num < 50) return '$30,000 - $50,000';
                return 'Above $50,000';
            }
            // Accept raw input if short enough
            if (lastMessage.content.length < 30) return lastMessage.content;
            return null;

        case 'funding_source':
            if (text.includes('self') || text.includes('personal') || text.includes('family')) return 'Self-funded';
            if (text.includes('scholarship')) return 'Scholarship';
            if (text.includes('loan')) return 'Education Loan';
            if (text.includes('sponsor') || text.includes('employer')) return 'Sponsorship';
            // Accept raw input if short enough
            if (lastMessage.content.length < 30) return lastMessage.content;
            return null;

        case 'ielts_toefl_score':
        case 'gre_gmat_score':
            // Check for N/A or not applicable
            if (text.includes('n/a') || text.includes('not') || text.includes('no')) return 'N/A';
            const scoreMatch = text.match(/\b\d+(\.\d+)?\b/);
            if (scoreMatch) return scoreMatch[0];
            // Accept raw input if short
            if (lastMessage.content.length < 20) return lastMessage.content;
            return null;

        case 'sop_status':
            if (text.includes('draft') || text.includes('started')) return 'Draft';
            if (text.includes('complete') || text.includes('ready') || text.includes('done')) return 'Complete';
            if (text.includes('not') || text.includes('no') || text.includes("haven't")) return 'Not Started';
            return null;

        default:
            return null;
    }
}

// Question templates for each field
const questionTemplates: Record<string, string> = {
    education_level: "What's your current education level?\n Examples: High School, Bachelor's, Master's, PhD",
    degree_major: "What was your major or field of study?\n Examples: Computer Science, Business Administration, Mechanical Engineering",
    graduation_year: "What year did you graduate (or when will you graduate)?\n Example: 2024",
    gpa_percentage: "What's your GPA or percentage?\n Examples: 3.5, 85%, 8.5",
    intended_degree: "What degree are you planning to pursue?\n Examples: Bachelor's, Master's, PhD",
    field_of_study: "What field of study are you interested in?\n Examples: Computer Science, Data Science, MBA, Medicine",
    target_intake: "When are you planning to start your studies?\n Examples: Fall 2026, Spring 2025, 2026",
    preferred_countries: "Which countries are you considering for your studies?\n Examples: USA, UK, Canada, Australia, Germany",
    budget_range: "What's your budget range for tuition per year (in USD)?\n Examples: 20000, Under $10,000, $20,000 - $30,000",
    funding_source: "How do you plan to fund your education?\n Examples: Self-funded, Scholarship, Education Loan, Sponsorship",
    ielts_toefl_score: "What's your IELTS or TOEFL score?\n Examples: 7.5, 110, N/A (if not taken yet)",
    gre_gmat_score: "What's your GRE or GMAT score?\n Examples: 320, 700, N/A (if not applicable)",
    sop_status: "What's the status of your Statement of Purpose?\n Examples: Not Started, Draft, Complete",
};

export async function POST(body: any) {
    const { messages, data } = body


    const mode = data?.mode || 'onboarding'; // Default to onboarding if not specified

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

      const { data: dbProfile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !dbProfile) {
    return new Response('Profile not found', { status: 500 })
  }
const currentProfile = dbProfile

    const lastUserMessage = messages
        .filter((m: any) => m.role === 'user')
        .slice(-1);
    const safeMessages = [
        ...lastUserMessage
    ];

    console.log('[API] lastUserMessage:', lastUserMessage);
    let systemPrompt = '';

    // Onboarding Mode - handle profile completion flow

    // compute next missing field (server-controlled)
    const nextField = getNextMissingField(currentProfile);
    console.log('[API] next missing onboarding field:', nextField);
    console.log('[API] current profile:', JSON.stringify(currentProfile, null, 2));

    // quick attempt to parse user input for that specific nextField
    const parsed = parseUserInputForField(nextField, lastUserMessage, currentProfile);
    console.log('[API] parsed value for', nextField, parsed);

    // define a helper to call tool and return a response
    async function callToolAndRespond(toolName: string, payload: any) {
        try {
            let toolResult;
            // call the tool's execute function directly (tools are defined below)
            if (toolName === 'update_academic_background') {
                toolResult = await tools.update_academic_background.execute(payload);
            } else if (toolName === 'update_study_goal') {
                toolResult = await tools.update_study_goal.execute(payload);
            } else if (toolName === 'update_budget') {
                toolResult = await tools.update_budget.execute(payload);
            } else if (toolName === 'update_exam_readiness') {
                toolResult = await tools.update_exam_readiness.execute(payload);
            } else if (toolName === 'complete_onboarding') {
                toolResult = await tools.complete_onboarding.execute();
            } else {
                throw new Error('Unknown tool: ' + toolName);
            }

            // after updating, compute the next missing field again (we assume DB write succeeded)
            // fetch latest profile from DB (best practice) to compute true next step
            const { data: refreshedProfile, error: fetchError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            const refreshed = fetchError ? currentProfile : (refreshedProfile ?? currentProfile);
            console.log('[API] Refreshed profile after update:', JSON.stringify(refreshed, null, 2));
            const next = getNextMissingField(refreshed);
            console.log('[API] Next field after update:', next);

            // if complete, return completion message
            if (next === 'complete') {
                // try to call complete_onboarding automatically
                await tools.complete_onboarding.execute();
                return { assistantText: 'Thanks — onboarding is complete. Dashboard unlocked.', toolResult };
            }

            // else return a deterministic follow-up question for the next missing field
            const nextQuestion = questionTemplates[next] || 'Thanks — next question.';
            return {
                assistantText: `${toolResult} ${nextQuestion}`,
                toolResult,
            };
        } catch (err) {
            console.error('[API] tool call failed:', err);
            return { assistantText: "⚠️ Failed to update profile. Please try again." };
        }
    }

    /* ------------------ prepare tools wrappers to reuse existing execute functions ------------------ */
    // Define the same `tools` shape used earlier so we can call .execute directly.
    // These are minimal wrappers that call supabase (mirrors your earlier tool definitions).
    const tools = {
        update_academic_background: {
            execute: async (args: any) => {
                console.log('[API] Updating academic_background with:', JSON.stringify(args));
                const { error } = await supabase.from('profiles').update({ academic_background: args }).eq('id', user.id);
                if (error) {
                    console.error('[API] Error updating academic_background:', error);
                    throw error;
                }
                console.log('[API] Successfully updated academic_background');
                return 'Academic background updated.';
            }
        },
        update_study_goal: {
            execute: async (args: any) => {
                console.log('[API] Updating study_goal with:', JSON.stringify(args));
                const { error } = await supabase.from('profiles').update({ study_goal: args }).eq('id', user.id);
                if (error) {
                    console.error('[API] Error updating study_goal:', error);
                    throw error;
                }
                console.log('[API] Successfully updated study_goal');
                return 'Study goal updated.';
            }
        },
        update_budget: {
            execute: async (args: any) => {
                const { error } = await supabase.from('profiles').update({ budget: args }).eq('id', user.id);
                if (error) throw error;
                return 'Budget updated.';
            }
        },
        update_exam_readiness: {
            execute: async (args: any) => {
                const { error } = await supabase.from('profiles').update({ exam_readiness: args }).eq('id', user.id);
                if (error) throw error;
                return 'Exam readiness updated.';
            }
        },
        complete_onboarding: {
            execute: async () => {
                const { error } = await supabase.from('profiles').update({ onboarding_completed: true, current_stage: 'discovering' }).eq('id', user.id);
                if (error) throw error;
                return 'Onboarding complete. Dashboard unlocked.';
            }
        }
    };

    /* ------------------ Auto-fill decision & server-side update ------------------ */

    if (parsed !== null) {
        // Build payloads carefully so we preserve existing data
        if (nextField === 'education_level' || nextField === 'degree_major' || nextField === 'graduation_year' || nextField === 'gpa_percentage') {
            // merge with existing academic_background
            const payload = {
                ...(currentProfile?.academic_background || {}),
                [nextField]: parsed
            };
            const res = await callToolAndRespond('update_academic_background', payload);
            // Fetch updated profile to send to client
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return new Response(JSON.stringify({
                assistantText: res.assistantText,
                toolInvocations: [{ toolName: 'update_academic_background', output: res.toolResult }],
                updatedProfile
            }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        if (nextField === 'intended_degree' || nextField === 'field_of_study' || nextField === 'target_intake' || nextField === 'preferred_countries') {
            const payload = {
                ...(currentProfile?.study_goal || {}),
                [nextField]: parsed
            };
            // if preferred_countries single string -> make array
            if (nextField === 'preferred_countries' && typeof parsed === 'string') payload.preferred_countries = [parsed];
            const res = await callToolAndRespond('update_study_goal', payload);
            // Fetch updated profile to send to client
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return new Response(JSON.stringify({
                assistantText: res.assistantText,
                toolInvocations: [{ toolName: 'update_study_goal', output: res.toolResult }],
                updatedProfile
            }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        if (nextField === 'budget_range' || nextField === 'funding_source') {
            const payload = {
                ...(currentProfile?.budget || {}),
                [nextField]: parsed
            };
            const res = await callToolAndRespond('update_budget', {
                budget_range: payload.budget_range ?? null,
                funding_source: payload.funding_source ?? null
            });
            // Fetch updated profile to send to client
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return new Response(JSON.stringify({
                assistantText: res.assistantText,
                toolInvocations: [{ toolName: 'update_budget', output: res.toolResult }],
                updatedProfile
            }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        if (nextField === 'ielts_toefl_score' || nextField === 'gre_gmat_score' || nextField === 'sop_status') {
            const payload = {
                ...(currentProfile?.exam_readiness || {}),
                [nextField]: parsed
            };
            const res = await callToolAndRespond('update_exam_readiness', {
                ielts_toefl_score: payload.ielts_toefl_score ?? null,
                gre_gmat_score: payload.gre_gmat_score ?? null,
                sop_status: payload.sop_status ?? null
            });
            // Fetch updated profile to send to client
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return new Response(JSON.stringify({
                assistantText: res.assistantText,
                toolInvocations: [{ toolName: 'update_exam_readiness', output: res.toolResult }],
                updatedProfile
            }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        // fallback: if parsed but not matched, continue below to ask question
    }

    /* ------------------ No confident parse -> ask deterministic question ------------------ */

    // If nextField is 'complete' call the complete tool and finish
    if (nextField === 'complete') {
        try {
            await tools.complete_onboarding.execute();
            return new Response(JSON.stringify({ assistantText: 'Onboarding already complete. Dashboard unlocked.' }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            console.error('[API] complete_onboarding failed:', err);
            return new Response(JSON.stringify({ assistantText: '⚠️ Could not mark onboarding complete. Please try again.' }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // otherwise ask the next question using the template (high-quality phrasing)
    const question = questionTemplates[nextField] || "Can you provide that information?";
    // Fetch current profile to send to client
    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return new Response(JSON.stringify({
        assistantText: question,
        nextField,
        updatedProfile
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });


    // console.log('[API] Received request - Mode:', mode, 'Messages count:', messages?.length);
    // console.log('[API] User ID:', user.id);

    // // server: app/api/chat/route.ts (or your route)
    // try {
    //     console.log('[API] Initializing text stream with model: gemini-2.5-flash');

    //     let assistantText = '';
    //     const toolInvocations: Array<{
    //         toolCallId?: string;
    //         toolName?: string;
    //         input?: any;
    //         output?: any;
    //         stage?: 'started' | 'input' | 'call' | 'result' | 'finished';
    //     }> = [];

    //     const result = await streamText({
    //         model: google('gemini-2.5-flash-lite'),
    //         system: systemPrompt,
    //         messages: safeMessages,
    //         tools,
    //         maxSteps: 2,
    //         // it continues after tool calls if you want follow-ups:
    //         experimental_continueAfterToolCall: true,
    //         onChunk: (ev) => {
    //             try {
    //                 const c = ev?.chunk;
    //                 if (!c) return;
    //                 // text deltas
    //                 if (c.type === 'text-delta' && typeof c.text === 'string') {
    //                     assistantText += c.text;
    //                 }

    //                 // tool invocation lifecycle events
    //                 if (c.type === 'tool-input-start') {
    //                     toolInvocations.push({
    //                         toolCallId: c.id,
    //                         toolName: c.toolName,
    //                         stage: 'started',
    //                     });
    //                 } else if (c.type === 'tool-input-delta') {
    //                     const last = toolInvocations.find(t => t.toolCallId === c.id);
    //                     if (last) {
    //                         last.stage = 'input';
    //                         try {
    //                             // sometimes delta is a JSON string
    //                             last.input = (last.input || '') + (c.delta ?? '');
    //                             // try parse if JSON-like
    //                             if (typeof last.input === 'string') {
    //                                 try { last.input = JSON.parse(last.input); } catch { }
    //                             }
    //                         } catch (e) { /* ignore parse errors */ }
    //                     } else {
    //                         toolInvocations.push({ toolCallId: c.id, toolName: c.toolName, stage: 'input', input: c.delta });
    //                     }
    //                 } else if (c.type === 'tool-call') {
    //                     toolInvocations.push({
    //                         toolCallId: c.toolCallId || c.id,
    //                         toolName: c.toolName,
    //                         input: c.input,
    //                         stage: 'call',
    //                     });
    //                 } else if (c.type === 'tool-result') {
    //                     // attach result to matching call
    //                     const match = toolInvocations.find(t => t.toolCallId === c.toolCallId);
    //                     if (match) {
    //                         match.output = c.output;
    //                         match.stage = 'result';
    //                     } else {
    //                         toolInvocations.push({
    //                             toolCallId: c.toolCallId,
    //                             toolName: c.toolName,
    //                             input: c.input,
    //                             output: c.output,
    //                             stage: 'result',
    //                         });
    //                     }
    //                 }
    //             } catch (err) {
    //                 console.warn('[API] onChunk parse err:', err);
    //             }
    //         },
    //         onFinish: (f) => {
    //             console.log('[API] onFinish event:', f?.finishReason ?? 'unknown', f?.usage ?? null);
    //         },
    //     });

    //     console.log('[API] StreamText created. Result keys:', Object.keys(result));

    //     // Finalize text — prefer result.value, then .text, then baseStream fallback.
    //     let finalText = '';
    //     if (typeof result.value !== 'undefined') {
    //         try { finalText = await result.value; console.log('[DEBUG] used result.value'); } catch (e) { console.warn('value read failed', e); }
    //     }
    //     if (!finalText && typeof result.text !== 'undefined') {
    //         try { finalText = await result.text; console.log('[DEBUG] used result.text'); } catch (e) { console.warn('text read failed', e); }
    //     }
    //     // If assistantText was built incrementally from onChunk, prefer that (it has streaming deltas)
    //     if (assistantText && assistantText.length > finalText.length) {
    //         finalText = assistantText;
    //     }
    //     if (!finalText && result && result.baseStream) {
    //         try { finalText = await new Response(result.baseStream).text(); console.log('[DEBUG] used baseStream'); } catch (e) { console.warn('baseStream read failed', e); }
    //     }

    //     // Normalize tool invocation inputs (attempt parse strings)
    //     for (const t of toolInvocations) {
    //         if (typeof t.input === 'string') {
    //             try { t.input = JSON.parse(t.input); } catch { /* leave as string */ }
    //         }
    //     }

    //     // Return clean JSON (debug-friendly). Client will append this to UI.
    //     return new Response(JSON.stringify({
    //         assistantText: finalText ?? '',
    //         toolInvocations,
    //         finishReason: (result as any)?._finishReason?.status?.type ?? 'unknown',
    //     }), {
    //         status: 200,
    //         headers: { 'Content-Type': 'application/json' },
    //     });

    // } catch (error: any) {
    //     console.error('[API] Gemini failure:', error);

    //     /* ---------------- normalize error ---------------- */

    //     let assistantText =
    //         "⚠️ I'm having trouble responding right now. Please try again in a moment.";

    //     let errorType = 'unknown';

    //     // ✅ Gemini quota
    //     if (
    //         error?.lastError?.statusCode === 429 ||
    //         error?.statusCode === 429 ||
    //         String(error?.message).includes('Quota exceeded')
    //     ) {
    //         errorType = 'quota_exceeded';
    //         assistantText =
    //             "⚠️ I've temporarily hit my usage limit. Please wait about 30 seconds and try again.";
    //     }

    //     // ✅ No output generated
    //     else if (error?.name === 'AI_NoOutputGeneratedError') {
    //         errorType = 'no_output';
    //         assistantText =
    //             "⚠️ Something went wrong while generating my response. Please retry.";
    //     }

    //     return new Response(
    //         JSON.stringify({
    //             error: true,
    //             errorType,
    //             assistantText,
    //         }),
    //         {
    //             status: 200, // IMPORTANT: keep 200 so client can render message
    //             headers: { 'Content-Type': 'application/json' },
    //         }
    //     );
    // }


}

