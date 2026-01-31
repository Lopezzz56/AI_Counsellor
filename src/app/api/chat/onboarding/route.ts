// @ts-nocheck
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai'; // Use generateObject for structured extraction
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { UserProfile } from '@/types/profile';

export const maxDuration = 30;

/* ------------------ helpers ------------------ */

// We define the schema we want to extract from the conversation
const profileSchema = z.object({
    education_level: z.enum(['High School', 'Bachelors', 'Masters', 'PhD']).optional(),
    degree_major: z.string().optional(),
    graduation_year: z.number().optional(),
    gpa_percentage: z.string().optional(), // Keep as string to handle "3.5" or "85%"
    intended_degree: z.enum(['Bachelors', 'Masters', 'PhD', 'MBA']).optional(),
    field_of_study: z.string().optional(),
    target_intake: z.string().optional(),
    preferred_countries: z.array(z.string()).optional(),
    budget_range: z.string().optional(),
    funding_source: z.enum(['Self-funded', 'Scholarship', 'Education Loan', 'Sponsorship']).optional(),
    ielts_toefl_score: z.string().optional(),
    gre_gmat_score: z.string().optional(),
    sop_status: z.string().optional(),
});

// Determine the next missing field in the profile (Priority Order)
function getNextMissingField(profile?: UserProfile | null): string {
    if (!profile) return 'education_level';

    // 1. Academic Background
    if (!profile.academic_background?.education_level) return 'education_level';
    if (!profile.academic_background?.degree_major) return 'degree_major';
    if (!profile.academic_background?.graduation_year) return 'graduation_year';
    if (!profile.academic_background?.gpa_percentage) return 'gpa_percentage';

    // 2. Study Goal
    if (!profile.study_goal?.intended_degree) return 'intended_degree';
    if (!profile.study_goal?.field_of_study) return 'field_of_study';
    if (!profile.study_goal?.target_intake) return 'target_intake';
    if (!profile.study_goal?.preferred_countries || profile.study_goal.preferred_countries.length === 0) return 'preferred_countries';

    // 3. Budget
    if (!profile.budget?.budget_range) return 'budget_range';
    if (!profile.budget?.funding_source) return 'funding_source';

    // 4. Exams
    if (!profile.exam_readiness?.ielts_toefl_score) return 'ielts_toefl_score';
    // GRE is optional often, but let's ask if missing
    // if (!profile.exam_readiness?.gre_gmat_score) return 'gre_gmat_score'; 
    // SOP
    if (!profile.exam_readiness?.sop_status) return 'sop_status';

    return 'complete';
}

// Question templates
const questionTemplates: Record<string, string> = {
    education_level: "Let's start building your profile. What represents your current education level? (e.g. Bachelors, High School)",
    degree_major: "What is your major or field of study? (e.g. Computer Science, Business, Psychology)",
    graduation_year: "When did you graduate (or when will you)? (e.g. 2024)",
    gpa_percentage: "What is your GPA or percentage? (e.g. 8.5/10, 3.5/4.0, or 85%)",
    intended_degree: "What degree are you planning to pursue? (e.g. Masters, PhD, MBA)",
    field_of_study: "What specialization are you looking for? (e.g. AI/ML, Data Science, Finance)",
    target_intake: "When do you plan to start your studies? (e.g. Fall 2025, Spring 2026)",
    preferred_countries: "Which countries are you targeting? \n(We support: USA, UK, Canada, Germany, Australia)",
    budget_range: "What is your annual tuition budget range in USD? (e.g. $20,000 - $40,000)",
    funding_source: "How do you plan to fund your education? (Self-funded, Education Loan, Scholarship)",
    ielts_toefl_score: "Have you taken IELTS or TOEFL? If yes, what's your score? (e.g. IELTS: 7.5/9, TOEFL: 100/120)",
    gre_gmat_score: "Have you taken GRE or GMAT? If yes, scores? (e.g. GRE: 320/340)",
    sop_status: "What is the status of your SOP (Statement of Purpose)? (Draft, Done, Not started)",
};

