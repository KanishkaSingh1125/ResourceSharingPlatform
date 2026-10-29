import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Alert, Button, Card, Input, Textarea } from '@/components/ui'
import { getResources } from '@/services/resourceService'
import { checkResourceAvailability, getAvailableSlots } from '@/services/bookingService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { type Resource } from '@/types/resource'

interface Match {
  resource: Resource
  reasons: string[]
  availability: 'not_checked' | 'available' | 'unavailable'
  availabilityReason?: string
  suggestedSlots?: string[]
}

const STOP_WORDS = new Set([
  'we', 'need', 'a', 'an', 'the', 'for', 'on', 'at', 'in', 'of', 'with', 'and',
  'to', 'our', 'please', 'find', 'resource', 'available', 'use', 'this',
])

function describeRequest(text: string) {
  const lowered = text.toLowerCase()
  const categoryTerms: Array<[string, string[]]> = [
    ['Laboratories', ['lab', 'laboratory', 'cleanroom']],
    ['Computers & High-Compute', ['computer', 'compute', 'gpu', 'cluster', 'server']],
    ['Meeting & Event Spaces', ['meeting', 'event', 'classroom', 'hall', 'conference']],
    ['Cameras & Imaging', ['camera', 'imaging', 'video']],
    ['Testing & Measurement', ['testing', 'measurement', 'analyzer', 'measurement']],
    ['Fabrication & 3D Printing', ['fabrication', '3d', 'printing']],
    ['Chemical & Bio Processing', ['chemical', 'bio', 'processing']],
  ]
  const category = categoryTerms.find(([, words]) => words.some((word) => lowered.includes(word)))?.[0]
  const capacityMatch = lowered.match(/\b(\d{1,4})\s*(?:students|people|attendees|users|seats|participants)?\b/)
  const capacity = capacityMatch ? Number(capacityMatch[1]) : undefined
  const keywords = lowered
    .replace(/\b\d+\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  return { category, capacity, keywords }
}

function formatRate(resource: Resource) {
  if (resource.rate.unit === 'free' || resource.rate.amount === 0) return 'No listed cost'
  return `${new Intl.NumberFormat(undefined, { style: 'currency', currency: resource.rate.currency }).format(resource.rate.amount)} / ${resource.rate.unit}`
}

export function AlternativeFinder({ onOpenResource }: { onOpenResource: (resource: Resource) => void }) {
  const [request, setRequest] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const findMatches = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorText(null)
    setSearched(true)
    setMatches([])
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Alternative matching needs the connected resource catalogue. Connect to the backend and try again.')
      }
      if (!request.trim()) throw new Error('Describe the resource or capability you need.')
      if (Boolean(startTime) !== Boolean(endTime)) {
        throw new Error('Enter both a start and end time to check a permitted booking window.')
      }
      if (startTime && endTime && new Date(startTime).getTime() >= new Date(endTime).getTime()) {
        throw new Error('The requested end time must be after the start time.')
      }
      const { data: organisations, error: organisationsError } = await supabase
        .from('organisations')
        .select('id,name,verification_status')
        .eq('verification_status', 'approved')
      if (organisationsError) throw new Error(`Could not verify organisations: ${organisationsError.message}`)
      const approvedOrgs = new Map((organisations || []).map((org: { id: string; name: string }) => [org.id, org.name]))
      const firstPage = await getResources({ page: 1, limit: 100 })
      const pages = await Promise.all(
        Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
          getResources({ page: index + 2, limit: 100 })
        )
      )
      const resources = [firstPage, ...pages]
        .flatMap((page) => page.items)
        .filter((resource) => approvedOrgs.has(resource.organisationId))
        .map((resource) => ({ ...resource, organisationName: approvedOrgs.get(resource.organisationId) || resource.organisationName }))
      const parsed = describeRequest(request)
      const ranked = resources
        .map((resource) => {
          const text = `${resource.title} ${resource.category} ${resource.description} ${resource.location.city}`.toLowerCase()
          const keywordHits = parsed.keywords.filter((keyword) => text.includes(keyword))
          const reasons: string[] = []
          if (parsed.category && resource.category === parsed.category) reasons.push(`Matches requested category: ${resource.category}`)
          if (parsed.capacity && resource.capacity && resource.capacity >= parsed.capacity) reasons.push(`Capacity ${resource.capacity} meets the requested ${parsed.capacity}`)
          if (parsed.capacity && resource.capacity && resource.capacity < parsed.capacity) reasons.push(`Capacity ${resource.capacity} is below the requested ${parsed.capacity}`)
          if (parsed.category && resource.category !== parsed.category) reasons.push(`Alternative category: ${resource.category}`)
          if (keywordHits.length) reasons.push(`Relevant to: ${keywordHits.slice(0, 3).join(', ')}`)
          if (resource.isAccessible) reasons.push('Accessible resource')
          if (resource.requiredCredentials.length) reasons.push(`Eligibility requires: ${resource.requiredCredentials.join(', ')}`)
          return { resource, reasons, score: keywordHits.length + (resource.category === parsed.category ? 3 : 0) + (resource.capacity && parsed.capacity && resource.capacity >= parsed.capacity ? 2 : 0) }
        })
        .filter(({ resource, reasons }) => resource.availabilityStatus !== 'unavailable' && resource.availabilityStatus !== 'maintenance' && reasons.length > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)

      const checked: Match[] = await Promise.all(ranked.map(async ({ resource, reasons }) => {
        if (!startTime || !endTime) return { resource, reasons, availability: 'not_checked' }
        const result = await checkResourceAvailability(resource.id, new Date(startTime).toISOString(), new Date(endTime).toISOString())
        let suggestedSlots: string[] = []
        if (!result.isAvailable) {
          const date = startTime.slice(0, 10)
          const duration = Math.ceil((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000)
          const slots = await getAvailableSlots(resource.id, date, duration)
          suggestedSlots = slots.slice(0, 3).map((slot) => `${date} · ${slot.startTime}–${slot.endTime}`)
        }
        return {
          resource,
          reasons,
          availability: result.isAvailable ? 'available' : 'unavailable',
          availabilityReason: result.conflictReason,
          suggestedSlots,
        }
      }))
      setMatches(checked)
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Alternative matches could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2 text-brand-700"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Smart Alternative Finder</h2>
          <p className="mt-1 text-sm text-neutral-600">Describe what you need. We will compare it with verified organisations and the real resource catalogue.</p>
        </div>
      </div>

      <Alert variant="info" title="Transparent catalogue matching">
        An AI recommendation service and utilisation feed are not configured in this deployment.
        These results use a deterministic catalogue match, not AI; no usage estimates are presented.
        A resource listing does not guarantee a time slot—availability is checked below only when
        you provide a full time window, and eligibility is rechecked in booking.
      </Alert>

      <form onSubmit={findMatches} className="space-y-4">
        <Textarea
          label="What do you need?"
          placeholder="For example: We need a computer lab for 20 students on Saturday afternoon."
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          required
          rows={3}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Requested start (optional)" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          <Input label="Requested end (optional)" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </div>
        <Button type="submit" disabled={loading} isLoading={loading}>Find alternatives</Button>
      </form>

      {errorText && <Alert variant="error" title="Could not find alternatives">{errorText}</Alert>}
      {searched && !loading && !errorText && matches.length === 0 && (
        <Alert variant="warning" title="No suitable catalogue matches">
          Try a broader need or search by a different resource category. Recommendations cannot
          override organisation eligibility or booking approval.
        </Alert>
      )}
      {matches.length > 0 && (
        <div className="space-y-3">
          {matches.map(({ resource, reasons, availability, availabilityReason, suggestedSlots }) => (
            <article key={resource.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-900">{resource.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{resource.organisationName} · {resource.category}</p>
                  <p className="mt-1 text-sm text-neutral-600">{resource.location.city} · capacity {resource.capacity ?? 'not listed'} · {formatRate(resource)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpenResource(resource)}>
                  Continue to booking <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-sm font-medium text-neutral-700">Why it may fit</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-600">
                {reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <div className={`mt-3 rounded-md p-3 text-sm ${availability === 'unavailable' ? 'bg-amber-50 text-amber-900' : 'bg-neutral-50 text-neutral-700'}`}>
                {availability === 'available'
                  ? 'Backend availability check passed for this requested window. Booking eligibility and approval still apply.'
                  : availability === 'unavailable'
                    ? `Not available for the requested window: ${availabilityReason || 'conflicting reservation or resource restriction'}.`
                    : 'No booking time was checked. Confirm authoritative availability in the booking workflow.'}
                {availability === 'unavailable' && (
                  <p className="mt-2">
                    {suggestedSlots?.length
                      ? `Other open slots returned by the backend: ${suggestedSlots.join('; ')}.`
                      : 'No alternative slot was returned for that date. Try another date or category.'}
                  </p>
                )}
              </div>
              {resource.requiredCredentials.length > 0 && (
                <p className="mt-2 text-xs text-neutral-500">Eligibility requirements: {resource.requiredCredentials.join(', ')}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}
