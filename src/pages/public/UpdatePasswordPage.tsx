import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Card, Button } from '@/components/ui'

/**
 * Allows authenticated users (arriving from a recovery link) to set a new password.
 * The recovery token is exchanged automatically by Supabase via the auth callback,
 * so by the time the user lands here they have an active session.
 */
export function UpdatePasswordPage() {
  const { updatePassword, user } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Please enter a new password.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: authError } = await updatePassword(password)
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSuccess(true)
    // Redirect to dashboard after a short delay
    setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
        <Card className="text-center">
          <h1 className="text-xl font-bold text-neutral-900">Session expired</h1>
          <p className="mt-2 text-sm text-neutral-500">
            This password reset link has expired or was already used.
            Please request a new one.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/forgot-password')}
          >
            Request new reset link
          </Button>
        </Card>
      </section>
    )
  }

  if (success) {
    return (
      <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Password updated!</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Redirecting you to the dashboard…
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
          <ShieldCheck className="h-6 w-6 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Set new password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Choose a strong password for your account.
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
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-neutral-700">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
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

          <div>
            <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-neutral-700">
              Confirm new password
            </label>
            <input
              id="confirm-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              disabled={loading}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
