
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes logic
    const path = request.nextUrl.pathname
    const isAuthRoute = path === '/login' || path === '/signup'
    const isPublicRoute = path === '/'
    const isProtectedRoute = !isAuthRoute && !isPublicRoute

    if (!user && isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is logged in and tries to access auth routes, redirect to dashboard or onboarding
    // We can't check profile completion here easily without DB call, so we just send to dashboard
    // and dashboard can redirect to onboarding if needed.
    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}
