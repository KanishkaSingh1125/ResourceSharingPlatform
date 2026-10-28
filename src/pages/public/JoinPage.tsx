import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Card, Button } from '@/components/ui'

export function JoinPage() {
  const { signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect authenticated users away from register
  if (!authLoading && user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  function validate(): string | null {
    if (!displayName.trim()) return 'Please enter your display name.'
    if (displayName.trim().length < 2) return 'Display name must be at least 2 characters.'
    if (!email.trim()) return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.'
    if (!password) return 'Please choose a password.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { error: authError } = await signUp(email.trim(), password, displayName.trim())
    setLoading(false)

    if (authError) {
      setError(friendlySignupError(authError.message))
      return
    }

    // Redirect to verification-pending page
    navigate('/verify-email', { state: { email: email.trim() }, replace: true })
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
          <UserPlus className="h-6 w-6 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Create your account</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Join ShareSphere to discover and book shared resources.
        </p>
      </div>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Error banner */}
          {error && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
              id="register-error"
            >
              {error}
            </div>
          )}

          {/* Display name */}
          <div>
            <label htmlFor="register-name" className="mb-1 block text-sm font-medium text-neutral-700">
              Display name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email address
            </label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-neutral-700">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
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

          {/* Confirm Password */}
          <div>
            <label htmlFor="register-confirm" className="mb-1 block text-sm font-medium text-neutral-700">
              Confirm password
            </label>
            <input
              id="register-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              disabled={loading}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </Card>
    </section>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function friendlySignupError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (lower.includes('password') && lower.includes('length')) {
    return 'Password must be at least 8 characters long.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your internet connection.'
  }
  return msg
}