export async function POST(body: any) {
    // const body = await req.json().catch(() => ({})); // handled by parent
    const { messages, data } = body

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return new Response('Unauthorized', { status: 401 });

    // Load Profile
    const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!dbProfile) return new Response('Profile not found', { status: 500 });

    const currentProfile = dbProfile
    const nextField = getNextMissingField(currentProfile);

    // If complete
    if (nextField === 'complete') {
        await supabase.from('profiles').update({ onboarding_completed: true, current_stage: 'discovering' }).eq('id', user.id);
        return Response.json({ assistantText: "Great! Your profile is complete. Taking you to the dashboard..." });
    }

    // 🔹 EXTRACT INFO FROM USER MESSAGE (LLM)
    // Only look at the LAST message to avoid reprocessing old stuff and saving tokens
    const lastUserMsg = messages?.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || "";

    // 1. Run Extraction
    console.log('[ONBOARDING] Extracting from:', lastUserMsg);

    let extractedData: any = {};
    if (lastUserMsg && lastUserMsg.trim().length > 0) { // Allow even short answers like "85" or "No"
        try {
            const { object } = await generateObject({
                model: google('gemini-2.5-flash'), // Fast model
                schema: profileSchema,
                prompt: `
                Extract student profile information from the user's input.
                Strictly map to the schema.
                
                Context: The user is answering the question about: "${nextField}".
                However, if they provide EXTRA info (e.g. "I want to do MS in CS in USA"), capture ALL of it.
                
                User Input: "${lastUserMsg}"
                `,
            });
            extractedData = object;
            console.log('[ONBOARDING] Extracted:', extractedData);
        } catch (e) {
            console.error('[ONBOARDING] Extraction failed', e);
        }

        // HYBRID FALLBACK: If LLM missed the target field (or failed), try regex
        if (!extractedData || !extractedData[nextField]) {
            console.log(`[ONBOARDING] Field '${nextField}' missing in LLM output. Trying manual fallback...`);
            const fallbackValue = parseUserInputFallback(nextField, lastUserMsg);
            if (fallbackValue !== null) {
                if (!extractedData) extractedData = {};
                extractedData[nextField] = fallbackValue;
                console.log('[ONBOARDING] Fallback extracted:', extractedData);
            }
        }
    }

    function parseUserInputFallback(field: string, text: string): any {
        text = text.toLowerCase();

        switch (field) {
            case 'education_level':
                if (text.includes('bachelor') || text.includes('undergraduate')) return 'Bachelors';
                if (text.includes('master') || text.includes('graduate')) return 'Masters';
                if (text.includes('phd') || text.includes('doctorate')) return 'PhD';
                if (text.includes('high school') || text.includes('12th')) return 'High School';
                return null;

            case 'degree_major':
            case 'field_of_study':
                // Simple heuristic: if input is short, assume it's the valid answer
                if (text.length < 50) return text.trim();
                return null;

            case 'graduation_year':
                const yearMatch = text.match(/\b(19|20)\d{2}\b/);
                return yearMatch ? parseInt(yearMatch[0]) : null;

            case 'gpa_percentage':
                const gpaMatch = text.match(/\b\d+(\.\d+)?\b/);
                return gpaMatch ? gpaMatch[0] : null;

            case 'intended_degree':
                if (text.includes('bachelor')) return 'Bachelors';
                if (text.includes('master')) return 'Masters';
                if (text.includes('phd')) return 'PhD';
                if (text.includes('mba')) return 'MBA';
                return null;

            case 'target_intake':
                // Extract "Fall 2025" etc.
                const intakeMatch = text.match(/(fall|spring|summer)\s*20\d{2}/i);
                if (intakeMatch) return intakeMatch[0];
                // Or just year
                const yearOnly = text.match(/20\d{2}/);
                if (yearOnly) return 'Fall ' + yearOnly[0]; // Default to Fall
                if (text.length < 20) return text;
                return null;

            case 'preferred_countries':
                const countries = [];
                if (text.includes('usa') || text.includes('united states')) countries.push('USA');
                if (text.includes('uk') || text.includes('united kingdom')) countries.push('UK');
                if (text.includes('canada')) countries.push('Canada');
                if (text.includes('australia')) countries.push('Australia');
                if (text.includes('germany')) countries.push('Germany');
                if (countries.length > 0) return countries;
                if (text.length < 30) return [text]; // Fallback
                return null;

            case 'budget_range':
                if (text.includes('under') && text.includes('10')) return 'Under $10,000';
                if (text.includes('10') && text.includes('20')) return '$10,000 - $20,000';
                if (text.includes('20') && text.includes('30')) return '$20,000 - $30,000';
                if (text.includes('30') && text.includes('50')) return '$30,000 - $50,000';
                if (text.includes('50')) return 'Above $50,000';
                // Numeric detection
                const num = parseInt(text.replace(/[^0-9]/g, '') || '0');
                if (num > 0) {
                    if (num < 10000) return 'Under $10,000';
                    if (num < 20000) return '$10,000 - $20,000';
                    if (num < 30000) return '$20,000 - $30,000';
                    if (num < 50000) return '$30,000 - $50,000';
                    return 'Above $50,000';
                }
                return null;

            case 'funding_source':
                if (text.includes('self') || text.includes('family')) return 'Self-funded';
                if (text.includes('scholarship')) return 'Scholarship';
                if (text.includes('loan')) return 'Education Loan';
                if (text.includes('sponsor')) return 'Sponsorship';
                return null;

            case 'ielts_toefl_score':
            case 'gre_gmat_score':
                if (text.includes('no') || text.includes('not')) return 'N/A';
                const score = text.match(/\d+(\.\d+)?/);
                return score ? score[0] : null;

            case 'sop_status':
                if (text.includes('done') || text.includes('complete')) return 'Done';
                if (text.includes('draft') || text.includes('working')) return 'Draft';
                if (text.includes('not') || text.includes('haven')) return 'Not started';
                return null;

            default:
                return null;
        }
    }


    // 2. Update Database with Extracted Data
    let hasUpdates = false;
    const updates: any = {
        academic_background: { ...currentProfile.academic_background },
        study_goal: { ...currentProfile.study_goal },
        budget: { ...currentProfile.budget },
        exam_readiness: { ...currentProfile.exam_readiness }
    };

    // Helper to apply updates
    const apply = (section: string, field: string, value: any) => {
        if (value !== undefined && value !== null) {
            updates[section][field] = value;
            hasUpdates = true;
        }
    };

    if (extractedData) {
        // Academic
        apply('academic_background', 'education_level', extractedData.education_level);
        apply('academic_background', 'degree_major', extractedData.degree_major);
        apply('academic_background', 'graduation_year', extractedData.graduation_year);
        apply('academic_background', 'gpa_percentage', extractedData.gpa_percentage);

        // Study Goal
        apply('study_goal', 'intended_degree', extractedData.intended_degree);
        apply('study_goal', 'field_of_study', extractedData.field_of_study);
        apply('study_goal', 'target_intake', extractedData.target_intake);
        if (extractedData.preferred_countries?.length) {
            apply('study_goal', 'preferred_countries', extractedData.preferred_countries);
        }

        // Budget
        apply('budget', 'budget_range', extractedData.budget_range);
        apply('budget', 'funding_source', extractedData.funding_source);

        // Exams
        apply('exam_readiness', 'ielts_toefl_score', extractedData.ielts_toefl_score);
        apply('exam_readiness', 'gre_gmat_score', extractedData.gre_gmat_score);
        apply('exam_readiness', 'sop_status', extractedData.sop_status);
    }

    if (hasUpdates) {
        console.log('[ONBOARDING] Applying updates to DB:', JSON.stringify(updates, null, 2));
        const { error } = await supabase.from('profiles').update({
            academic_background: updates.academic_background,
            study_goal: updates.study_goal,
            budget: updates.budget,
            exam_readiness: updates.exam_readiness
        }).eq('id', user.id);

        if (error) {
            console.error('DB Update Error:', error);
            return Response.json({ assistantText: "I'm having trouble saving your data. Please try again later.", error: true });
        } else {
            console.log('[ONBOARDING] DB Update Successful');
        }
    }

    // 3. Re-Evaluate Next Step
    // Fetch fresh profile logic simulation
    const simulatedProfile = { ...currentProfile, ...updates };
    const newNextField = getNextMissingField(simulatedProfile);

    if (newNextField === 'complete') {
        await supabase.from('profiles').update({ onboarding_completed: true, current_stage: 'discovering' }).eq('id', user.id);
        return Response.json({ assistantText: "Perfect! I have everything I need. Setting up your dashboard...", updatedProfile: simulatedProfile });
    }

    // 4. Generate Question
    const question = questionTemplates[newNextField] || "Could you tell me a bit more?";

    return Response.json({
        assistantText: question,
        updatedProfile: simulatedProfile
    });
}


