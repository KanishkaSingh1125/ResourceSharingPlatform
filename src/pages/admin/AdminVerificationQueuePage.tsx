import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react'
import {
  PageHeader,
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Modal,
  Textarea,
  useToast,
  SearchBar,
} from '@/components/ui'
import {
  getAllOrganisations,
  setOrganisationVerificationStatus,
  setCurrentOrganisationId,
} from '@/services/organisationService'
import {
  type Organisation,
  type VerificationStatus,
} from '@/types/organisation'

export function AdminVerificationQueuePage() {
  const { success, error, info } = useToast()
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'action_required' | 'approved' | 'rejected'>('pending')

  // Selected organisation for document audit modal
  const [inspectOrg, setInspectOrg] = useState<Organisation | null>(null)

  // Reviewer Action Modal State (e.g. Request Info or Reject)
  const [actionOrg, setActionOrg] = useState<Organisation | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'request_info' | 'reject' | 'under_review'>('request_info')
  const [reviewerNote, setReviewerNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    let isMounted = true
    getAllOrganisations()
      .then((data) => {
        if (isMounted) {
          setOrganisations(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (isMounted) {
          setLoading(false)
          error('Error', 'Failed to retrieve organisations in queue.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [error])

  const pendingCount = organisations.filter(
    (o) => o.verificationStatus === 'submitted' || o.verificationStatus === 'under_review'
  ).length

  // Filtered list
  const filteredOrgs = organisations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.registrationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.officialEmail.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (filterTab === 'pending') {
      return org.verificationStatus === 'submitted' || org.verificationStatus === 'under_review'
    }
    if (filterTab === 'action_required') {
      return org.verificationStatus === 'additional_info_required'
    }
    if (filterTab === 'approved') {
      return org.verificationStatus === 'approved'
    }
    if (filterTab === 'rejected') {
      return org.verificationStatus === 'rejected' || org.verificationStatus === 'suspended'
    }
    return true
  })

  const handleOpenAction = (org: Organisation, type: 'approve' | 'request_info' | 'reject' | 'under_review') => {
    setActionOrg(org)
    setActionType(type)
    if (type === 'approve') {
      setReviewerNote('Institutional credentials, university charter, and facility insurance verified. Valid through 2027.')
    } else if (type === 'under_review') {
      setReviewerNote('Compliance auditor assigned. Performing identity and entity registry cross-checks.')
    } else if (type === 'request_info') {
      setReviewerNote('Please upload an updated Dean/Board Mandate letter with official seal and signatures.')
    } else if (type === 'reject') {
      setReviewerNote('Provided entity registration code could not be verified against government higher education or corporate records.')
    }
  }

  const handleExecuteAction = async () => {
    if (!actionOrg) return

    try {
      setProcessing(true)
      let targetStatus: VerificationStatus = 'under_review'
      if (actionType === 'approve') targetStatus = 'approved'
      if (actionType === 'request_info') targetStatus = 'additional_info_required'
      if (actionType === 'reject') targetStatus = 'rejected'
      if (actionType === 'under_review') targetStatus = 'under_review'

      const updated = await setOrganisationVerificationStatus(
        actionOrg.id,
        targetStatus,
        reviewerNote
      )

      setOrganisations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))

      // If currently inspecting this org, update inspection view as well
      if (inspectOrg && inspectOrg.id === updated.id) {
        setInspectOrg(updated)
      }

      success('Decision Recorded', `Organisation "${actionOrg.name}" marked as ${targetStatus.replace(/_/g, ' ')}.`)

      setActionOrg(null)
      setReviewerNote('')
    } catch (err) {
      error('Error', err instanceof Error ? err.message : 'Failed to update verification status.')
    } finally {
      setProcessing(false)
    }
  }

  const handleSwitchToOrg = (orgId: string) => {
    setCurrentOrganisationId(orgId)
    info('Active Organisation Switched', 'You can now view this organisation’s workspace.')
  }

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" size="sm">Approved</Badge>
      case 'submitted':
        return <Badge variant="info" size="sm">Submitted</Badge>
      case 'under_review':
        return <Badge variant="warning" size="sm">Under Review</Badge>
      case 'additional_info_required':
        return <Badge variant="warning" size="sm">Info Required</Badge>
      case 'draft':
        return <Badge variant="default" size="sm">Draft</Badge>
      case 'rejected':
      case 'suspended':
        return <Badge variant="error" size="sm">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Organisation Verification Queue"
        subtitle="Review, audit, and approve new educational, laboratory, and corporate organisations requesting platform membership."
        badge={
          <Badge variant="warning" showDot>
            {pendingCount} Pending Verification{pendingCount === 1 ? '' : 's'}
          </Badge>
        }
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Verification Queue' },
        ]}
      />

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg">
          {[
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'action_required', label: 'Info Requested' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: `All (${organisations.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterTab === tab.id
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <SearchBar
            placeholder="Search by name, ID or email..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Organisation Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-600 mb-2" />
            Loading verification queue...
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            No organisations found matching the selected criteria.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation Name & Details</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Submitted / Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-xs text-neutral-900 block">
                        {org.name}
                      </span>
                      <span className="text-[11px] text-neutral-500 block truncate max-w-xs">
                        ID: {org.registrationId || 'N/A'} • {org.officialEmail}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {org.type.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(org.verificationStatus)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium text-brand-700">
                      {org.documents.length} File{org.documents.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {new Date(org.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setInspectOrg(org)}
                      title="Inspect uploaded documents and representative details"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Audit
                    </Button>

                    {org.verificationStatus !== 'approved' && (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => handleOpenAction(org, 'approve')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    )}

                    {org.verificationStatus !== 'additional_info_required' &&
                      org.verificationStatus !== 'draft' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenAction(org, 'request_info')}
                        >
                          Request Info
                        </Button>
                      )}

                    {org.verificationStatus !== 'rejected' && (
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleOpenAction(org, 'reject')}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Inspection & Document Audit Modal ──────────────────── */}
      {inspectOrg && (
        <Modal
          isOpen={!!inspectOrg}
          onClose={() => setInspectOrg(null)}
          size="xl"
          title={`Audit Application: ${inspectOrg.name}`}
          description={`Legal Name: ${inspectOrg.legalName} • ID: ${inspectOrg.registrationId}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <Link to="/org" onClick={() => handleSwitchToOrg(inspectOrg.id)}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Switch to this Org's Portal
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = inspectOrg
                    setInspectOrg(null)
                    handleOpenAction(target, 'request_info')
                  }}
                >
                  Request Info
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const target = inspectOrg
                    setInspectOrg(null)
                    handleOpenAction(target, 'approve')
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve Organisation
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <span className="text-neutral-500 font-medium">Authorised Signatory:</span>
                <p className="font-semibold text-neutral-900 mt-0.5">
                  {inspectOrg.representative.fullName} ({inspectOrg.representative.jobTitle})
                </p>
                <p className="text-neutral-500 text-[11px]">
                  {inspectOrg.representative.email} • {inspectOrg.representative.phone}
                </p>
              </div>
              <div>
                <span className="text-neutral-500 font-medium">Facility / Campus Location:</span>
                <p className="font-semibold text-neutral-900 mt-0.5">
                  {inspectOrg.address.streetAddress}
                </p>
                <p className="text-neutral-500 text-[11px]">
                  {inspectOrg.address.city}, {inspectOrg.address.state} {inspectOrg.address.postalCode} (
                  {inspectOrg.address.country})
                </p>
              </div>
            </div>

            {/* Document Vault Table */}
            <div>
              <h4 className="font-bold text-neutral-900 mb-2">
                Submitted Supporting Documents ({inspectOrg.documents.length})
              </h4>
              {inspectOrg.documents.length === 0 ? (
                <div className="p-4 text-center text-neutral-400 bg-neutral-50 rounded border border-neutral-200">
                  No documents attached to this application.
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-200">
                  {inspectOrg.documents.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-start justify-between gap-3 bg-white">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 truncate">{doc.name}</p>
                          <p className="text-[11px] font-mono text-neutral-400 truncate max-w-md">
                            Path: {doc.storagePath}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 capitalize">
                            Type: {doc.documentType.replace(/_/g, ' ')} • Size: {Math.round(doc.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit History Log */}
            <div>
              <h4 className="font-bold text-neutral-900 mb-2">Audit History</h4>
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 max-h-40 overflow-y-auto">
                {inspectOrg.history.map((h) => (
                  <div key={h.id} className="p-2.5 text-[11px] bg-neutral-50/50">
                    <div className="flex justify-between font-semibold text-neutral-800">
                      <span>{h.title}</span>
                      <span className="text-neutral-400 font-normal">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-neutral-500">By {h.actor}</p>
                    {h.note && <p className="text-neutral-600 mt-1 italic">"{h.note}"</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reviewer Action Dialog ──────────────────────────────── */}
      {actionOrg && (
        <Modal
          isOpen={!!actionOrg}
          onClose={() => setActionOrg(null)}
          title={`Review Decision: ${actionType.replace(/_/g, ' ').toUpperCase()}`}
          description={`Target Organisation: ${actionOrg.name}`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionOrg(null)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant={
                  actionType === 'approve'
                    ? 'primary'
                    : actionType === 'reject'
                    ? 'danger'
                    : 'secondary'
                }
                size="sm"
                disabled={processing}
                isLoading={processing}
                onClick={handleExecuteAction}
              >
                Confirm Decision
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {actionType === 'request_info' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <p className="font-semibold mb-1">Requesting Additional Documentation:</p>
                <p>
                  This will transition the organisation status to{' '}
                  <strong>Additional Information Required</strong>. The representative will be notified
                  and prompted to provide clarification notes and upload replacement files.
                </p>
              </div>
            )}

            {actionType === 'reject' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <p className="font-semibold mb-1">Rejecting Registration:</p>
                <p>
                  The organisation will not be granted access to cross-institutional sharing. Please
                  provide a formal explanation for the compliance record.
                </p>
              </div>
            )}

            {actionType === 'approve' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                <p className="font-semibold mb-1">Approving Organisation:</p>
                <p>
                  This grants Tier 1 verified institutional clearance, enabling the organisation to publish
                  resource listings and execute inter-college sharing bookings.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Reviewer / Auditor Feedback & Notes <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={4}
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                placeholder="Enter notes that will be recorded in the audit trail and displayed to the institution..."
                required
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
