import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  UploadCloud,
  FileCheck2,
  ExternalLink,
  RefreshCw,
  Send,
  HelpCircle,
  XCircle,
  Calendar,
  Lock,
} from 'lucide-react'
import {
  PageHeader,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Button,
  Alert,
  Textarea,
  useToast,
  Select,
} from '@/components/ui'
import {
  getCurrentOrganisation,
  resubmitOrganisationVerification,
  setOrganisationVerificationStatus,
  uploadVerificationDocument,
} from '@/services/organisationService'
import {
  type Organisation,
  type VerificationStatus,
  type VerificationDocument,
  type DocumentType,
} from '@/types/organisation'

export function OrgVerificationPage() {
  const { success, error, warning, info } = useToast()
  const [org, setOrg] = useState<Organisation | null>(null)
  const [loading, setLoading] = useState(true)

  // Resubmission form state (used when status is 'additional_info_required')
  const [clarificationNotes, setClarificationNotes] = useState('')
  const [resubmitDocType, setResubmitDocType] = useState<DocumentType>('authorization_letter')
  const [resubmitFiles, setResubmitFiles] = useState<VerificationDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Demo simulator state
  const [simulatingStatus, setSimulatingStatus] = useState(false)

  useEffect(() => {
    let isMounted = true
    getCurrentOrganisation()
      .then((data) => {
        if (isMounted) {
          setOrg(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load organisation verification data', err)
        if (isMounted) {
          setLoading(false)
          error('Error', 'Failed to retrieve organisation verification status.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [error])

  // Handle document upload in resubmission workflow
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !org) return

    try {
      setIsUploading(true)
      const uploadedDoc = await uploadVerificationDocument(org.id, resubmitDocType, file)
      setResubmitFiles((prev) => [...prev, uploadedDoc])
      success('Document Uploaded', `${file.name} prepared for verification review.`)
    } catch (err) {
      error('Upload Failed', err instanceof Error ? err.message : 'Could not upload file.')
    } finally {
      setIsUploading(false)
      // Reset input value so same file can be re-selected if desired
      e.target.value = ''
    }
  }

  const handleRemoveResubmitFile = (fileId: string) => {
    setResubmitFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  // Handle resubmission of additional info
  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return

    if (!clarificationNotes.trim() && resubmitFiles.length === 0) {
      warning('Input Required', 'Please provide clarification notes or upload a replacement document.')
      return
    }

    try {
      setIsSubmitting(true)
      const updated = await resubmitOrganisationVerification(org.id, {
        clarificationNotes: clarificationNotes.trim(),
        newDocuments: resubmitFiles,
      })
      setOrg(updated)
      setClarificationNotes('')
      setResubmitFiles([])
      success('Resubmission Received', 'Your additional documentation has been queued for auditor review.')
    } catch (err) {
      error('Resubmission Failed', err instanceof Error ? err.message : 'Failed to submit additional information.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Switcher for testing/evaluating all 7 states easily
  const handleSimulateStatus = async (status: VerificationStatus) => {
    if (!org) return
    try {
      setSimulatingStatus(true)
      let note = ''
      if (status === 'additional_info_required') {
        note =
          'The uploaded Authorization Mandate is missing the official Board seal and Dean signature. Please provide an updated resolution.'
      } else if (status === 'rejected') {
        note =
          'Unable to verify institutional accreditation. The supplied charter code did not match registered government databases.'
      } else if (status === 'suspended') {
        note =
          'Institutional sharing privileges temporarily suspended pending annual lab safety recertification audit.'
      } else if (status === 'approved') {
        note = 'Institutional credentials verified. Tier 1 Academic clearance granted.'
      } else if (status === 'under_review') {
        note = 'Application assigned to Senior Compliance Officer for background verification.'
      } else if (status === 'submitted') {
        note = 'Application placed in verification review queue.'
      }

      const updated = await setOrganisationVerificationStatus(org.id, status, note)
      setOrg(updated)
      info('Status Simulated', `Organisation status updated to "${status.replace(/_/g, ' ')}".`)
    } catch (err) {
      console.error(err)
    } finally {
      setSimulatingStatus(false)
    }
  }

  if (loading || !org) {
    return (
      <div className="py-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-600 mb-3" />
        <p className="text-sm font-medium text-neutral-600">Loading organisation verification status...</p>
      </div>
    )
  }

  // Helper for Status Badge
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" showDot size="md">
            Verified Tier 1 Institution
          </Badge>
        )
      case 'submitted':
        return (
          <Badge variant="info" showDot size="md">
            Submitted — Queued for Review
          </Badge>
        )
      case 'under_review':
        return (
          <Badge variant="warning" showDot size="md">
            Under Review — Audit In Progress
          </Badge>
        )
      case 'additional_info_required':
        return (
          <Badge variant="warning" showDot size="md">
            Action Required — Information Requested
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="default" showDot size="md">
            Draft Application — Not Submitted
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="error" showDot size="md">
            Application Rejected
          </Badge>
        )
      case 'suspended':
        return (
          <Badge variant="error" showDot size="md">
            Access Suspended
          </Badge>
        )
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDocType = (type: DocumentType) => {
    switch (type) {
      case 'registration_certificate':
        return 'Registration Certificate / Charter'
      case 'accreditation_certificate':
        return 'Accreditation / Tax Exemption'
      case 'authorization_letter':
        return 'Authorized Representative Mandate'
      case 'safety_compliance':
        return 'Lab Safety & Environmental Certification'
      default:
        return 'Supporting Document'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Organisation Verification"
        subtitle="Institutional accreditation status, inter-college sharing clearance, and legal audit trail."
        badge={getStatusBadge(org.verificationStatus)}
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Verification Status' },
        ]}
      />

      {/* ── Demo / Testing State Switcher ──────────────────────── */}
      <div className="bg-neutral-900 text-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Reviewer & QA Preview Controls
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            Current Persisted Status:{' '}
            <span className="font-mono text-brand-300 font-semibold">{org.verificationStatus}</span>
          </span>
        </div>
        <div className="pt-3">
          <p className="text-xs text-neutral-400 mb-2">
            Switch between all 7 platform verification states to test responsive UI, audit logs, and resubmission workflows:
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                'draft',
                'submitted',
                'under_review',
                'additional_info_required',
                'approved',
                'rejected',
                'suspended',
              ] as VerificationStatus[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                disabled={simulatingStatus}
                onClick={() => handleSimulateStatus(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  org.verificationStatus === s
                    ? 'bg-brand-600 text-white shadow-sm ring-1 ring-white/20'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status-Specific Views ──────────────────────────────── */}

      {/* STATUS 1: DRAFT */}
      {org.verificationStatus === 'draft' && (
        <Card className="border-amber-200 bg-amber-50/40">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2.5 text-amber-700 shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Application Saved as Draft
                </h3>
                <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
                  Your organisation registration is currently saved as an incomplete draft. To participate
                  in cross-organisation resource sharing and list laboratory equipment, please complete
                  the missing steps and submit your supporting documentation.
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500 font-medium">
                  <span>Last edited: {new Date(org.updatedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Documents attached: {org.documents.length}</span>
                </div>
              </div>
            </div>
            <Link to={`/register-org?draftId=${org.id}`}>
              <Button variant="primary">
                Resume Application
                <ExternalLink className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* STATUS 2: SUBMITTED */}
      {org.verificationStatus === 'submitted' && (
        <Card className="border-brand-200 bg-brand-50/30">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-brand-100 p-3 text-brand-700 shrink-0">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-neutral-900">
                  Application Submitted — Queued for Verification
                </h3>
                <span className="text-xs font-medium text-neutral-500 bg-white border border-neutral-200 px-2.5 py-1 rounded-full">
                  Estimated review SLA: 24–48 Business Hours
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-3xl">
                Your application has been received and timestamped in the ShareSphere Trust & Safety review
                queue. An accredited compliance officer will audit your registered entity identifier (
                <span className="font-mono font-medium text-neutral-800">{org.registrationId || 'Registered'}</span>
                ) and uploaded mandates.
              </p>
              <div className="bg-white border border-neutral-200 rounded-lg p-3 text-xs text-neutral-700 space-y-1 mt-2">
                <p className="font-semibold text-neutral-900">Next Steps:</p>
                <p>• No additional action is required from your team at this stage.</p>
                <p>• You will be notified via email ({org.officialEmail}) once the auditor initiates the background check.</p>
                <p>• Resource listing and borrowing will be activated automatically upon approval.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATUS 3: UNDER REVIEW */}
      {org.verificationStatus === 'under_review' && (
        <Card className="border-amber-300 bg-amber-50/40">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-amber-100 p-3 text-amber-700 shrink-0">
                <ShieldCheck className="h-6 w-6 animate-spin text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-neutral-900">
                    Compliance Audit in Progress
                  </h3>
                  <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                    Auditor Active
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  Your application is currently being evaluated by the Platform Trust & Compliance Board.
                  Cross-referencing institutional charter records and authorized signatory mandates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white p-3 rounded-lg border border-neutral-200 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Institutional Domain</span>
                </div>
                <p className="text-neutral-500">
                  Domain match verified ({org.officialEmail.split('@')[1] || 'institutional'}).
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-neutral-200 text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold mb-1">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Legal Charter Audit</span>
                </div>
                <p className="text-neutral-500">Registry database cross-check in progress.</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-neutral-200 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-500 font-semibold mb-1">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Facility Safety Policy</span>
                </div>
                <p className="text-neutral-500">Pending final safety checklist clearance.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATUS 4: ADDITIONAL INFO REQUIRED (Includes Interactive Resubmission Workflow) */}
      {org.verificationStatus === 'additional_info_required' && (
        <div className="space-y-6">
          <Alert
            variant="warning"
            title="Action Required: Reviewer Requested Additional Documentation"
          >
            <p className="text-xs sm:text-sm text-neutral-700 mt-1">
              The compliance auditor has reviewed your submission and flagged an item that requires
              clarification or updated supporting paperwork before verification can proceed.
            </p>
            {org.reviewerFeedback && (
              <div className="mt-3 p-3 bg-white border border-amber-300 rounded-lg text-xs font-mono text-amber-950">
                <span className="font-semibold block mb-0.5 text-amber-900">Auditor Feedback:</span>
                "{org.reviewerFeedback}"
              </div>
            )}
          </Alert>

          {/* Resubmission Form */}
          <Card>
            <CardHeader
              title="Resubmission Workflow & Clarification"
              subtitle="Provide explanatory notes and upload replacement documents to resume the verification process."
            />
            <CardContent>
              <form onSubmit={handleResubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Clarification / Response Notes <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Provide detailed context regarding the requested changes, explanation of discrepancies, or references to attached documents..."
                    value={clarificationNotes}
                    onChange={(e) => setClarificationNotes(e.target.value)}
                    required
                  />
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-neutral-900">
                    Upload Replacement or Supplementary Supporting Documents
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Document Category
                      </label>
                      <Select
                        value={resubmitDocType}
                        onChange={(e) => setResubmitDocType(e.target.value as DocumentType)}
                        options={[
                          { value: 'authorization_letter', label: 'Authorized Mandate / Letter' },
                          { value: 'registration_certificate', label: 'Registration / Charter' },
                          { value: 'accreditation_certificate', label: 'Accreditation / Tax Exemption' },
                          { value: 'safety_compliance', label: 'Lab Safety Certification' },
                          { value: 'other_supporting', label: 'Other Supporting Evidence' },
                        ]}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Attach File (PDF, DOCX, or PNG - Max 10MB)
                      </label>
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 hover:border-brand-500 bg-neutral-50 hover:bg-brand-50/30 rounded-lg p-3 text-xs font-medium text-neutral-700 cursor-pointer transition-colors">
                        <UploadCloud className="h-4 w-4 text-brand-600" />
                        <span>{isUploading ? 'Uploading to secure vault...' : 'Choose File to Upload'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                        />
                      </label>
                    </div>
                  </div>

                  {/* List of files staged for this resubmission */}
                  {resubmitFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-medium text-neutral-600">
                        Files ready for resubmission:
                      </p>
                      <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg overflow-hidden bg-white">
                        {resubmitFiles.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-neutral-800 truncate">{doc.name}</p>
                                <p className="text-neutral-400 text-[11px]">
                                  {formatDocType(doc.documentType)} • {formatFileSize(doc.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveResubmitFile(doc.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-xs ml-3"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || isUploading}
                    isLoading={isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Submit Clarification & Documents
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STATUS 5: APPROVED */}
      {org.verificationStatus === 'approved' && (
        <Card className="border-emerald-200 bg-emerald-50/20">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900">
                      Tier 1 Verified Institution
                    </h3>
                    <Badge variant="success" size="sm">
                      Active Clearance
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Accreditation valid through October 2027 • Compliance Audit Score: 100/100
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/org/resources">
                  <Button variant="primary" size="sm">
                    Manage Resource Listings
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1">
                <span className="text-neutral-500 font-medium">Inter-Institutional Sharing</span>
                <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Full Network Access
                </p>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Authorized to list specialized cleanroom space, compute servers, and electron microscopes.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1">
                <span className="text-neutral-500 font-medium">PostgreSQL Isolation</span>
                <p className="font-semibold text-brand-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  RLS Tenant Isolation
                </p>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Booking requests and telemetry are cryptographically scoped to verified partner orgs.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1">
                <span className="text-neutral-500 font-medium">Verification Certificate</span>
                <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-neutral-600" />
                  MOU-2026-MIT-884
                </p>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Digitally signed by ShareSphere Inter-University Exchange Consortium.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATUS 6: REJECTED */}
      {org.verificationStatus === 'rejected' && (
        <Card className="border-red-200 bg-red-50/40">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-100 p-3 text-red-700 shrink-0">
              <XCircle className="h-6 w-6" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-base font-semibold text-red-950">
                  Verification Application Rejected
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed max-w-2xl">
                  Following formal review by our compliance team, this organisation registration could not
                  be verified under ShareSphere safety and governance guidelines.
                </p>
              </div>

              {org.reviewerFeedback && (
                <div className="bg-white p-3.5 rounded-lg border border-red-300 text-xs text-neutral-800 space-y-1 font-mono">
                  <span className="font-bold text-red-900 block font-sans">Formal Reason for Rejection:</span>
                  {org.reviewerFeedback}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/help">
                  <Button variant="outline" size="sm">
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    Submit Appeal / Contact Compliance
                  </Button>
                </Link>
                <Link to="/register-org">
                  <Button variant="primary" size="sm">
                    Start New Application
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATUS 7: SUSPENDED */}
      {org.verificationStatus === 'suspended' && (
        <Card className="border-red-300 bg-red-50/50">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-100 p-3 text-red-700 shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-base font-semibold text-red-950">
                  Organisation Privileges Temporarily Suspended
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed max-w-2xl">
                  Cross-institutional sharing privileges for this organisation have been placed on
                  administrative hold. Active resource listings have been temporarily delisted from public
                  search, and pending reservation requests are frozen.
                </p>
              </div>

              {org.verificationNotes && (
                <div className="bg-white p-3.5 rounded-lg border border-red-300 text-xs text-neutral-800 space-y-1">
                  <span className="font-semibold text-red-900 block">Notice from Trust & Safety:</span>
                  <p>{org.verificationNotes}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Link to="/help">
                  <Button variant="danger" size="sm">
                    Contact Trust & Safety Escalation Team
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Document Vault & History Grid ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uploaded Supporting Documents Vault */}
        <Card>
          <CardHeader
            title="Verified Supporting Documents Vault"
            subtitle="Encrypted documents stored under isolated tenant paths."
          />
          <CardContent>
            {org.documents.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No supporting documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {org.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/60 hover:bg-white transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {formatDocType(doc.documentType)} • {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          doc.status === 'verified'
                            ? 'success'
                            : doc.status === 'flagged' || doc.status === 'rejected'
                            ? 'error'
                            : 'default'
                        }
                        size="sm"
                      >
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span className="truncate max-w-[280px]" title={doc.storagePath}>
                        {doc.storagePath}
                      </span>
                      <span className="shrink-0 text-neutral-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification History & Audit Trail */}
        <Card>
          <CardHeader
            title="Verification History & Audit Log"
            subtitle="Immutable audit log of all registration and status transition events."
          />
          <CardContent>
            {org.history.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No history entries recorded.
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                {org.history.map((entry) => (
                  <div key={entry.id} className="relative group">
                    {/* Timeline Node */}
                    <span
                      className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white ring-1 ${
                        entry.status === 'approved'
                          ? 'bg-emerald-500 ring-emerald-300'
                          : entry.status === 'additional_info_required'
                          ? 'bg-amber-500 ring-amber-300'
                          : entry.status === 'rejected' || entry.status === 'suspended'
                          ? 'bg-red-500 ring-red-300'
                          : 'bg-brand-500 ring-brand-300'
                      }`}
                    />

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-900">
                          {entry.title}
                        </span>
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Actor: <span className="font-medium text-neutral-700">{entry.actor}</span>
                      </p>
                      {entry.note && (
                        <p className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200/80 rounded p-2 mt-1 leading-relaxed">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organisation Representative & Contact Summary */}
      <Card>
        <CardHeader
          title="Authorised Representative & Institutional Contacts"
          subtitle="Designated point of contact for institutional governance and compliance audits."
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block mb-1">Authorised Signatory</span>
              <p className="font-semibold text-neutral-900">{org.representative.fullName}</p>
              <p className="text-neutral-500">{org.representative.jobTitle}</p>
              <p className="text-neutral-400 text-[11px]">{org.representative.department || 'Administration'}</p>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block mb-1">Official Contact Email</span>
              <p className="font-semibold text-neutral-900 break-all">{org.officialEmail}</p>
              <p className="text-neutral-500">{org.phone}</p>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block mb-1">Campus / Facility Location</span>
              <p className="font-semibold text-neutral-900">{org.address.streetAddress}</p>
              <p className="text-neutral-500">
                {org.address.city}, {org.address.state} {org.address.postalCode}
              </p>
              <p className="text-neutral-400 text-[11px]">{org.address.country}</p>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <span className="text-neutral-500 block mb-1">Resource Sharing Profile</span>
              <p className="font-semibold text-neutral-900 capitalize">
                Mode: {org.intendedUse.mode.replace(/_/g, ' ')}
              </p>
              <p className="text-neutral-500">
                Categories: {org.intendedUse.resourceCategories.length} designated
              </p>
              <p className="text-neutral-400 text-[11px]">Volume: {org.intendedUse.expectedVolume}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
