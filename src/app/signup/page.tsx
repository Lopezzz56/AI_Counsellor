
import { signup } from '../auth/actions'
import Link from 'next/link'

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string, error?: string }>
}) {
    const params = await searchParams;

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                <h1 className="text-3xl font-bold mb-6 text-center text-primary">Sign Up</h1>

                <label className="text-md" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-6"
                    name="email"
                    placeholder="you@example.com"
                    required
                />
                <label className="text-md" htmlFor="password">
                    Password
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-6"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />

                {params?.error && (
                    <p className="p-2 mb-2 text-red-500 bg-red-100 dark:bg-red-900 rounded text-center">
                        {params.error}
                    </p>
                )}

                <button
                    formAction={signup}
                    className="bg-primary text-primary-foreground rounded-md px-4 py-3 mb-2 hover:opacity-90 transition-opacity"
                >
                    Create Account
                </button>

                <p className="text-center text-sm opacity-60">
                    Already have an account? <Link href="/login" className="underline hover:text-primary">Sign In</Link>
                </p>
            </form>
        </div>
    )
}
