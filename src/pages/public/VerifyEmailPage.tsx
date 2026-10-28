import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Card, Button } from '@/components/ui'

/**
 * Shown after registration when email confirmation is required.
 * Provides a resend-verification action with a cooldown.
 */
export function VerifyEmailPage() {
  const location = useLocation()
  const { resendVerification } = useAuth()

  // Email passed from JoinPage via navigation state
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  async function handleResend() {
    if (!email || cooldown > 0) return

    setResending(true)
    setResendError('')
    setResendSuccess(false)

    const { error } = await resendVerification(email)
    setResending(false)

    if (error) {
      setResendError(error.message)
      return
    }

    setResendSuccess(true)

    // Start a 60-second cooldown
    setCooldown(60)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
          <MailCheck className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Check your email</h1>
        <p className="mt-2 text-sm text-neutral-600">
          We've sent a verification link to{' '}
          {email ? <strong className="text-neutral-800">{email}</strong> : 'your email'}.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Click the link in the email to verify your account.
        </p>
      </div>

      <Card className="mt-8 text-center">
        <p className="text-sm text-neutral-500">
          Didn't receive the email? Check your spam folder or request a new one.
        </p>

        {resendError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {resendError}
          </div>
        )}

        {resendSuccess && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
            Verification email sent! Please check your inbox.
          </div>
        )}

        <div className="mt-4">
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="w-full"
          >
            {resending
              ? 'Sending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend verification email'}
          </Button>
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          Already verified?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </Card>
    </section>
  )
}
