import { Link } from 'react-router-dom'
import { ArrowRight, Building2, FlaskConical, Users, Zap } from 'lucide-react'
import { Button, Card } from '@/components/ui'

const features = [
  {
    icon: Building2,
    title: 'Multi-Organisation',
    description:
      'Colleges, labs, makerspaces, companies, and NGOs list and share underused resources on a single platform.',
  },
  {
    icon: FlaskConical,
    title: 'AI-Assisted Matching',
    description:
      'Intelligent recommendations connect you with the right equipment, spaces, and technical resources.',
  },
  {
    icon: Users,
    title: 'Verified Access',
    description:
      'Identity verification and organisation approvals ensure every booking is secure and accountable.',
  },
  {
    icon: Zap,
    title: 'Controlled Booking',
    description:
      'Request, approve, check in with QR codes, and track usage through a streamlined lifecycle.',
  },
] as const

const orgTypes = [
  'Universities',
  'Research Centres',
  'Makerspaces',
  'Laboratories',
  'Companies',
  'NGOs',
] as const

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Open for organisations
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
          Share resources.{' '}
          <span className="text-brand-600">Multiply impact.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
          ShareSphere is a secure, AI-assisted platform where verified
          organisations list underused equipment, spaces, and tools — and
          eligible users discover and book them through a controlled lifecycle.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/explore">
            <Button size="lg">
              Explore Resources
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/register-org">
            <Button variant="outline" size="lg">
              Register Your Organisation
            </Button>
          </Link>
        </div>
      </section>

      {/* Organisation types */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-neutral-400">
            Built for every kind of organisation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {orgTypes.map((org) => (
              <span
                key={org}
                className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-600"
              >
                {org}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-600">
            A streamlined workflow from resource listing to verified check-in.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-neutral-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-200 bg-brand-600">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Ready to share resources?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-brand-100">
            Get your organisation verified and start listing resources today.
            Individual users can join and start booking in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register-org">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-brand-700 hover:bg-brand-50"
              >
                Register Organisation
              </Button>
            </Link>
            <Link to="/join">
              <Button
                variant="outline"
                size="lg"
                className="border-brand-300 text-white hover:bg-brand-700"
              >
                Join as Individual
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

