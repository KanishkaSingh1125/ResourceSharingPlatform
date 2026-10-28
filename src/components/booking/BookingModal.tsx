import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Send,
  Loader2,
  QrCode,
} from 'lucide-react'
import {
  Modal,
  Button,
  Input,
  Textarea,
  Badge,
  useToast,
} from '@/components/ui'
import { type Resource } from '@/types/resource'
import { type EligibilityCheckResult } from '@/types/eligibility'
import { checkUserResourceEligibility } from '@/services/eligibilityService'
import { checkResourceAvailability, createBooking } from '@/services/bookingService'
import { getCurrentProfile } from '@/services/authService'

export interface BookingModalProps {
  resource: Resource | null
  isOpen: boolean
  onClose: () => void
  initialDate?: string
  initialTime?: string
  onBookingSuccess?: () => void
}

export function BookingModal({
  resource,
  isOpen,
  onClose,
  initialDate,
  initialTime,
  onBookingSuccess,
}: BookingModalProps) {
  const { success, error, warning } = useToast()
  const navigate = useNavigate()

  const [minDate] = useState(() => new Date().toISOString().split('T')[0])
  const [date, setDate] = useState(() => initialDate || new Date(Date.now() + 86400000).toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(initialTime || '09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [purpose, setPurpose] = useState('')
  const [attendeesCount, setAttendeesCount] = useState(1)
  const [specialRequirements, setSpecialRequirements] = useState('')

  const [eligibility, setEligibility] = useState<EligibilityCheckResult | null>(null)
  const [eligibilityError, setEligibilityError] = useState<{
    resourceId: string
    message: string
  } | null>(null)
  const [availabilityResult, setAvailabilityResult] = useState<{ isAvailable: boolean; conflictReason?: string } | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingConfirmedCode, setBookingConfirmedCode] = useState<string | null>(null)

  const handleModalClose = () => {
    setEligibility(null)
    setEligibilityError(null)
    setBookingConfirmedCode(null)
    onClose()
  }

  // Run eligibility check when resource changes
  useEffect(() => {
    let isMounted = true
    if (!resource || !isOpen) return

    getCurrentProfile()
      .then((profile) => checkUserResourceEligibility(profile.id, resource.id))
      .then((res) => {
        if (isMounted) {
          setEligibility(res)
        }
      })
      .catch((err) => {
        console.error('Eligibility check error:', err)
        if (isMounted) {
          setEligibilityError(
            {
              resourceId: resource.id,
              message: err instanceof Error ? err.message : 'Eligibility could not be verified.',
            }
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [resource, isOpen])

  // Real-time slot availability check
  useEffect(() => {
    let isMounted = true
    if (!resource || !date || !startTime || !endTime) return

    const startISO = `${date}T${startTime}:00`
    const endISO = `${date}T${endTime}:00`

    checkResourceAvailability(resource.id, startISO, endISO)
      .then((res) => {
        if (isMounted) {
          setAvailabilityResult(res)
          setCheckingAvailability(false)
        }
      })
      .catch(() => {
        if (isMounted) setCheckingAvailability(false)
      })

    return () => {
      isMounted = false
    }
  }, [resource, date, startTime, endTime])

  if (!resource) return null

  const currentEligibility =
    eligibility?.resourceId === resource.id ? eligibility : null
  const currentEligibilityError =
    eligibilityError?.resourceId === resource.id ? eligibilityError.message : null
  const checkingEligibility =
    isOpen && currentEligibility === null && currentEligibilityError === null

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!purpose.trim()) {
      warning('Missing Field', 'Please provide a clear statement of research/operational purpose.')
      return
    }

    if (!currentEligibility?.isEligible) {
      error(
        'Booking Not Available',
        currentEligibility?.blockingReasons.join(' ') ||
          currentEligibilityError ||
          'Eligibility has not been verified.'
      )
      return
    }

    if (availabilityResult?.isAvailable !== true) {
      error(
        'Conflict Detected',
        availabilityResult?.conflictReason || 'Resource is not available.'
      )
      return
    }

    const startISO = `${date}T${startTime}:00Z`
    const endISO = `${date}T${endTime}:00Z`

    try {
      setSubmitting(true)
      const newBooking = await createBooking({
        resourceId: resource.id,
        startTime: startISO,
        endTime: endISO,
        purpose: purpose.trim(),
        attendeesCount,
        specialRequirements: specialRequirements.trim() || undefined,
      })

      success(
        'Reservation Submitted',
        newBooking.status === 'approved'
          ? 'Your booking is confirmed! QR check-in pass has been generated.'
          : 'Your booking request has been submitted for facility manager approval.'
      )

      setBookingConfirmedCode(newBooking.qrPassCode || 'SPHERE-PASS-CONFIRMED')

      if (onBookingSuccess) {
        onBookingSuccess()
      }
    } catch (err) {
      error('Reservation Failed', err instanceof Error ? err.message : 'Could not submit booking request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      size="xl"
      title={bookingConfirmedCode ? 'Booking Confirmed' : `Request Booking: ${resource.title}`}
      description={
        bookingConfirmedCode
          ? 'Your reservation is active. Present this digital pass code during facility check-in.'
          : `${resource.category} • ${resource.organisationName}`
      }
      footer={
        bookingConfirmedCode ? (
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={handleModalClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleModalClose()
                navigate('/dashboard/bookings')
              }}
            >
              View in My Bookings
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={handleModalClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="booking-request-form"
              variant="primary"
              size="sm"
              disabled={
                submitting ||
                checkingEligibility ||
                currentEligibility === null ||
                !currentEligibility.isEligible ||
                checkingAvailability ||
                availabilityResult?.isAvailable !== true
              }
              isLoading={submitting}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Submit Reservation Request
            </Button>
          </div>
        )
      }
    >
      {bookingConfirmedCode ? (
        <div className="space-y-6 text-center py-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold text-neutral-900">Reservation Confirmed</h4>
            <p className="text-xs text-neutral-500">
              Reserved window: {date} ({startTime} - {endTime})
            </p>
          </div>

          {/* QR Code Pass Box */}
          <div className="mx-auto max-w-xs p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700">
              <QrCode className="h-4 w-4 text-brand-600" />
              <span>Digital Security Check-In Pass</span>
            </div>
            <div className="p-3 bg-white border border-neutral-200 rounded-lg font-mono text-sm font-bold text-neutral-900 tracking-wider">
              {bookingConfirmedCode}
            </div>
            <p className="text-[11px] text-neutral-400">
              Scan or show this token to facility security at {resource.location.building}.
            </p>
          </div>
        </div>
      ) : (
        <form id="booking-request-form" onSubmit={handleFormSubmit} className="space-y-5 text-xs">
          {/* Resource Snapshot Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 text-sm">{resource.title}</span>
                <Badge variant={resource.availabilityStatus === 'available' ? 'success' : 'default'} size="sm">
                  {resource.availabilityStatus}
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-neutral-400" />
                {resource.location.building}, {resource.location.city}
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-neutral-200 sm:pl-4">
              <span className="text-[11px] text-neutral-400 block">Access Rate</span>
              <span className="text-sm font-bold text-neutral-900">
                ${resource.rate.amount}
              </span>
              <span className="text-[10px] text-neutral-500">/{resource.rate.unit}</span>
            </div>
          </div>

          {/* Eligibility Breakdown Banner */}
          {checkingEligibility ? (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              <span>Verifying your institutional clearance and training certifications...</span>
            </div>
          ) : currentEligibilityError ? (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Eligibility Could Not Be Verified</p>
                <p className="text-[11px] text-red-800">{currentEligibilityError}</p>
                <p className="text-[11px] text-red-800">
                  Booking is unavailable until eligibility can be checked. Please retry or contact your organisation administrator.
                </p>
              </div>
            </div>
          ) : currentEligibility ? (
            currentEligibility.isEligible ? (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Eligible to Book</p>
                  {currentEligibility.advisoryNotes.length > 0 && (
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-800">
                      {currentEligibility.advisoryNotes.map((note, idx) => (
                        <li key={`${idx}-${note}`}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>Booking Not Available</span>
                </div>
                {currentEligibility.blockingReasons.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-red-800">
                    {currentEligibility.blockingReasons.map((reason, idx) => (
                      <li key={`${idx}-${reason}`}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-red-800">
                    The eligibility service has not provided a reason. Contact your organisation administrator for assistance.
                  </p>
                )}
                <p className="text-[11px] text-red-800">
                  Resolve the listed requirements with your organisation administrator, then check eligibility again.
                </p>
                {currentEligibility.advisoryNotes.length > 0 && (
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-red-800">
                    {currentEligibility.advisoryNotes.map((note, idx) => (
                      <li key={`advisory-${idx}-${note}`}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          ) : (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900">
              <p className="font-semibold">Eligibility Has Not Been Verified</p>
              <p className="text-[11px] text-red-800">
                Booking is unavailable until eligibility can be checked.
              </p>
            </div>
          )}

          {/* Date & Time Selection */}
          <div className="space-y-3">
            <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-600" />
              Select Date & Time Window
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Reservation Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Real-time Availability status indicator */}
            <div className="text-[11px] pt-1">
              {checkingAvailability ? (
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                  Verifying calendar availability...
                </span>
              ) : availabilityResult ? (
                availabilityResult.isAvailable ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Time slot is open and available for reservation.
                  </span>
                ) : (
                  <span className="text-red-700 font-medium flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    {availabilityResult.conflictReason}
                  </span>
                )
              ) : null}
            </div>
          </div>

          {/* Attendees and Purpose */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Attendees / Operators Count
                </label>
                <Input
                  type="number"
                  min={1}
                  max={resource.capacity || 20}
                  value={attendeesCount}
                  onChange={(e) => setAttendeesCount(parseInt(e.target.value, 10) || 1)}
                  required
                />
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  Capacity limit: {resource.capacity || 'Not specified'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Research / Work Purpose <span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={2}
                  placeholder="Describe your research experiment, grant scope, or testing protocol..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Special Equipment / Reagent Handling Requirements (Optional)
              </label>
              <Input
                placeholder="e.g. Requires sub-zero sample chiller box or specific gas line hookup"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
