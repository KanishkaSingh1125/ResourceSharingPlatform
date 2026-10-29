import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card } from '@/components/ui'
import { useRole } from '@/context'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getCurrentProfile } from '@/services/authService'
import { ROLE_DEFINITIONS } from '@/config/navigation'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, currentRole, refreshProfile } = useRole()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(ROLE_DEFINITIONS[currentRole].homePath, { replace: true })
    }
  }, [currentRole, isAuthenticated, isLoading, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      setErrorText('Authentication is not configured for this deployment.')
      return
    }

    setSubmitting(true)
    setErrorText(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        console.error('ShareSphere sign-in was rejected.', error)
        throw new Error('Sign-in failed. Check your email and password, then try again.')
      }

      const profile = await getCurrentProfile()
      await refreshProfile()
      navigate(ROLE_DEFINITIONS[profile.role].homePath, { replace: true })
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Sign-in could not be completed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <h1 className="text-center text-2xl font-bold text-neutral-900">Sign in</h1>
      <p className="mt-2 text-center text-sm text-neutral-600">
        Access your dashboard, bookings, and organisation workspace.
      </p>

      <Card className="mt-8">
        {!isSupabaseConfigured && (
          <Alert variant="warning" title="Authentication is unavailable">
            Configure the Supabase URL and anon key in the deployment environment. Local browser
            data cannot authenticate users.
          </Alert>
        )}
        {errorText && <Alert className="mb-4" variant="error" title="Could not sign in">{errorText}</Alert>}
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!isSupabaseConfigured || submitting}
              className="min-h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 disabled:bg-neutral-50"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!isSupabaseConfigured || submitting}
              className="min-h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 disabled:bg-neutral-50"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            isLoading={submitting}
            disabled={!isSupabaseConfigured || isLoading}
          >
            Sign in
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-neutral-600">
        Need to register an organisation?{' '}
        <Link to="/register-org" className="font-medium text-brand-700 hover:underline">
          Start registration
        </Link>
      </p>
    </section>
  )
}
