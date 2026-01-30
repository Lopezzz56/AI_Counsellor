'use client'

import { useState } from 'react'
import { UserProfile } from '@/types/profile'
import { updateProfile } from '@/app/actions/update-profile'
import { Edit2, Save, X, GraduationCap, Globe, Wallet, Award, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EditableProfile({ profile }: { profile: UserProfile }) {
    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-muted-foreground">Keep your details up to date for better AI recommendations.</p>
            </div>

            <Section
                title="Academic Background"
                icon={<GraduationCap className="w-5 h-5" />}
                data={profile.academic_background}
                sectionKey="academic"
                fields={[
                    { key: 'education_level', label: 'Education Level', type: 'text' },
                    { key: 'degree_major', label: 'Degree / Major', type: 'text' },
                    { key: 'graduation_year', label: 'Graduation Year', type: 'text' },
                    { key: 'gpa_percentage', label: 'GPA / Percentage', type: 'text' },
                ]}
            />

            <Section
                title="Study Goal"
                icon={<Globe className="w-5 h-5" />}
                data={profile.study_goal}
                sectionKey="study_goal"
                fields={[
                    { key: 'intended_degree', label: 'Intended Degree', type: 'select', options: ['Bachelors', 'Masters', 'MBA', 'PhD'] },
                    { key: 'field_of_study', label: 'Field of Study', type: 'text' },
                    { key: 'target_intake', label: 'Target Intake', type: 'text' },
                    { key: 'preferred_countries', label: 'Preferred Countries', type: 'array' },
                ]}
            />

            <Section
                title="Budget & Funding"
                icon={<Wallet className="w-5 h-5" />}
                data={profile.budget}
                sectionKey="budget"
                fields={[
                    { key: 'budget_range', label: 'Budget Range (Annual)', type: 'text' },
                    { key: 'funding_source', label: 'Funding Source', type: 'select', options: ['Self-funded', 'Loan', 'Scholarship', 'Mixed'] },
                ]}
            />

            <Section
                title="Exams & Readiness"
                icon={<Award className="w-5 h-5" />}
                data={profile.exam_readiness}
                sectionKey="exams"
                fields={[
                    { key: 'ielts_toefl_score', label: 'IELTS / TOEFL', type: 'text', placeholder: 'e.g. 7.5 or Not taken' },
                    { key: 'gre_gmat_score', label: 'GRE / GMAT', type: 'text', placeholder: 'e.g. 320 or Not taken' },
                    { key: 'sop_status', label: 'SOP Status', type: 'select', options: ['not_started', 'draft', 'ready'] },
                ]}
            />
        </div>
    )
}

function Section({ title, icon, data, sectionKey, fields }: any) {
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState(data || {})
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        const res = await updateProfile(sectionKey, formData)
        setLoading(false)
        if (res.success) {
            setIsEditing(false)
            router.refresh()
        } else {
            alert('Failed to update: ' + res.error)
        }
    }

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }))
    }

    // Comma separated string for array display/edit
    const handleArrayChange = (key: string, value: string) => {
        const arr = value.split(',').map(s => s.trim())
        handleChange(key, arr)
    }

    return (
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        {icon}
                    </div>
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
                    >
                        <Edit2 className="w-4 h-4" /> Edit
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? '...' : <Save className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {fields.map((field: any) => (
                    <div key={field.key} className="space-y-1.5">
                        <label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                            {field.label}
                        </label>
                        {isEditing ? (
                            field.type === 'select' ? (
                                <select
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                >
                                    {field.options.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={field.type === 'array' ? (formData[field.key] || []).join(', ') : (formData[field.key] || '')}
                                    onChange={(e) => field.type === 'array' ? handleArrayChange(field.key, e.target.value) : handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder || ''}
                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                />
                            )
                        ) : (
                            <div className="text-sm font-medium min-h-[1.5rem] flex items-center">
                                {Array.isArray(formData[field.key])
                                    ? formData[field.key].join(', ')
                                    : (formData[field.key] || <span className="text-muted-foreground italic">Not set</span>)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
