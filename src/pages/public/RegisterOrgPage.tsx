import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  MapPin,
  UserCheck,
  FileUp,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  AlertCircle,
  FileText,
  Trash2,
  Loader2,
  Send,
} from 'lucide-react'
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
  Select,
  useToast,
  Alert,
} from '@/components/ui'
import {
  type OrganisationType,
  type SharingMode,
  type DocumentType,
  type OrganisationRegistrationInput,
} from '@/types/organisation'
import {
  saveOrganisationDraft,
  submitOrganisationRegistration,
  uploadVerificationDocument,
  getOrganisationById,
} from '@/services/organisationService'

interface FormErrors {
  [key: string]: string | undefined
}

const ORG_TYPE_OPTIONS = [
  { value: 'university', label: 'University / Higher Education College' },
  { value: 'research_lab', label: 'Government / Independent Research Institute' },
  { value: 'makerspace', label: 'Makerspace / Hardware Incubator' },
  { value: 'corporate_rd', label: 'Corporate R&D Facility' },
  { value: 'hospital', label: 'Hospital / Clinical Research Center' },
  { value: 'ngo', label: 'Non-Profit / Non-Governmental Organisation' },
  { value: 'other', label: 'Other Technical Organisation' },
]

const SHARING_MODE_OPTIONS = [
  { value: 'both', label: 'Both: Share underused resources and request external access' },
  { value: 'share_only', label: 'Share Only: List our equipment and spaces for verified users' },
  { value: 'borrow_only', label: 'Borrow Only: Request access to partner laboratories and tools' },
]

const RESOURCE_CATEGORY_CHOICES = [
  'Laboratories & Cleanrooms',
  'Fabrication & 3D Printing',
  'Computers & High-Compute',
  'Cameras & Advanced Imaging',
  'Meeting Spaces & Auditoriums',
  'Testing & Electronic Instruments',
  'Workshops & Maker Bays',
]

