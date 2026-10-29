import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Card, Button } from '@/components/ui'

export function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = getValidRedirect(searchParams.get('redirect'))

  useEffect(() => {
    if (!authLoading && user) navigate(redirectTo, { replace: true })
  }, [authLoading, navigate, redirectTo, user])

  if (!authLoading && user) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    const { error: authError } = await signIn(email.trim(), password)
    setLoading(false)

    if (authError) {
      setError(friendlyAuthError(authError.message))
      return
    }

    // Successful login — redirect
    navigate(redirectTo, { replace: true })
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
          <LogIn className="h-6 w-6 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign in to your ShareSphere account.
        </p>
      </div>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Error banner */}
          {error && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
              id="login-error"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          Don't have an account?{' '}
          <Link to="/join" className="font-medium text-brand-600 hover:text-brand-700">
            Create one
          </Link>
        </p>
      </Card>
    </section>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Only allow internal redirects (paths starting with /) */
function getValidRedirect(raw: string | null): string {
  if (!raw) return '/dashboard'
  // Must start with / and must not start with // (protocol-relative)
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/dashboard'
}

/** Map Supabase error messages to friendlier text */
function friendlyAuthError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email before signing in. Check your inbox.'
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your internet connection.'
  }
  return msg
}
