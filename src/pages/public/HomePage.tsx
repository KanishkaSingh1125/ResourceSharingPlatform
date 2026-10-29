import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Search,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  QrCode,
  Sparkles,
  Microscope,
  Cpu,
  Camera,
  Layers,
  Wrench,
  Gauge,
  Users2,
  FileText,
  Clock,
  Send,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  ResourceCard,
  type ResourceAvailability,
  Tabs,
  Modal,
} from '@/components/ui'

// Categories requested in Prompt Section 4
const RESOURCE_CATEGORIES = [
  {
    id: 'laboratories',
    name: 'Laboratories',
    description: 'ISO cleanrooms, chemical hoods, mass spectrometers, gene sequencing',
    icon: Microscope,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    count: '34 resources',
  },
  {
    id: 'fabrication',
    name: 'Fabrication Equipment',
    description: 'Industrial 3D printers, 5-axis CNC mills, waterjet & laser cutters',
    icon: Layers,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    count: '48 resources',
  },
  {
    id: 'computers',
    name: 'Computers & High-Compute',
    description: 'NVIDIA H100 clusters, AI model training nodes, high-memory servers',
    icon: Cpu,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    count: '18 clusters',
  },
  {
    id: 'cameras',
    name: 'Cameras & Imaging',
    description: 'Confocal microscopes, high-speed motion rigs, Cryo-TEM, thermal sensors',
    icon: Camera,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    count: '26 instruments',
  },
  {
    id: 'meeting-spaces',
    name: 'Meeting Spaces & Auditoriums',
    description: 'A/V equipped lecture halls, design review studios, hybrid boardrooms',
    icon: Users2,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    count: '42 spaces',
  },
  {
    id: 'testing',
    name: 'Testing Instruments',
    description: '50GHz RF analyzers, oscilloscopes, material tensile testing rigs',
    icon: Gauge,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    count: '31 instruments',
  },
  {
    id: 'workshops',
    name: 'Workshops & Maker Bays',
    description: 'Precision electronics soldering benches, metal fabrication suites',
    icon: Wrench,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    count: '29 bays',
  },
]

// 5-Step Process requested in Prompt Section 3
const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Discover a Resource',
    description:
      'Search across verified universities, laboratories, and makerspaces using domain filters or AI-assisted matching.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Check Eligibility',
    description:
      'Review custodian prerequisites, mandatory safety training certificates, and institutional MOU clearance upfront.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Request Access',
    description:
      'Select your project dates and time slot, detail your experimental scope, and upload required credentials for review.',
    icon: Send,
  },
  {
    step: '04',
    title: 'Get Approval',
    description:
      'Authorised facility managers evaluate requests according to institutional policy with full audit trail accountability.',
    icon: CheckCircle2,
  },
  {
    step: '05',
    title: 'Use & Return Responsibly',
    description:
      'Check in on-site using your digital QR pass, complete the equipment condition checklist, and return equipment safely.',
    icon: RotateCcw,
  },
]

// Why ShareSphere Core Pillars requested in Prompt Section 5
const WHY_SHARESPHERE_PILLARS = [
  {
    title: 'Verified Organisations',
    description:
      'Every university, research center, and company undergoes administrative credentials verification before listing or booking resources.',
    icon: Building2,
    badge: 'Peer-Vetted',
  },
  {
    title: 'Safety & Eligibility Checks',
    description:
      'Automated prerequisite validation ensures operators hold valid lab safety training certificates before reservation slots unlock.',
    icon: ShieldCheck,
    badge: 'Prerequisites Enforced',
  },
  {
    title: 'Fair Access',
    description:
      'Break high-cost capital barriers. Multi-million-dollar technical assets are shared responsibly without compromising host operations.',
    icon: Sparkles,
    badge: 'Resource Efficiency',
  },
  {
    title: 'Transparent Booking History',
    description:
      'Immutable timestamps for booking submissions, custodian approvals, condition checklists, and check-in QR verifications.',
    icon: FileText,
    badge: 'Full Audit Trail',
  },
  {
    title: 'Cross-Organisation Discovery',
    description:
      'Connect academic researchers, makerspace inventors, and startup engineering teams across institutional boundaries.',
    icon: Users2,
    badge: 'Inter-Institutional',
  },
]

