
import { login } from '../auth/actions'
import Link from 'next/link'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { message: string, error: string }
}) {
    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                <h1 className="text-3xl font-bold mb-6 text-center text-primary">Login</h1>

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

                {searchParams?.error && (
                    <p className="p-2 mb-2 text-red-500 bg-red-100 dark:bg-red-900 rounded text-center">
                        {searchParams.error}
                    </p>
                )}

                <button
                    formAction={login}
                    className="bg-primary text-primary-foreground rounded-md px-4 py-3 mb-2 hover:opacity-90 transition-opacity"
                >
                    Sign In
                </button>
                <Link
                    href="/signup"
                    className="block w-full border border-input bg-transparent rounded-md px-4 py-3 text-foreground mb-2 hover:bg-muted transition-colors opacity-75 text-center"
                >
                    Create an Account
                </Link>
            </form>
        </div>
    )
}
