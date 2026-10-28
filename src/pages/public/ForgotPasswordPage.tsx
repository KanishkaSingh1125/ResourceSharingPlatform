import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Card, Button } from '@/components/ui'

/**
 * Allows users to request a password reset email.
 */
export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    const { error: authError } = await resetPassword(email.trim())
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <KeyRound className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Check your email</h1>
          <p className="mt-2 text-sm text-neutral-600">
            If an account exists for <strong className="text-neutral-800">{email}</strong>,
            we've sent a password reset link.
          </p>
        </div>
        <Card className="mt-8 text-center">
          <p className="text-sm text-neutral-500">
            Didn't receive it? Check your spam folder.
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          </p>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
          <KeyRound className="h-6 w-6 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Reset your password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email address
            </label>
            <input
              id="forgot-email"
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </Card>
    </section>
  )
}