// Clearly identified demonstration data for discovery preview requested in Section 6
interface DemoResource {
  id: string
  title: string
  category: string
  categoryKey: string
  organisationName: string
  isOrgVerified: boolean
  location: string
  availabilityStatus: ResourceAvailability
  accessLevel: 'open' | 'members_only' | 'approval_required'
  rate: string
  iconType: typeof Microscope
}

const DEMO_RESOURCES: DemoResource[] = [
  {
    id: 'res-demo-1',
    title: 'Class 100 ISO 5 Cleanroom Facility',
    category: 'Laboratories',
    categoryKey: 'laboratories',
    organisationName: 'IIT Delhi Nanotech Center',
    isOrgVerified: true,
    location: 'Hauz Khas, New Delhi',
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: '₹1,200 / hr',
    iconType: Microscope,
  },
  {
    id: 'res-demo-2',
    title: 'NVIDIA DGX H100 8-GPU Compute Node',
    category: 'Computers & High-Compute',
    categoryKey: 'computers',
    organisationName: 'AI Frontier Lab, Bangalore',
    isOrgVerified: true,
    location: 'Whitefield, Bangalore',
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: 'Compute Credits',
    iconType: Cpu,
  },
  {
    id: 'res-demo-3',
    title: 'Formlabs Form 4L Industrial 3D Printer',
    category: 'Fabrication Equipment',
    categoryKey: 'fabrication',
    organisationName: 'MakerHive Community Lab',
    isOrgVerified: true,
    location: 'Indiranagar, Bangalore',
    availabilityStatus: 'available',
    accessLevel: 'open',
    rate: 'Material Costs Only',
    iconType: Layers,
  },
  {
    id: 'res-demo-4',
    title: 'JEOL 200kV Field Emission Cryo-TEM',
    category: 'Cameras & Imaging',
    categoryKey: 'cameras',
    organisationName: 'Indian Institute of Science (IISc)',
    isOrgVerified: true,
    location: 'CV Raman Rd, Bangalore',
    availabilityStatus: 'reserved',
    accessLevel: 'approval_required',
    rate: 'Institutional Sharing',
    iconType: Camera,
  },
  {
    id: 'res-demo-5',
    title: 'Keysight 50GHz Microwave Signal Analyzer',
    category: 'Testing Instruments',
    categoryKey: 'testing',
    organisationName: 'BITS Pilani RF Lab',
    isOrgVerified: true,
    location: 'Pilani, Rajasthan',
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: '₹800 / hr',
    iconType: Gauge,
  },
  {
    id: 'res-demo-6',
    title: 'BioFlo 320 Bioreactor Fermentation System',
    category: 'Laboratories',
    categoryKey: 'laboratories',
    organisationName: 'BioGen Analytical Center',
    isOrgVerified: true,
    location: 'HITEC City, Hyderabad',
    availabilityStatus: 'maintenance',
    accessLevel: 'approval_required',
    rate: 'Project Grant Sponsored',
    iconType: Microscope,
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTab, setPreviewTab] = useState('all')
  const [selectedDemoResource, setSelectedDemoResource] = useState<DemoResource | null>(null)

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      navigate(`/explore?q=${encodeURIComponent(query)}`)
    } else {
      navigate('/explore')
    }
  }

  const filteredDemoResources =
    previewTab === 'all'
      ? DEMO_RESOURCES
      : DEMO_RESOURCES.filter((r) => r.categoryKey === previewTab)

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900 selection:bg-brand-500 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION
          Headline: "Unlock Resources. Connect Communities. Share Responsibly."
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-neutral-200/80 bg-white pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(#1e3a8a 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline, Copy & Search */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                <span>Verified Multi-Organisation Sharing Network</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl leading-[1.12]">
                Unlock Resources.{' '}
                <span className="text-brand-600">Connect Communities.</span>{' '}
                Share Responsibly.
              </h1>

              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Discover equipment, spaces, laboratories, and technical facilities
                offered by verified organisations. Access the resources you need through
                a transparent, safety-first sharing platform.
              </p>

              {/* Functional Search Bar Form */}
              <form
                onSubmit={handleSearchSubmit}
                className="mt-6 flex flex-col sm:flex-row items-stretch gap-2.5 max-w-xl mx-auto lg:mx-0"
              >
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cleanrooms, H100 GPUs, microscopes, CNC mills..."
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>

                <Button type="submit" size="lg" className="rounded-xl px-6 py-3.5 shrink-0">
                  Search
                </Button>
              </form>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 text-xs text-neutral-500 pt-1">
                <span className="font-medium text-neutral-400">Popular:</span>
                {['Cleanroom ISO 5', 'GPU Cluster', 'Cryo-TEM', 'Bioprinter', '50GHz RF'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSearchQuery(tag)
                        navigate(`/explore?q=${encodeURIComponent(tag)}`)
                      }}
                      className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] text-neutral-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link to="/explore">
                  <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Explore Resources
                  </Button>
                </Link>

                <Link to="/register-org">
                  <Button variant="outline" size="lg" leftIcon={<Building2 className="h-4 w-4" />}>
                    Register Organisation
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column: Visually Engaging Resource-Sharing Illustration / Interactive Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-75" />

                {/* Interactive Hero Preview Card */}
                <div className="relative rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 font-bold text-xs border border-brand-200">
                        IIT
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900">
                          IIT Delhi Nanotech Center
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                          <ShieldCheck className="h-3 w-3 text-brand-600" />
                          <span>Accredited Tier-1 Facility</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="success" showDot size="sm">
                      Active Facility
                    </Badge>
                  </div>

                  {/* Resource highlight inside card */}
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-2xs">
                          <Microscope className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                            Laboratories
                          </p>
                          <h5 className="text-sm font-bold text-neutral-900 leading-tight">
                            Class 100 ISO 5 Cleanroom
                          </h5>
                        </div>
                      </div>
                      <Badge variant="primary">₹1,200/hr</Badge>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Lithography, e-beam evaporation, and sub-micron wafer processing.
                      Pre-session safety gowning briefing included.
                    </p>

                    <div className="flex flex-wrap items-center justify-between border-t border-neutral-200/60 pt-2.5 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1 font-medium text-neutral-700">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        Slot: Tomorrow 10:00 - 14:00
                      </span>
                      <span className="rounded bg-neutral-200/60 px-1.5 py-0.5 text-neutral-700 font-medium">
                        Approval Required
                      </span>
                    </div>
                  </div>

                  {/* Simulated check-in QR & Trust Indicator */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl border border-neutral-200 bg-white p-3 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-neutral-900 truncate">
                          QR Pass Check-in
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">
                          Automated custody
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white p-3 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-neutral-900 truncate">
                          Owner Controlled
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">
                          Custodian approvals
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. HOW IT WORKS SECTION (#how-it-works)
          Discover -> Check Eligibility -> Request Access -> Get Approval -> Use & Return
         ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-24 bg-white border-b border-neutral-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">
              Standardized Sharing Workflow
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-600 leading-relaxed">
              A 5-step, safety-first workflow designed to protect high-capital equipment
              while making advanced technical resources accessible across institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {HOW_IT_WORKS_STEPS.map((s, index) => {
              const Icon = s.icon
              return (
                <div
                  key={s.step}
                  className="relative flex flex-col items-center text-center p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group"
                >
                  {/* Step number badge */}
                  <span className="text-[11px] font-mono font-bold text-brand-600 mb-3 bg-brand-50 border border-brand-200/80 rounded-full px-2.5 py-0.5">
                    Step {s.step}
                  </span>

                  {/* Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-neutral-200 shadow-2xs group-hover:scale-105 group-hover:border-brand-300 transition-all text-brand-600 mb-4">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 mb-2">
                    {s.title}
                  </h3>

                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {s.description}
                  </p>

                  {/* Connector arrow on desktop */}
                  {index < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-neutral-300">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. RESOURCE CATEGORIES SECTION
          Laboratories, fabrication equipment, computers, cameras, meeting spaces, testing instruments, workshops
         ───────────────────────────────────────────────────────────── */}
      <section id="categories" className="py-20 sm:py-24 bg-neutral-50/60 border-b border-neutral-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">
                Specialized Equipment & Spaces
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Resource Categories
              </h2>
              <p className="mt-2 text-sm text-neutral-600 max-w-2xl">
                Browse shared resources by technical domain across all participating universities,
                laboratories, and makerspaces.
              </p>
            </div>

            <Link to="/explore" className="shrink-0">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Browse All Categories
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {RESOURCE_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/explore?category=${cat.id}`)}
                  className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs hover:border-brand-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${cat.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-400">
                        {cat.count}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-brand-700 transition-colors">
                      {cat.name}
                    </h3>

                    <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-brand-600 group-hover:text-brand-800">
                    <span>Explore resources</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. WHY SHARESPHERE SECTION
          Verified organisations, safety & eligibility, fair access, transparent booking history, cross-organisation discovery
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white border-b border-neutral-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">
              Purpose-Built Architecture
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Why ShareSphere
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-600 leading-relaxed">
              Traditional resource sharing relies on informal favors, fragmented spreadsheets,
              or zero accountability. ShareSphere provides institutional-grade governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_SHARESPHERE_PILLARS.map((p) => {
              const Icon = p.icon
              return (
                <Card key={p.title} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                        {p.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 mb-2">
                      {p.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </Card>
              )
            })}

            {/* Sixth highlight card: Security & RLS */}
            <Card className="flex flex-col justify-between border-brand-200 bg-brand-50/30">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-2xs">
                    <Lock className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-semibold text-brand-800">
                    Row Level Security
                  </span>
                </div>

                <h3 className="text-base font-bold text-neutral-900 mb-2">
                  PostgreSQL Row Level Isolation
                </h3>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Every booking request, user identity profile, and audit timestamp is isolated
                  by rigorous Supabase PostgreSQL policies. Only authorized custodians see sensitive details.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. RESOURCE DISCOVERY PREVIEW SECTION
          Display resource cards using demonstration data
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-neutral-50/70 border-b border-neutral-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block rounded-full bg-brand-50 px-3 py-0.5 text-xs font-semibold text-brand-700 uppercase tracking-wider">
                  Live Platform Preview
                </span>
                <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Demonstration Data (Backend Pending)
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Featured Shared Resources
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Explore real-world technical instruments currently shared by partner universities and research centers.
              </p>
            </div>

            <Link to="/explore">
              <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Explore All 240+ Listings
              </Button>
            </Link>
          </div>

          {/* Category Filter Tabs */}
          <Tabs
            tabs={[
              { id: 'all', label: 'All Equipment' },
              { id: 'laboratories', label: 'Laboratories' },
              { id: 'computers', label: 'Computing' },
              { id: 'fabrication', label: 'Fabrication' },
              { id: 'cameras', label: 'Imaging' },
              { id: 'testing', label: 'Testing' },
            ]}
            activeTab={previewTab}
            onChange={setPreviewTab}
            variant="pill"
            className="mb-8"
          />

          {/* Cards Grid using ResourceCard component */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDemoResources.map((res) => {
              const Icon = res.iconType
              return (
                <ResourceCard
                  key={res.id}
                  id={res.id}
                  title={res.title}
                  category={res.category}
                  organisationName={res.organisationName}
                  isOrgVerified={res.isOrgVerified}
                  location={res.location}
                  availabilityStatus={res.availabilityStatus}
                  accessLevel={res.accessLevel}
                  rate={res.rate}
                  icon={<Icon className="h-8 w-8 text-brand-600" />}
                  onViewDetails={() => setSelectedDemoResource(res)}
                  onRequestAccess={() => setSelectedDemoResource(res)}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. ORGANISATION CALL TO ACTION SECTION (#organisations)
          How an organisation can register, complete verification, and list resources
         ───────────────────────────────────────────────────────────── */}
      <section id="organisations" className="scroll-mt-16 py-20 sm:py-24 bg-white border-b border-neutral-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-neutral-900 p-8 sm:p-12 lg:p-16 text-white shadow-xl relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <span className="inline-block rounded-full bg-brand-500/20 border border-brand-400/30 px-3.5 py-1 text-xs font-semibold text-brand-300 uppercase tracking-wider">
                  For Universities, Labs & Makerspaces
                </span>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Put Underused Assets to Work.{' '}
                  <span className="text-brand-400">Empower Research.</span>
                </h2>

                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl">
                  High-capital scientific and fabrication resources often operate below 35% utilization.
                  Register your institution on ShareSphere to securely share available capacity,
                  collaborate with peer researchers, and generate funding or inter-institutional credits.
                </p>

                {/* 3 Step onboarding list */}
                <div className="space-y-3 pt-2 text-xs text-neutral-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">1. Submit Institutional Verification:</strong>{' '}
                      Register using your verified academic or laboratory domain and MOU agreement.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">2. Set Access Rules & Required Training:</strong>{' '}
                      You define slot availability, safety certifications, and hourly rates or mutual sharing credits.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">3. Review Requests & Scan QR Passes:</strong>{' '}
                      Approve qualified reservations and audit usage with digital check-in logs.
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <Link to="/register-org">
                    <Button
                      size="lg"
                      className="bg-brand-500 text-white hover:bg-brand-400 font-bold shadow-md"
                      leftIcon={<Building2 className="h-4 w-4" />}
                    >
                      Register Organisation
                    </Button>
                  </Link>

                  <Link to="/help">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
                      leftIcon={<HelpCircle className="h-4 w-4" />}
                    >
                      Institutional FAQ & SLA
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right column: Highlights */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-800/60 p-4">
                  <h4 className="text-2xl font-bold text-brand-400">100%</h4>
                  <p className="text-xs font-semibold text-white mt-1">
                    Owner Approval Control
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    No resource is reserved without custodian consent.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-800/60 p-4">
                  <h4 className="text-2xl font-bold text-brand-400">Digital</h4>
                  <p className="text-xs font-semibold text-white mt-1">
                    QR Chain of Custody
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Real-time condition checklist at check-in & check-out.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-800/60 p-4">
                  <h4 className="text-2xl font-bold text-brand-400">Audited</h4>
                  <p className="text-xs font-semibold text-white mt-1">
                    Safety Prerequisite Gate
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Enforces operator certifications before booking.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-800/60 p-4">
                  <h4 className="text-2xl font-bold text-brand-400">SLA</h4>
                  <p className="text-xs font-semibold text-white mt-1">
                    Institutional Protection
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Standardized liability and indemnification frameworks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. TRUST AND SAFETY SECTION
          Owners control access, restricted resources require appropriate approvals
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white border-b border-neutral-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-3">
              Safety & Compliance First
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Owner-Controlled Access. Institutional Accountability.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-600 leading-relaxed">
              We recognize that shared laboratory equipment and hazardous facilities
              cannot be booked like casual consumer goods. ShareSphere is designed with
              defense-in-depth safety checks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Owners Retain Authority
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Host institutions define exact availability windows, minimum operator qualifications,
                and review every applicant's research abstract before granting entry.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Restricted Resource Gate
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Hazardous materials, lasers, and high-voltage systems require upload and verification
                of specialized institutional safety certifications before booking.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                QR Verification & Condition
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Physical check-ins require scanning on-site QR passes and completing pre- and post-session
                hardware condition checklists to guarantee accountability.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Inter-Institutional MOU
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Participating colleges, institutes, and enterprises sign standard bilateral
                or multilateral agreements addressing liability, insurance, and intellectual property.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Resource Details Modal */}
      {selectedDemoResource && (
        <Modal
          isOpen={Boolean(selectedDemoResource)}
          onClose={() => setSelectedDemoResource(null)}
          title={selectedDemoResource.title}
          description={`Hosted by ${selectedDemoResource.organisationName} • ${selectedDemoResource.location}`}
          size="lg"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDemoResource(null)}
              >
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedDemoResource(null)
                  navigate('/join')
                }}
              >
                Join to Request Access
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Demonstration Preview Listing:</strong> Real booking requests will connect to
                Supabase Auth and Row Level Security when backend configuration is populated.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
                <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                  Category
                </span>
                <span className="font-semibold text-neutral-800 text-sm">
                  {selectedDemoResource.category}
                </span>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
                <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                  Sharing Rate
                </span>
                <span className="font-semibold text-neutral-800 text-sm">
                  {selectedDemoResource.rate}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
              <h5 className="font-bold text-neutral-900 text-xs">Access Requirements:</h5>
              <ul className="list-disc pl-4 space-y-1 text-neutral-600 text-xs">
                <li>Institutional email verification from accredited university or research lab.</li>
                <li>Signed supervisor or project PI authorization letter.</li>
                <li>Standard lab safety and chemical hazard clearance (Level-2).</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