export function RegisterOrgPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const draftIdParam = searchParams.get('draftId')
  const toast = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isUploadingDoc, setIsUploadingDoc] = useState<DocumentType | null>(null)
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(draftIdParam || undefined)
  const [errors, setErrors] = useState<FormErrors>({})

  // Form State
  const [formData, setFormData] = useState<OrganisationRegistrationInput>({
    legalName: '',
    type: 'university',
    registrationId: '',
    websiteUrl: '',
    officialEmail: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    sharingMode: 'both',
    resourceCategories: ['Laboratories & Cleanrooms'],
    expectedVolume: 'weekly',
    representativeName: '',
    representativeTitle: '',
    representativeEmail: '',
    representativePhone: '',
    representativeDepartment: '',
    hasDeclaration: false,
    documents: [],
  })

  // Load existing draft if draftId is in query or saved in storage
  useEffect(() => {
    if (activeDraftId) {
      getOrganisationById(activeDraftId).then((org) => {
        if (org && org.verificationStatus === 'draft') {
          setFormData({
            legalName: org.legalName,
            type: org.type,
            registrationId: org.registrationId,
            websiteUrl: org.websiteUrl || '',
            officialEmail: org.officialEmail,
            phone: org.phone,
            streetAddress: org.address.streetAddress,
            city: org.address.city,
            state: org.address.state,
            postalCode: org.address.postalCode,
            country: org.address.country,
            sharingMode: org.intendedUse.mode,
            resourceCategories: org.intendedUse.resourceCategories,
            expectedVolume: org.intendedUse.expectedVolume,
            representativeName: org.representative.fullName,
            representativeTitle: org.representative.jobTitle,
            representativeEmail: org.representative.email,
            representativePhone: org.representative.phone,
            representativeDepartment: org.representative.department || '',
            hasDeclaration: org.representative.hasAuthorisationDeclaration,
            documents: org.documents,
          })
          toast.info('Draft Resumed', `Continuing application for ${org.legalName || 'your organisation'}.`)
        }
      })
    }
  }, [activeDraftId, toast])

  // Validation logic per step
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {}

    if (step === 1) {
      if (!formData.legalName.trim()) {
        newErrors.legalName = 'Legal organisation name is required.'
      } else if (formData.legalName.trim().length < 3) {
        newErrors.legalName = 'Organisation name must be at least 3 characters.'
      }

      if (!formData.registrationId.trim()) {
        newErrors.registrationId = 'Official registration or charter identifier is required.'
      }

      if (formData.websiteUrl && !formData.websiteUrl.startsWith('http')) {
        newErrors.websiteUrl = 'Please enter a valid URL beginning with http:// or https://'
      }
    }

    if (step === 2) {
      if (!formData.officialEmail.trim()) {
        newErrors.officialEmail = 'Official institutional email is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.officialEmail)) {
        newErrors.officialEmail = 'Please provide a valid email address.'
      } else if (
        formData.officialEmail.endsWith('@gmail.com') ||
        formData.officialEmail.endsWith('@yahoo.com') ||
        formData.officialEmail.endsWith('@hotmail.com')
      ) {
        newErrors.officialEmail =
          'Please provide your official institutional domain email, not a personal email provider.'
      }

      if (!formData.phone.trim()) {
        newErrors.phone = 'Official telephone contact is required.'
      }

      if (!formData.streetAddress.trim()) {
        newErrors.streetAddress = 'Street address is required.'
      }

      if (!formData.city.trim()) {
        newErrors.city = 'City is required.'
      }

      if (!formData.state.trim()) {
        newErrors.state = 'State / Province is required.'
      }

      if (!formData.postalCode.trim()) {
        newErrors.postalCode = 'Postal / ZIP code is required.'
      }
    }

    if (step === 3) {
      if (!formData.representativeName.trim()) {
        newErrors.representativeName = 'Authorised representative full name is required.'
      }

      if (!formData.representativeTitle.trim()) {
        newErrors.representativeTitle = 'Job title / designation is required (e.g. Dean, Lab Director).'
      }

      if (!formData.representativeEmail.trim()) {
        newErrors.representativeEmail = 'Representative institutional email is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.representativeEmail)) {
        newErrors.representativeEmail = 'Please provide a valid email address.'
      }

      if (!formData.representativePhone.trim()) {
        newErrors.representativePhone = 'Representative direct phone is required.'
      }

      if (formData.resourceCategories.length === 0) {
        newErrors.resourceCategories = 'Select at least one resource category you plan to share or access.'
      }

      if (!formData.hasDeclaration) {
        newErrors.hasDeclaration =
          'You must certify that you hold institutional authority to submit this registration.'
      }
    }

    if (step === 4) {
      const hasCharter = formData.documents.some((d) => d.documentType === 'registration_certificate')
      const hasAccreditation = formData.documents.some((d) => d.documentType === 'accreditation_certificate')
      const hasLetter = formData.documents.some((d) => d.documentType === 'authorization_letter')

      if (!hasCharter) {
        newErrors.doc_registration = 'Certificate of Incorporation or University Charter is required.'
      }
      if (!hasAccreditation) {
        newErrors.doc_accreditation = 'Government Accreditation or Tax Exemption Certificate is required.'
      }
      if (!hasLetter) {
        newErrors.doc_authorization = 'Institutional Mandate or Dean authorization letter is required.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      toast.error('Validation Incomplete', 'Please correct the highlighted fields before proceeding.')
    }
  }

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Save draft to persistent storage
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true)
      const saved = await saveOrganisationDraft(formData, activeDraftId)
      setActiveDraftId(saved.id)
      toast.success(
        'Draft Saved Successfully',
        `Your application for ${saved.legalName || 'your organisation'} has been saved. You can resume anytime.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft'
      toast.error('Save Failed', msg)
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Handle document upload
  const handleFileUpload = async (type: DocumentType, file: File) => {
    try {
      setIsUploadingDoc(type)
      const tempOrgId = activeDraftId || 'draft-pending'
      const uploaded = await uploadVerificationDocument(tempOrgId, type, file)

      // Replace or add document
      setFormData((prev) => ({
        ...prev,
        documents: [...prev.documents.filter((d) => d.documentType !== type), uploaded],
      }))

      // Clear document error for this type
      setErrors((prev) => {
        const next = { ...prev }
        if (type === 'registration_certificate') delete next.doc_registration
        if (type === 'accreditation_certificate') delete next.doc_accreditation
        if (type === 'authorization_letter') delete next.doc_authorization
        return next
      })

      toast.success('Document Attached', `${file.name} uploaded successfully.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document upload failed'
      toast.error('Upload Error', msg)
    } finally {
      setIsUploadingDoc(null)
    }
  }

  const handleRemoveDoc = (docId: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }))
  }

  // Toggle category
  const toggleCategory = (cat: string) => {
    setFormData((prev) => {
      const exists = prev.resourceCategories.includes(cat)
      return {
        ...prev,
        resourceCategories: exists
          ? prev.resourceCategories.filter((c) => c !== cat)
          : [...prev.resourceCategories, cat],
      }
    })
  }

  // Final Form Submission
  const handleSubmit = async () => {
    // Validate all steps
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      toast.error('Incomplete Application', 'Please review all steps for missing required information.')
      return
    }

    try {
      setIsSubmitting(true)
      const submittedOrg = await submitOrganisationRegistration(formData, activeDraftId)

      toast.success(
        'Application Submitted',
        `${submittedOrg.legalName} has been queued for verification review. Audit trail initiated.`
      )

      // Navigate to the verification status page
      navigate(`/org/verification?orgId=${submittedOrg.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      toast.error('Submission Error', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepsList = [
    { num: 1, label: 'Profile', icon: Building2 },
    { num: 2, label: 'Contact & Location', icon: MapPin },
    { num: 3, label: 'Usage & Representative', icon: UserCheck },
    { num: 4, label: 'Supporting Documents', icon: FileUp },
    { num: 5, label: 'Review & Submit', icon: CheckCircle2 },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="inline-block rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">
            Institutional Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
            Register Your Organisation
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Colleges, research institutes, and makerspaces undergo peer verification before listing or booking technical facilities.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          isLoading={isSavingDraft}
          leftIcon={<Save className="h-4 w-4" />}
          className="shrink-0"
        >
          Save Draft
        </Button>
      </div>

      {/* Multi-Step Progress Indicator */}
      <nav aria-label="Registration Progress" className="w-full">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
          {stepsList.map((s) => {
            const Icon = s.icon
            const isCompleted = currentStep > s.num
            const isCurrent = currentStep === s.num

            return (
              <li
                key={s.num}
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num)
                }}
                className={`flex items-center gap-2 rounded-xl p-2.5 sm:p-3 border transition-all ${
                  isCurrent
                    ? 'border-brand-600 bg-brand-50/70 text-brand-900 ring-2 ring-brand-500/20'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 cursor-pointer hover:bg-emerald-50'
                    : 'border-neutral-200 bg-white text-neutral-400 opacity-70'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isCurrent
                      ? 'bg-brand-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Step {s.num}
                  </p>
                  <p className="truncate text-xs font-semibold leading-tight">{s.label}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Main Form Body */}
      <Card>
        {/* ── STEP 1: ORGANISATION PROFILE ───────────────────────────── */}
        {currentStep === 1 && (
          <div>
            <CardHeader
              title="1. Legal Organisation Profile"
              subtitle="Enter official registered institutional credentials."
            />
            <CardContent className="space-y-4">
              <Input
                label="Legal or Registered Organisation Name"
                placeholder="e.g. Indian Institute of Technology Delhi"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                errorText={errors.legalName}
                isRequired
                helperText="Must match your official university charter or certificate of incorporation."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Organisation Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as OrganisationType })}
                  options={ORG_TYPE_OPTIONS}
                  isRequired
                />

                <Input
                  label="Registration / Charter Identifier"
                  placeholder="e.g. URN-2024-IITD or CIN / Tax ID"
                  value={formData.registrationId}
                  onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
                  errorText={errors.registrationId}
                  isRequired
                  helperText="Government or academic recognition code."
                />
              </div>

              <Input
                label="Official Website URL"
                placeholder="https://www.organisation.edu"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                errorText={errors.websiteUrl}
                optionalLabel="Optional but recommended for faster vetting"
              />
            </CardContent>
          </div>
        )}

        {/* ── STEP 2: CONTACT & PHYSICAL LOCATION ────────────────────── */}
        {currentStep === 2 && (
          <div>
            <CardHeader
              title="2. Official Contact & Physical Location"
              subtitle="Where equipment is housed and administrative communications will be routed."
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Official Institutional Domain Email"
                  placeholder="admin@organisation.edu"
                  type="email"
                  value={formData.officialEmail}
                  onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  errorText={errors.officialEmail}
                  isRequired
                  helperText="Personal emails (@gmail, @yahoo) are rejected during verification."
                />

                <Input
                  label="Official Telephone / Switchboard"
                  placeholder="+91 (11) 2659-1000"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  errorText={errors.phone}
                  isRequired
                />
              </div>

              <Input
                label="Campus / Street Address"
                placeholder="Hauz Khas, Academic Complex Block 4"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                errorText={errors.streetAddress}
                isRequired
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    label="City"
                    placeholder="New Delhi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    errorText={errors.city}
                    isRequired
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Input
                    label="State / Province"
                    placeholder="Delhi"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    errorText={errors.state}
                    isRequired
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    label="Postal Code"
                    placeholder="110016"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    errorText={errors.postalCode}
                    isRequired
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    label="Country"
                    placeholder="India"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    isRequired
                  />
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* ── STEP 3: USAGE & AUTHORISED REPRESENTATIVE ──────────────── */}
        {currentStep === 3 && (
          <div>
            <CardHeader
              title="3. Intended Use & Authorised Representative"
              subtitle="Specify sharing scope and designate the accountable institutional custodian."
            />
            <CardContent className="space-y-5">
              <Select
                label="Intended Sharing Mode"
                value={formData.sharingMode}
                onChange={(e) => setFormData({ ...formData, sharingMode: e.target.value as SharingMode })}
                options={SHARING_MODE_OPTIONS}
                isRequired
              />

              <div>
                <label className="block text-sm font-medium text-neutral-800 mb-1.5 flex items-center gap-1">
                  Resource Categories to Share or Request
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RESOURCE_CATEGORY_CHOICES.map((cat) => {
                    const isSelected = formData.resourceCategories.includes(cat)
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-neutral-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span>{cat}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.resourceCategories && (
                  <p className="text-xs text-red-600 font-medium mt-1">{errors.resourceCategories}</p>
                )}
              </div>

              <div className="border-t border-neutral-100 pt-4 space-y-4">
                <h4 className="text-sm font-bold text-neutral-900">
                  Authorised Institutional Representative
                </h4>
                <p className="text-xs text-neutral-500">
                  The primary custodian legally empowered to execute the ShareSphere Inter-Institutional MOU.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Representative Full Name"
                    placeholder="Prof. Alan Turing"
                    value={formData.representativeName}
                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                    errorText={errors.representativeName}
                    isRequired
                  />

                  <Input
                    label="Official Title / Designation"
                    placeholder="Director of Core Facilities / Dean R&D"
                    value={formData.representativeTitle}
                    onChange={(e) => setFormData({ ...formData, representativeTitle: e.target.value })}
                    errorText={errors.representativeTitle}
                    isRequired
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Representative Direct Email"
                    placeholder="turing@organisation.edu"
                    type="email"
                    value={formData.representativeEmail}
                    onChange={(e) => setFormData({ ...formData, representativeEmail: e.target.value })}
                    errorText={errors.representativeEmail}
                    isRequired
                  />

                  <Input
                    label="Representative Direct Phone"
                    placeholder="+91 98765 43210"
                    type="tel"
                    value={formData.representativePhone}
                    onChange={(e) => setFormData({ ...formData, representativePhone: e.target.value })}
                    errorText={errors.representativePhone}
                    isRequired
                  />
                </div>

                {/* Authority Declaration */}
                <div
                  className={`rounded-xl border p-4 transition-all ${
                    errors.hasDeclaration
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-neutral-200 bg-neutral-50/60'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasDeclaration}
                      onChange={(e) => setFormData({ ...formData, hasDeclaration: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="text-xs leading-relaxed text-neutral-700">
                      <strong className="text-neutral-900 font-semibold block mb-0.5">
                        Authorisation & Compliance Declaration:
                      </strong>
                      I certify that I am authorised by the governing board, deanery, or corporate directorate
                      of <span className="font-semibold">{formData.legalName || 'this organisation'}</span> to
                      register on ShareSphere, list underused facilities, and bind the organisation to reciprocal
                      safety and liability terms.
                    </div>
                  </label>
                  {errors.hasDeclaration && (
                    <p className="text-xs text-red-600 font-medium mt-2 pl-7">{errors.hasDeclaration}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* ── STEP 4: SUPPORTING DOCUMENTS UPLOAD ─────────────────────── */}
        {currentStep === 4 && (
          <div>
            <CardHeader
              title="4. Required Supporting Documentation"
              subtitle="Files are stored securely under authorized storage paths: organisation-documents/{orgId}/{docType}/..."
            />
            <CardContent className="space-y-6">
              <Alert variant="info" title="Encrypted & Private Storage Vault">
                Verification documents are protected by PostgreSQL Row Level Security. Only platform
                compliance auditors and your authorised representative can inspect these records.
              </Alert>

              {/* Document 1: Registration / Charter */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>1. Certificate of Incorporation / University Charter</span>
                      <span className="text-red-500">*</span>
                    </h5>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Government gazette notification, university act charter, or certificate of incorporation.
                    </p>
                  </div>
                  {formData.documents.find((d) => d.documentType === 'registration_certificate') && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Attached
                    </span>
                  )}
                </div>

                {formData.documents.find((d) => d.documentType === 'registration_certificate') ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                      <span className="font-semibold text-neutral-800 truncate">
                        {formData.documents.find((d) => d.documentType === 'registration_certificate')?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = formData.documents.find((doc) => doc.documentType === 'registration_certificate')
                        if (d) handleRemoveDoc(d.id)
                      }}
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="upload-charter"
                      accept=".pdf,.png,.jpg,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload('registration_certificate', e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-charter"
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 py-3 px-4 text-xs font-semibold text-brand-700 hover:bg-neutral-100 cursor-pointer transition-colors"
                    >
                      {isUploadingDoc === 'registration_certificate' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                      ) : (
                        <FileUp className="h-4 w-4 text-brand-600" />
                      )}
                      <span>Upload University Charter / Incorporation Certificate (Max 10MB)</span>
                    </label>
                  </div>
                )}
                {errors.doc_registration && (
                  <p className="text-xs text-red-600 font-medium">{errors.doc_registration}</p>
                )}
              </div>

              {/* Document 2: Accreditation Certificate */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>2. Government Accreditation / Tax Exemption Certificate</span>
                      <span className="text-red-500">*</span>
                    </h5>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      NAAC grade, ISO 9001/17025 accreditation, 12A/80G certificate, or DSIR laboratory recognition.
                    </p>
                  </div>
                  {formData.documents.find((d) => d.documentType === 'accreditation_certificate') && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Attached
                    </span>
                  )}
                </div>

                {formData.documents.find((d) => d.documentType === 'accreditation_certificate') ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                      <span className="font-semibold text-neutral-800 truncate">
                        {formData.documents.find((d) => d.documentType === 'accreditation_certificate')?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = formData.documents.find((doc) => doc.documentType === 'accreditation_certificate')
                        if (d) handleRemoveDoc(d.id)
                      }}
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="upload-accreditation"
                      accept=".pdf,.png,.jpg,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload('accreditation_certificate', e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-accreditation"
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 py-3 px-4 text-xs font-semibold text-brand-700 hover:bg-neutral-100 cursor-pointer transition-colors"
                    >
                      {isUploadingDoc === 'accreditation_certificate' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                      ) : (
                        <FileUp className="h-4 w-4 text-brand-600" />
                      )}
                      <span>Upload Accreditation / Recognition Certificate (Max 10MB)</span>
                    </label>
                  </div>
                )}
                {errors.doc_accreditation && (
                  <p className="text-xs text-red-600 font-medium">{errors.doc_accreditation}</p>
                )}
              </div>

              {/* Document 3: Authorisation Letter / Mandate */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>3. Authorised Representative Mandate / Dean Letter</span>
                      <span className="text-red-500">*</span>
                    </h5>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Official letterhead signed by Vice-Chancellor, Dean, or Board of Directors delegating platform operation.
                    </p>
                  </div>
                  {formData.documents.find((d) => d.documentType === 'authorization_letter') && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Attached
                    </span>
                  )}
                </div>

                {formData.documents.find((d) => d.documentType === 'authorization_letter') ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                      <span className="font-semibold text-neutral-800 truncate">
                        {formData.documents.find((d) => d.documentType === 'authorization_letter')?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = formData.documents.find((doc) => doc.documentType === 'authorization_letter')
                        if (d) handleRemoveDoc(d.id)
                      }}
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="upload-mandate"
                      accept=".pdf,.png,.jpg,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload('authorization_letter', e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-mandate"
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 py-3 px-4 text-xs font-semibold text-brand-700 hover:bg-neutral-100 cursor-pointer transition-colors"
                    >
                      {isUploadingDoc === 'authorization_letter' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                      ) : (
                        <FileUp className="h-4 w-4 text-brand-600" />
                      )}
                      <span>Upload Representative Mandate Letter on Letterhead (Max 10MB)</span>
                    </label>
                  </div>
                )}
                {errors.doc_authorization && (
                  <p className="text-xs text-red-600 font-medium">{errors.doc_authorization}</p>
                )}
              </div>
            </CardContent>
          </div>
        )}

        {/* ── STEP 5: REVIEW & FORMAL SUBMISSION ───────────────────────── */}
        {currentStep === 5 && (
          <div>
            <CardHeader
              title="5. Review Application & Submit for Verification"
              subtitle="Please confirm the accuracy of your details. Once submitted, your application enters the verification queue."
            />
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Important Audit Notice:</p>
                  <p className="leading-relaxed">
                    Submitting this form does <strong>NOT</strong> instantly grant verified status.
                    Your accreditation documents will be reviewed by the ShareSphere Compliance Board.
                    You will receive status updates and reviewer inquiries in your verification portal.
                  </p>
                </div>
              </div>

              {/* Review Sections */}
              <div className="space-y-4">
                {/* 1. Profile Summary */}
                <div className="rounded-xl border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Organisation Profile
                    </h5>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Legal Name:</span>
                      <span className="font-semibold text-neutral-900">{formData.legalName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Type:</span>
                      <span className="font-semibold text-neutral-900 capitalize">{formData.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Registration Code:</span>
                      <span className="font-semibold text-neutral-900">{formData.registrationId}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Website:</span>
                      <span className="font-semibold text-neutral-900">{formData.websiteUrl || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Location Summary */}
                <div className="rounded-xl border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Contact & Location
                    </h5>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Official Domain Email:</span>
                      <span className="font-semibold text-neutral-900">{formData.officialEmail}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Telephone:</span>
                      <span className="font-semibold text-neutral-900">{formData.phone}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-400 block">Facility Address:</span>
                      <span className="font-semibold text-neutral-900">
                        {formData.streetAddress}, {formData.city}, {formData.state} {formData.postalCode}, {formData.country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Representative Summary */}
                <div className="rounded-xl border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Authorised Representative
                    </h5>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Representative Name:</span>
                      <span className="font-semibold text-neutral-900">{formData.representativeName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Designation:</span>
                      <span className="font-semibold text-neutral-900">{formData.representativeTitle}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Direct Email:</span>
                      <span className="font-semibold text-neutral-900">{formData.representativeEmail}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Authorisation Mandate:</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Certified
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Documents Summary */}
                <div className="rounded-xl border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Attached Supporting Documents ({formData.documents.length})
                    </h5>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {formData.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-neutral-700">
                        <FileText className="h-3.5 w-3.5 text-brand-600" />
                        <span className="font-medium">{doc.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">({(doc.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Form Footer Navigation Controls */}
        <CardFooter className="flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevStep}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                disabled={isSubmitting}
              >
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveDraft}
              isLoading={isSavingDraft}
              disabled={isSubmitting}
            >
              Save Draft
            </Button>

            {currentStep < 5 ? (
              <Button
                size="sm"
                onClick={handleNextStep}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continue to Step {currentStep + 1}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                rightIcon={<Send className="h-4 w-4" />}
                className="bg-brand-600 hover:bg-brand-700"
              >
                Submit for Verification
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
