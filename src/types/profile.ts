
export type AcademicBackground = {
    education_level: string
    degree_major: string
    graduation_year: string
    gpa_percentage: string
}

export type StudyGoal = {
    intended_degree: string
    field_of_study: string
    target_intake: string
    preferred_countries: string[]
}

export type Budget = {
    budget_range: string
    funding_source: string
}

export type ExamReadiness = {
    ielts_toefl_score?: string
    gre_gmat_score?: string
    sop_status: 'not_started' | 'draft' | 'ready'
}

export type UserProfile = {
    id: string
    academic_background: AcademicBackground | null
    study_goal: StudyGoal | null
    budget: Budget | null
    exam_readiness: ExamReadiness | null
    onboarding_completed: boolean
    current_stage: string
}

export type UniversityResult = {
  university_id: string
  name: string
  country: string | null
  city: string | null
  global_ranking_band: string | null
  program_strengths: string | null
  avg_annual_tuition_usd: number | null
  cost_of_living_usd: number | null
  competition_level: string | null
  intl_acceptance_estimate: string | null
  visa_risk_level: string | null
  budget_category: string | null
  why_students_choose_it: string | null
  known_risks: string | null
  confidence_note: string | null
  req_gpa_range: string | null
  req_ielts_min: number | null
  req_gre_requirement: string | null
  total_annual_cost_usd: number | null
  image_url: string | null
  distance: number
}

export type RecommendedUniversity = UniversityResult & {
  bucket: 'Dream' | 'Target' | 'Safe'
  acceptanceChance: 'Low' | 'Medium' | 'High'
  costLevel: 'Low' | 'Medium' | 'High'
}

export type OnboardingSection = 'academic' | 'goal' | 'budget' | 'exams' | 'completed'
