
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowRight, CheckCircle2, ShieldCheck, GraduationCap } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // if (user) {
  //   redirect('/dashboard')
  // }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-24 px-6 text-center border-b">
        <div className="bg-primary/10 text-primary p-3 rounded-full mb-6">
          <GraduationCap className="h-10 w-10" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6 text-foreground">
          AI-Powered Education Counsellor
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          Your minimalist, strict, and stage-based guide to studying abroad.
          We build your profile, shortlist universities, and guide you step-by-step.
        </p>

        <div className="flex gap-4 flex-col sm:flex-row">
          <Link
            href="/login"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-medium hover:opacity-90 transition-all flex items-center gap-2"
          >
            Login to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signup"
            className="border border-input px-8 py-4 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <ShieldCheck className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Strict Onboarding</h3>
            <p className="text-muted-foreground">
              No skipping steps. Our AI ensures your profile is 100% complete before unlocking the dashboard.
            </p>
          </div>
          <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <CheckCircle2 className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Stage-Based Journey</h3>
            <p className="text-muted-foreground">
              From "Building Profile" to "Applications", track your progress clearly. Focus only on what matters now.
            </p>
          </div>
          <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <GraduationCap className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Counsellor</h3>
            <p className="text-muted-foreground">
              A persistent, context-aware AI agent that knows your grades, budget, and goals to give personalized advice.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t mt-auto">
        <p>© 2026 AI Counsellor. Built for minimalist efficiency.</p>
      </footer>
    </main>
  )
}
