import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-bold text-neutral-200">404</p>
      <h1 className="mt-4 text-2xl font-bold text-neutral-900">Page not found</h1>
      <p className="mt-2 text-neutral-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="mt-8">
        <Button>Back to Home</Button>
      </Link>
    </section>
  )
}

