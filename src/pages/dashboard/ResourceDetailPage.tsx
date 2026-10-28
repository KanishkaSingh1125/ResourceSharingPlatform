import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Lock,
  ArrowLeft,
  Share2,
  Check,
  ChevronRight,
} from 'lucide-react'
import {
  Badge,
  Card,
  CardHeader,
  CardContent,
  Button,
  Table,
  TableBody,
  TableRow,
  TableCell,
  useToast,
  Alert,
} from '@/components/ui'
import { BookingModal } from '@/components/booking/BookingModal'
import { getResourceById, getResources } from '@/services/resourceService'
import { checkUserResourceEligibility } from '@/services/eligibilityService'
import { getCurrentProfile } from '@/services/authService'
import { type Resource } from '@/types/resource'
import { type EligibilityCheckResult } from '@/types/eligibility'

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success } = useToast()

  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [eligibility, setEligibility] = useState<EligibilityCheckResult | null>(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)
  const [relatedResources, setRelatedResources] = useState<Resource[]>([])

  // Quick reservation panel state
  const [minDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (!id) return

    getResourceById(id)
      .then((res) => {
        if (!isMounted) return
        if (!res) {
          setErrorText(`Resource with ID "${id}" could not be found.`)
          setLoading(false)
          return
        }

        setErrorText(null)
        setResource(res)
        setLoading(false)

        // Load user eligibility
        setEligibility(null)
        setEligibilityError(null)
        setCheckingEligibility(true)
        getCurrentProfile()
          .then((prof) => checkUserResourceEligibility(prof.id, res.id))
          .then((elig) => {
            if (isMounted) {
              setEligibility(elig)
              setCheckingEligibility(false)
            }
          })
          .catch((err) => {
            console.error('Failed to check resource eligibility:', err)
            if (isMounted) {
              setEligibilityError(
                err instanceof Error ? err.message : 'Eligibility could not be verified.'
              )
              setCheckingEligibility(false)
            }
          })

        // Load related category items
        getResources({ category: res.category, limit: 3 })
          .then((p) => {
            if (isMounted) {
              setRelatedResources(p.items.filter((item) => item.id !== res.id))
            }
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (isMounted) {
          setErrorText(err instanceof Error ? err.message : 'Failed to retrieve resource.')
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const handleShareLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    success('Link Copied', 'Resource URL copied to your clipboard.')
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-72 bg-neutral-200 rounded-xl animate-pulse" />
            <div className="h-32 bg-neutral-200 rounded-xl animate-pulse" />
          </div>
          <div className="h-96 bg-neutral-200 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (errorText || !resource) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Resource Unavailable or Not Found</h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
          {errorText || 'The requested equipment or facility may have been unlisted or requires elevated security clearance.'}
        </p>
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/dashboard/discover')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Resource Discovery
          </Button>
        </div>
      </div>
    )
  }

  const isAvailable = resource.availabilityStatus === 'available'
  const isMaintenance = resource.availabilityStatus === 'maintenance'
  const isUnavailable = resource.availabilityStatus === 'unavailable'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Breadcrumb & Action Header ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link to="/dashboard/discover" className="hover:text-brand-600 transition-colors">
            Discover
          </Link>
          <ChevronRight className="h-3 w-3 text-neutral-300" />
          <span className="text-neutral-700 font-medium">{resource.category}</span>
          <ChevronRight className="h-3 w-3 text-neutral-300" />
          <span className="text-neutral-900 font-semibold truncate max-w-xs">{resource.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShareLink}>
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share Resource
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={
              !isAvailable ||
              checkingEligibility ||
              eligibility === null ||
              !eligibility.isEligible
            }
            onClick={() => setIsBookingModalOpen(true)}
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Request Booking
          </Button>
        </div>
      </div>

      {/* ── Status Banner (When Not Fully Available) ──────────── */}
      {isMaintenance && (
        <Alert
          variant="warning"
          title="Scheduled Maintenance Notice"
        >
          This instrumentation is currently undergoing scheduled laser calibration and diagnostic
          validation. Future reservation requests for next week remain open.
        </Alert>
      )}

      {isUnavailable && (
        <Alert
          variant="error"
          title="Resource Temporarily Unavailable"
        >
          The host facility has temporarily suspended new reservation requests for this asset pending
          annual safety review.
        </Alert>
      )}

      {/* ── Main Detail Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photos, Overview, Technical Specs, Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos Showcase */}
          <div className="space-y-3">
            <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 shadow-xs">
              <img
                src={resource.images[activeImageIndex] || resource.images[0]}
                alt={resource.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <Badge variant={isAvailable ? 'success' : isMaintenance ? 'warning' : 'error'} size="md">
                  {resource.availabilityStatus}
                </Badge>
                <Badge variant="default" size="md">
                  {resource.resourceType}
                </Badge>
                {resource.isAccessible && (
                  <Badge variant="purple" size="md">
                    Barrier-Free Facility
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnail switcher if multiple images */}
            {resource.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {resource.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-16 w-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx ? 'border-brand-600 ring-2 ring-brand-500/30' : 'border-neutral-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description & Overview Card */}
          <Card>
            <CardHeader
              title="Equipment & Facility Overview"
              subtitle={`Offered by ${resource.organisationName} • Campus: ${resource.location.campus}`}
            />
            <CardContent className="space-y-4 text-xs leading-relaxed text-neutral-700">
              <p className="text-sm text-neutral-800 leading-relaxed font-normal">
                {resource.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-100">
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Category</span>
                  <span className="font-semibold text-neutral-900 mt-0.5 block truncate">
                    {resource.category}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Access Policy</span>
                  <span className="font-semibold text-neutral-900 mt-0.5 block capitalize">
                    {resource.accessLevel.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Operator Capacity</span>
                  <span className="font-semibold text-neutral-900 mt-0.5 block">
                    {resource.capacity ? `${resource.capacity} Personnel` : 'Standard Slot'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Accessibility</span>
                  <span className="font-semibold text-emerald-700 mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ADA Accessible
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications Table */}
          {resource.specifications && Object.keys(resource.specifications).length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-neutral-100">
                <h3 className="font-semibold text-sm text-neutral-900">Technical Specifications</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verified hardware configurations, precision ratings, and physical capabilities.
                </p>
              </div>
              <Table>
                <TableBody>
                  {Object.entries(resource.specifications).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="w-1/3 font-medium text-xs text-neutral-600 bg-neutral-50/50">
                        {key}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-neutral-900">
                        {value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Required Credentials & User Eligibility Checklist */}
          <Card>
            <CardHeader
              title="Required Credentials & Safety Clearances"
              subtitle="Verified certifications required by the host institution before unsupervised or shared access."
            />
            <CardContent className="space-y-3">
              {resource.requiredCredentials.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>No specialized laboratory safety certificates required for standard reservation.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {resource.requiredCredentials.map((cred, idx) => {
                    const isMatched = eligibility?.userMatchedCredentials?.includes(cred)
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                          isMatched
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isMatched ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          <span className="font-medium">{cred}</span>
                        </div>
                        <Badge variant={isMatched ? 'success' : 'default'} size="sm">
                          {isMatched ? 'Verified on File' : 'Prerequisite'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Eligibility Diagnostic Alert */}
              {checkingEligibility ? (
                <Alert variant="info" title="Checking Eligibility">
                  Verifying your eligibility and the host organisation's requirements.
                </Alert>
              ) : eligibilityError ? (
                <Alert variant="error" title="Eligibility Could Not Be Verified">
                  <p>{eligibilityError}</p>
                  <p className="mt-1">
                    Booking is unavailable until eligibility can be checked. Please retry or contact your organisation administrator.
                  </p>
                </Alert>
              ) : eligibility ? (
                <div
                  className={`p-3 rounded-lg border text-xs mt-3 ${
                    eligibility.isEligible
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    {eligibility.isEligible ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Eligible to Book
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        Booking Not Available
                      </>
                    )}
                  </p>
                  {!eligibility.isEligible && (
                    <>
                      {eligibility.blockingReasons.length > 0 ? (
                        <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-[11px] text-red-800">
                          {eligibility.blockingReasons.map((reason, i) => (
                            <li key={`${i}-${reason}`}>{reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-red-800">
                          The eligibility service has not provided a reason. Contact your organisation administrator for assistance.
                        </p>
                      )}
                      <p className="mt-1.5 text-[11px] text-red-800">
                        Resolve the listed requirements with your organisation administrator, then check eligibility again.
                      </p>
                    </>
                  )}
                  {eligibility.advisoryNotes.length > 0 && (
                    <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-[11px]">
                      {eligibility.advisoryNotes.map((note, i) => (
                        <li key={`advisory-${i}-${note}`}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Alert variant="error" title="Eligibility Has Not Been Verified">
                  Booking is unavailable until eligibility can be checked.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Usage Rules & Booking Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Operating Rules & Safety Code" />
              <CardContent>
                <ul className="space-y-2 text-xs text-neutral-600">
                  {resource.usageRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-brand-600 font-bold">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Booking & Check-In Conditions" />
              <CardContent>
                <ul className="space-y-2 text-xs text-neutral-600">
                  {resource.bookingConditions.map((cond, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{cond}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Sticky Quick Reservation Card & Host Org Profile */}
        <div className="space-y-6">
          {/* Reservation Card */}
          <Card className="sticky top-20 border-brand-200 shadow-md">
            <div className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-neutral-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Exchange Rate</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-neutral-900">${resource.rate.amount}</span>
                    <span className="text-xs text-neutral-500">/{resource.rate.unit}</span>
                  </div>
                </div>
                <Badge variant={isAvailable ? 'success' : 'default'} size="sm">
                  {resource.availabilityStatus}
                </Badge>
              </div>

              {/* Slot Selector */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Select Target Date
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px]">
                  Available times are loaded from the backend after you choose a date and duration.
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  disabled={
                    !isAvailable ||
                    checkingEligibility ||
                    eligibility === null ||
                    !eligibility.isEligible
                  }
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Choose an available time
                </Button>

                <p className="text-[11px] text-neutral-400 text-center">
                  Cancellation and rescheduling follow the host organisation&apos;s policy.
                </p>
              </div>
            </div>
          </Card>

          {/* Owner Organisation Card (Without leaking private personal info) */}
          <Card>
            <CardHeader title="Host Organisation" />
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-brand-700">
                  <Building2 className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-900">{resource.organisationName}</span>
                    <span title="Verified Tier 1 Member">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                    </span>
                  </div>
                  <span className="text-neutral-500 text-[11px] capitalize">
                    {resource.organisationType || 'Academic Research Center'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-neutral-600">
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0 mt-0.5" />
                  <span>
                    {resource.location.building}, {resource.location.address}, {resource.location.city}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Inter-College Sharing Consortium Member</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Resources in this Category */}
          {relatedResources.length > 0 && (
            <Card>
              <CardHeader title={`Similar in ${resource.category}`} />
              <CardContent className="space-y-3">
                {relatedResources.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/dashboard/resources/${rel.id}`}
                    className="group block p-2.5 rounded-lg border border-neutral-200 hover:border-brand-300 hover:bg-neutral-50 transition-colors"
                  >
                    <p className="font-medium text-xs text-neutral-800 group-hover:text-brand-700 truncate">
                      {rel.title}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                      <span>{rel.location.city}</span>
                      <span className="font-semibold text-neutral-900">${rel.rate.amount}/{rel.rate.unit}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Booking Modal Workflow ───────────────────────────── */}
      <BookingModal
        key={selectedDate}
        resource={resource}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialDate={selectedDate}
      />
    </div>
  )
}
