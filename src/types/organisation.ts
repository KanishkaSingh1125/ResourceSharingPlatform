export type VerificationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'additional_info_required'
  | 'approved'
  | 'rejected'
  | 'suspended'

export type OrganisationType =
  | 'university'
  | 'research_lab'
  | 'makerspace'
  | 'corporate_rd'
  | 'hospital'
  | 'ngo'
  | 'other'

export type SharingMode = 'share_only' | 'borrow_only' | 'both'

export type DocumentType =
  | 'registration_certificate' // Certificate of Incorporation or University Charter
  | 'accreditation_certificate' // NAAC / ISO / Govt Accreditation / Tax Exemption
  | 'authorization_letter' // Board Resolution or Dean's mandate letter
  | 'safety_compliance' // Optional/additional lab safety certifications
  | 'other_supporting'

export interface VerificationDocument {
  id: string
  orgId: string
  documentType: DocumentType
  name: string
  size: number
  mimeType: string
  storagePath: string // Storage convention: organisation-documents/{orgId}/{docType}/{fileName}
  uploadedAt: string
  status: 'pending' | 'verified' | 'flagged' | 'rejected'
  flagReason?: string
}

export interface AuthorisedRepresentative {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  department?: string
  hasAuthorisationDeclaration: boolean
}

export interface OrganisationAddress {
  streetAddress: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface IntendedUsage {
  mode: SharingMode
  resourceCategories: string[]
  expectedVolume: 'occasional' | 'weekly' | 'daily' | 'high_throughput'
  notes?: string
}

export interface VerificationHistoryEntry {
  id: string
  orgId: string
  status: VerificationStatus
  timestamp: string
  actor: string
  title: string
  note?: string
  actionRequired?: boolean
  requestedChanges?: string[]
}

export interface OutstandingAction {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  type: 'document_replacement' | 'clarification' | 'annual_renewal' | 'policy_acknowledgement'
  field?: string
  documentType?: DocumentType
}

export interface Organisation {
  id: string
  name: string
  legalName: string
  slug: string
  type: OrganisationType
  registrationId: string // CIN, URN, Tax ID, Charter code
  officialEmail: string
  phone: string
  websiteUrl?: string
  address: OrganisationAddress
  intendedUse: IntendedUsage
  representative: AuthorisedRepresentative
  documents: VerificationDocument[]
  verificationStatus: VerificationStatus
  verificationNotes?: string
  reviewerFeedback?: string
  history: VerificationHistoryEntry[]
  outstandingActions: OutstandingAction[]
  createdAt: string
  updatedAt: string
  verifiedAt?: string
  tier?: 'tier_1_academic' | 'tier_2_lab' | 'tier_3_makerspace' | 'corporate_partner'
}

export interface OrganisationRegistrationInput {
  // Step 1: Profile
  legalName: string
  type: OrganisationType
  registrationId: string
  websiteUrl?: string

  // Step 2: Contact & Location
  officialEmail: string
  phone: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  country: string

  // Step 3: Usage & Representative
  sharingMode: SharingMode
  resourceCategories: string[]
  expectedVolume: 'occasional' | 'weekly' | 'daily' | 'high_throughput'
  representativeName: string
  representativeTitle: string
  representativeEmail: string
  representativePhone: string
  representativeDepartment?: string
  hasDeclaration: boolean

  // Step 4: Documents (IDs or uploads)
  documents: VerificationDocument[]
}

export interface ResubmissionInput {
  clarificationNotes: string
  updatedFields?: Partial<OrganisationRegistrationInput>
  newDocuments?: VerificationDocument[]
}

