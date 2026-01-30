
import { UserProfile } from '@/types/profile'
import { Award, Globe, Wallet, BookOpen } from 'lucide-react'

export default function ProfileSummary({ profile }: { profile: UserProfile }) {
    // Simple strength calculation logic
    const gpa = parseFloat(profile.academic_background?.gpa_percentage || '0')
    const ielts = parseFloat(profile.exam_readiness?.ielts_toefl_score || '0')

    let strength = 'Average'
    let color = 'text-yellow-600'
    if (gpa > 3.5 || gpa > 85) {
        strength = 'Strong'
        color = 'text-green-600'
    } else if (gpa < 2.5 || gpa < 60) {
        strength = 'Weak'
        color = 'text-red-500'
    }

return (
        <div className="bg-gradient-to-br from-background via-background to-primary/5 rounded-[2rem] p-8 border border-primary/10 shadow-2xl shadow-primary/5 h-full transition-all hover:shadow-primary/10">
            <h3 className="font-bold text-lg mb-8 flex items-center gap-3">
                <span className="bg-primary/10 p-2.5 rounded-xl text-primary border border-primary/20">
                    <BookOpen className="w-5 h-5" />
                </span>
                Profile Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: 'Education', val: profile.academic_background?.degree_major, sub: `${profile.academic_background?.education_level}, ${profile.academic_background?.graduation_year}` },
                    { label: 'Target', val: `${profile.study_goal?.intended_degree} in ${profile.study_goal?.field_of_study}`, sub: profile.study_goal?.preferred_countries.join(', ') },
                    { label: 'Budget', val: profile.budget?.budget_range, sub: profile.budget?.funding_source },
                    { label: 'Scores', val: profile.exam_readiness?.ielts_toefl_score || 'Not taken', sub: 'IELTS/TOEFL' }
                ].map((item, i) => (
                    <div key={i} className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-primary/5 hover:border-primary/20 transition-colors">
                        <p className="text-[10px] text-primary/60 uppercase tracking-[0.15em] font-bold">{item.label}</p>
                        <p className="font-bold text-foreground leading-tight">{item.val}</p>
                        <p className="text-xs text-muted-foreground/80 font-medium">{item.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
