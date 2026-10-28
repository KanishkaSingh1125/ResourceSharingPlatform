import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, Button } from '@/components/ui'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

/**
 * Handles Supabase email confirmation and password recovery callback URLs.
 *
 * Supabase redirects here with hash fragments containing tokens.
 * This page exchanges the token for a session and routes the user
 * to the appropriate destination.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase puts tokens in the URL hash fragment.
        // The supabase-js client automatically picks these up via onAuthStateChange,
        // but we can also check the hash manually for error handling.
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const errorCode = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        if (errorCode) {
          setStatus('error')
          setErrorMessage(
            errorDescription?.replace(/\+/g, ' ') ??
            'The link is invalid, expired, or has already been used.'
          )
          return
        }

        // Check if we now have a valid session (Supabase auto-exchanges the token)
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
          return
        }

        if (!session) {
          // Give Supabase a moment to process the token exchange
          await new Promise((resolve) => setTimeout(resolve, 1500))
          const { data: { session: retrySession } } = await supabase.auth.getSession()

          if (!retrySession) {
            setStatus('error')
            setErrorMessage('Could not verify the link. It may have expired or been used already.')
            return
          }
        }

        setStatus('success')

        // Determine where to redirect based on the callback type
        const callbackType = searchParams.get('type')

        if (callbackType === 'recovery') {
          // Password recovery — go to update password page
          setTimeout(() => navigate('/update-password', { replace: true }), 1500)
        } else {
          // Email confirmation — go to dashboard
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
        }
      } catch {
        setStatus('error')
        setErrorMessage('An unexpected error occurred while processing the link.')
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  if (status === 'loading') {
    return <LoadingSpinner fullPage label="Verifying your link…" />
  }

  if (status === 'error') {
    return (
      <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Verification failed</h1>
          <p className="mt-2 text-sm text-neutral-600">{errorMessage}</p>
        </div>
        <Card className="mt-8 text-center">
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
            <Button variant="outline" onClick={() => navigate('/forgot-password')}>
              Request new reset link
            </Button>
          </div>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Verified!</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Redirecting you now…
        </p>
      </div>
    </section>
  )
}
