import {
  type Organisation,
  type OrganisationRegistrationInput,
  type VerificationStatus,
  type VerificationDocument,
  type VerificationHistoryEntry,
  type DocumentType,
  type ResubmissionInput,
  type OutstandingAction,
} from '@/types/organisation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const STORAGE_KEY_ORGS = 'sharesphere_organisations_v1'
const STORAGE_KEY_CURRENT_ORG_ID = 'sharesphere_active_org_id'

// Initial seed organisation with established verification history
const SEED_ORGANISATION: Organisation = {
  id: 'org-mit-nanotech-01',
  name: 'MIT Nanotech Core Lab',
  legalName: 'Massachusetts Institute of Technology - Department of Nanoscale Engineering',
  slug: 'mit-nanotech',
  type: 'university',
  registrationId: 'EDU-FED-042891',
  officialEmail: 'nanotech-core@mit.edu',
  phone: '+1 (617) 253-1000',
  websiteUrl: 'https://nanotech.mit.edu',
  address: {
    streetAddress: '77 Massachusetts Avenue, Building 24-041',
    city: 'Cambridge',
    state: 'Massachusetts',
    postalCode: '02139',
    country: 'United States',
  },
  intendedUse: {
    mode: 'both',
    resourceCategories: ['Laboratories', 'Computers & High-Compute', 'Cameras & Imaging'],
    expectedVolume: 'daily',
    notes: 'Primary inter-institutional access point for sub-micron photolithography and cryo-EM.',
  },
  representative: {
    fullName: 'Prof. Alan Turing',
    jobTitle: 'Director of Laboratory Operations',
    email: 'turing@mit.edu',
    phone: '+1 (617) 253-9081',
    department: 'School of Science & Engineering',
    hasAuthorisationDeclaration: true,
  },
  documents: [
    {
      id: 'doc-seed-1',
      orgId: 'org-mit-nanotech-01',
      documentType: 'registration_certificate',
      name: 'MIT_University_Charter_Accreditation.pdf',
      size: 2450000,
      mimeType: 'application/pdf',
      storagePath: 'organisation-documents/org-mit-nanotech-01/registration_certificate/MIT_University_Charter_Accreditation.pdf',
      uploadedAt: '2026-09-12T08:30:00Z',
      status: 'verified',
    },
    {
      id: 'doc-seed-2',
      orgId: 'org-mit-nanotech-01',
      documentType: 'accreditation_certificate',
      name: 'Govt_Higher_Ed_Accreditation_2026.pdf',
      size: 1820000,
      mimeType: 'application/pdf',
      storagePath: 'organisation-documents/org-mit-nanotech-01/accreditation_certificate/Govt_Higher_Ed_Accreditation_2026.pdf',
      uploadedAt: '2026-09-12T08:35:00Z',
      status: 'verified',
    },
    {
      id: 'doc-seed-3',
      orgId: 'org-mit-nanotech-01',
      documentType: 'authorization_letter',
      name: 'Board_Mandate_Director_Turing.pdf',
      size: 920000,
      mimeType: 'application/pdf',
      storagePath: 'organisation-documents/org-mit-nanotech-01/authorization_letter/Board_Mandate_Director_Turing.pdf',
      uploadedAt: '2026-09-12T08:40:00Z',
      status: 'verified',
    },
  ],
  verificationStatus: 'approved',
  verificationNotes: 'Institutional credentials, university charter, and facility insurance verified. Valid through Oct 2027.',
  tier: 'tier_1_academic',
  verifiedAt: '2026-09-15T14:20:00Z',
  createdAt: '2026-09-12T08:20:00Z',
  updatedAt: '2026-09-15T14:20:00Z',
  history: [
    {
      id: 'h-1',
      orgId: 'org-mit-nanotech-01',
      status: 'draft',
      timestamp: '2026-09-12T08:20:00Z',
      actor: 'Prof. Alan Turing',
      title: 'Registration Application Started',
      note: 'Initial profile and facility contact details entered.',
    },
    {
      id: 'h-2',
      orgId: 'org-mit-nanotech-01',
      status: 'submitted',
      timestamp: '2026-09-12T08:45:00Z',
      actor: 'Prof. Alan Turing',
      title: 'Application Submitted for Verification',
      note: 'Supporting charter, accreditation, and authorization mandate uploaded.',
    },
    {
      id: 'h-3',
      orgId: 'org-mit-nanotech-01',
      status: 'under_review',
      timestamp: '2026-09-13T10:15:00Z',
      actor: 'Platform Trust & Compliance Board',
      title: 'Institutional Audit Commenced',
      note: 'Assigned to Senior Auditor Dr. Eleanor Vance.',
    },
    {
      id: 'h-4',
      orgId: 'org-mit-nanotech-01',
      status: 'approved',
      timestamp: '2026-09-15T14:20:00Z',
      actor: 'Platform Trust & Compliance Board',
      title: 'Organisation Verified - Tier 1 Clearance',
      note: 'MOU executed. Permitted to list cleanroom slots, compute clusters, and analytical instrumentation.',
    },
  ],
  outstandingActions: [],
}

/**
 * Retrieve all organizations from local persistent store (or Supabase fallback)
 */
function getStoredOrganisations(): Record<string, Organisation> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORGS)
    if (!raw) {
      const initial = { [SEED_ORGANISATION.id]: SEED_ORGANISATION }
      localStorage.setItem(STORAGE_KEY_ORGS, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load organizations from storage', err)
    return { [SEED_ORGANISATION.id]: SEED_ORGANISATION }
  }
}

function saveStoredOrganisations(orgs: Record<string, Organisation>) {
  try {
    localStorage.setItem(STORAGE_KEY_ORGS, JSON.stringify(orgs))
  } catch (err) {
    console.error('Failed to persist organizations to storage', err)
  }
}

/**
 * Get current active organisation ID
 */
export function getCurrentOrganisationId(): string {
  const storedId = localStorage.getItem(STORAGE_KEY_CURRENT_ORG_ID)
  if (storedId) return storedId
  // Default to seed organization
  localStorage.setItem(STORAGE_KEY_CURRENT_ORG_ID, SEED_ORGANISATION.id)
  return SEED_ORGANISATION.id
}

/**
 * Switch active organisation (for testing multiple org verification states)
 */
export function setCurrentOrganisationId(orgId: string): void {
  localStorage.setItem(STORAGE_KEY_CURRENT_ORG_ID, orgId)
}

/**
 * Fetch current organisation details
 */
export async function getCurrentOrganisation(): Promise<Organisation> {
  const orgId = getCurrentOrganisationId()
  const org = await getOrganisationById(orgId)
  if (!org) {
    return SEED_ORGANISATION
  }
  return org
}

/**
 * Fetch organisation by ID
 */
export async function getOrganisationById(orgId: string): Promise<Organisation | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (!error && data) {
        return data as Organisation
      }
    } catch {
      // Fallback gracefully to local persistent store
    }
  }

  // Local persistent repository
  const orgs = getStoredOrganisations()
  return orgs[orgId] || null
}

/**
 * Get all registered organisations (admin list)
 */
export async function getAllOrganisations(): Promise<Organisation[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as Organisation[]
      }
    } catch {
      // Fallback
    }
  }

  const orgs = getStoredOrganisations()
  return Object.values(orgs)
}

/**
 * Upload a verification supporting document using authorized path convention:
 * `organisation-documents/{orgId}/{documentType}/{fileName}`
 */
export async function uploadVerificationDocument(
  orgId: string,
  documentType: DocumentType,
  file: File
): Promise<VerificationDocument> {
  // Validate file parameters
  const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File exceeds the 10MB maximum size limit.')
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `organisation-documents/${orgId}/${documentType}/${Date.now()}_${sanitizedFileName}`

  if (isSupabaseConfigured) {
    try {
      const { error: uploadError } = await supabase.storage
        .from('organisation-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }
    } catch (err) {
      console.warn('Supabase storage upload failed or not configured, falling back to local vault:', err)
    }
  }

  // Construct document record
  const docRecord: VerificationDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orgId,
    documentType,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    storagePath,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
  }

  return docRecord
}

/**
 * Create or update draft organisation application
 */
export async function saveOrganisationDraft(
  input: Partial<OrganisationRegistrationInput>,
  existingOrgId?: string
): Promise<Organisation> {
  const orgs = getStoredOrganisations()
  const now = new Date().toISOString()
  const orgId = existingOrgId || `org-${Date.now()}`

  const existing = orgs[orgId]

  const updatedOrg: Organisation = {
    id: orgId,
    name: input.legalName || existing?.name || 'Untitled Draft Organisation',
    legalName: input.legalName || existing?.legalName || '',
    slug: (input.legalName || 'draft-org')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    type: input.type || existing?.type || 'university',
    registrationId: input.registrationId || existing?.registrationId || '',
    officialEmail: input.officialEmail || existing?.officialEmail || '',
    phone: input.phone || existing?.phone || '',
    websiteUrl: input.websiteUrl || existing?.websiteUrl || '',
    address: {
      streetAddress: input.streetAddress || existing?.address.streetAddress || '',
      city: input.city || existing?.address.city || '',
      state: input.state || existing?.address.state || '',
      postalCode: input.postalCode || existing?.address.postalCode || '',
      country: input.country || existing?.address.country || 'India',
    },
    intendedUse: {
      mode: input.sharingMode || existing?.intendedUse.mode || 'both',
      resourceCategories: input.resourceCategories || existing?.intendedUse.resourceCategories || [],
      expectedVolume: input.expectedVolume || existing?.intendedUse.expectedVolume || 'weekly',
    },
    representative: {
      fullName: input.representativeName || existing?.representative.fullName || '',
      jobTitle: input.representativeTitle || existing?.representative.jobTitle || '',
      email: input.representativeEmail || existing?.representative.email || '',
      phone: input.representativePhone || existing?.representative.phone || '',
      department: input.representativeDepartment || existing?.representative.department || '',
      hasAuthorisationDeclaration: input.hasDeclaration ?? existing?.representative.hasAuthorisationDeclaration ?? false,
    },
    documents: input.documents || existing?.documents || [],
    verificationStatus: 'draft',
    history: existing?.history || [
      {
        id: `h-draft-${Date.now()}`,
        orgId,
        status: 'draft',
        timestamp: now,
        actor: input.representativeName || 'Applicant',
        title: 'Draft Application Saved',
        note: 'Registration progress saved. Can be resumed anytime.',
      },
    ],
    outstandingActions: existing?.outstandingActions || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  orgs[orgId] = updatedOrg
  saveStoredOrganisations(orgs)
  setCurrentOrganisationId(orgId)

  return updatedOrg
}

/**
 * Submit completed organisation registration for verification
 * IMPORTANT: Sets status to 'submitted' (never 'approved').
 */
export async function submitOrganisationRegistration(
  input: OrganisationRegistrationInput,
  draftId?: string
): Promise<Organisation> {
  const orgs = getStoredOrganisations()
  const now = new Date().toISOString()
  const orgId = draftId || `org-${Date.now()}`

  // Validate required documents
  const requiredTypes: DocumentType[] = [
    'registration_certificate',
    'accreditation_certificate',
    'authorization_letter',
  ]
  const uploadedTypes = new Set(input.documents.map((d) => d.documentType))

  const missingTypes = requiredTypes.filter((t) => !uploadedTypes.has(t))
  if (missingTypes.length > 0) {
    throw new Error(
      `Missing required supporting documentation: ${missingTypes.join(', ')}`
    )
  }

  const historyEntry: VerificationHistoryEntry = {
    id: `h-${Date.now()}`,
    orgId,
    status: 'submitted',
    timestamp: now,
    actor: input.representativeName,
    title: 'Verification Application Formally Submitted',
    note: `Submitted by ${input.representativeName} (${input.representativeTitle}). Placed into platform verification audit queue.`,
  }

  const existing = orgs[orgId]

  const newOrg: Organisation = {
    id: orgId,
    name: input.legalName,
    legalName: input.legalName,
    slug: input.legalName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    type: input.type,
    registrationId: input.registrationId,
    officialEmail: input.officialEmail,
    phone: input.phone,
    websiteUrl: input.websiteUrl,
    address: {
      streetAddress: input.streetAddress,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
    },
    intendedUse: {
      mode: input.sharingMode,
      resourceCategories: input.resourceCategories,
      expectedVolume: input.expectedVolume,
    },
    representative: {
      fullName: input.representativeName,
      jobTitle: input.representativeTitle,
      email: input.representativeEmail,
      phone: input.representativePhone,
      department: input.representativeDepartment,
      hasAuthorisationDeclaration: input.hasDeclaration,
    },
    documents: input.documents,
    verificationStatus: 'submitted', // Never 'approved' simply because form was submitted!
    history: existing ? [historyEntry, ...existing.history] : [historyEntry],
    outstandingActions: [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  orgs[orgId] = newOrg
  saveStoredOrganisations(orgs)
  setCurrentOrganisationId(orgId)

  return newOrg
}

/**
 * Resubmission workflow for when status is 'additional_info_required'
 */
export async function resubmitOrganisationVerification(
  orgId: string,
  input: ResubmissionInput
): Promise<Organisation> {
  const orgs = getStoredOrganisations()
  const org = orgs[orgId]

  if (!org) {
    throw new Error('Organisation not found')
  }

  const now = new Date().toISOString()

  // Merge new documents if any
  let updatedDocs = [...org.documents]
  if (input.newDocuments && input.newDocuments.length > 0) {
    const newDocTypeSet = new Set(input.newDocuments.map((d) => d.documentType))
    // Filter out old versions of replaced document types
    updatedDocs = updatedDocs.filter((d) => !newDocTypeSet.has(d.documentType))
    updatedDocs.push(...input.newDocuments)
  }

  const historyEntry: VerificationHistoryEntry = {
    id: `h-${Date.now()}`,
    orgId,
    status: 'under_review',
    timestamp: now,
    actor: org.representative.fullName,
    title: 'Additional Information & Replacement Documents Resubmitted',
    note: input.clarificationNotes,
  }

  // Clear outstanding actions that were addressed
  const updatedOrg: Organisation = {
    ...org,
    documents: updatedDocs,
    verificationStatus: 'under_review',
    reviewerFeedback: undefined,
    history: [historyEntry, ...org.history],
    outstandingActions: [],
    updatedAt: now,
  }

  orgs[orgId] = updatedOrg
  saveStoredOrganisations(orgs)

  return updatedOrg
}

/**
 * Admin action to transition verification status
 * (Used for simulation and the admin verification queue)
 */
export async function setOrganisationVerificationStatus(
  orgId: string,
  newStatus: VerificationStatus,
  reviewerNote?: string,
  requestedActions?: OutstandingAction[]
): Promise<Organisation> {
  const orgs = getStoredOrganisations()
  const org = orgs[orgId]

  if (!org) {
    throw new Error('Organisation not found')
  }

  const now = new Date().toISOString()

  const historyEntry: VerificationHistoryEntry = {
    id: `h-${Date.now()}`,
    orgId,
    status: newStatus,
    timestamp: now,
    actor: 'Platform Trust & Compliance Board',
    title: `Status Updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
    note: reviewerNote,
  }

  const updatedOrg: Organisation = {
    ...org,
    verificationStatus: newStatus,
    verificationNotes: reviewerNote || org.verificationNotes,
    reviewerFeedback: newStatus === 'additional_info_required' || newStatus === 'rejected' ? reviewerNote : undefined,
    verifiedAt: newStatus === 'approved' ? now : org.verifiedAt,
    history: [historyEntry, ...org.history],
    outstandingActions: requestedActions || (newStatus === 'additional_info_required' && reviewerNote ? [
      {
        id: `act-${Date.now()}`,
        title: 'Provide Requested Clarification or Replacement Document',
        description: reviewerNote,
        priority: 'high',
        type: 'clarification',
      }
    ] : org.outstandingActions),
    updatedAt: now,
  }

  orgs[orgId] = updatedOrg
  saveStoredOrganisations(orgs)

  return updatedOrg
}

/**
 * Update organisation profile in Settings
 */
export async function updateOrganisationProfile(
  orgId: string,
  updates: Partial<Organisation>
): Promise<Organisation> {
  const orgs = getStoredOrganisations()
  const org = orgs[orgId]

  if (!org) {
    throw new Error('Organisation not found')
  }

  const updatedOrg: Organisation = {
    ...org,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  orgs[orgId] = updatedOrg
  saveStoredOrganisations(orgs)

  return updatedOrg
}


import { type OrganisationMembership } from '@/types/profile'
import { type UserRole } from '@/types/navigation'

const STORAGE_KEY_MEMBERSHIPS = 'sharesphere_memberships_v1'

const SEED_MEMBERSHIPS: Record<string, OrganisationMembership[]> = {
  'org-mit-nanotech-01': [
    {
      id: 'mem-1',
      organisationId: 'org-mit-nanotech-01',
      organisationName: 'MIT Nanotech Core Lab',
      userId: 'usr-turing-01',
      role: 'org_admin',
      status: 'active',
      joinedAt: '2026-09-12T08:20:00Z',
    },
    {
      id: 'mem-2',
      organisationId: 'org-mit-nanotech-01',
      organisationName: 'MIT Nanotech Core Lab',
      userId: 'usr-vance-02',
      role: 'manager',
      status: 'active',
      joinedAt: '2026-09-13T10:00:00Z',
    },
    {
      id: 'mem-3',
      organisationId: 'org-mit-nanotech-01',
      organisationName: 'MIT Nanotech Core Lab',
      userId: 'usr-connor-03',
      role: 'member',
      status: 'active',
      joinedAt: '2026-09-15T12:00:00Z',
    },
  ],
}

function getStoredMemberships(): Record<string, OrganisationMembership[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERSHIPS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_MEMBERSHIPS, JSON.stringify(SEED_MEMBERSHIPS))
      return SEED_MEMBERSHIPS
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load memberships', err)
    return SEED_MEMBERSHIPS
  }
}

function saveStoredMemberships(data: Record<string, OrganisationMembership[]>) {
  try {
    localStorage.setItem(STORAGE_KEY_MEMBERSHIPS, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save memberships', err)
  }
}

export async function getOrganisationMembers(orgId: string): Promise<OrganisationMembership[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('organisation_memberships')
        .select('*')
        .eq('organisation_id', orgId)

      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          organisationId: d.organisation_id,
          organisationName: 'Member Org',
          userId: d.user_id,
          role: (d.role as UserRole) || 'member',
          status: (d.status as 'active' | 'invited' | 'suspended') || 'active',
          joinedAt: d.joined_at,
        }))
      }
    } catch {
      // fallback
    }
  }

  const store = getStoredMemberships()
  return store[orgId] || []
}

export async function addOrganisationMember(
  orgId: string,
  input: { userId: string; role: UserRole; organisationName?: string }
): Promise<OrganisationMembership> {
  const newMember: OrganisationMembership = {
    id: `mem-${Date.now()}`,
    organisationId: orgId,
    organisationName: input.organisationName || 'Organisation',
    userId: input.userId,
    role: input.role,
    status: 'active',
    joinedAt: new Date().toISOString(),
  }

  const store = getStoredMemberships()
  const existing = store[orgId] || []
  store[orgId] = [...existing, newMember]
  saveStoredMemberships(store)

  return newMember
}

export async function updateMemberRole(
  orgId: string,
  membershipId: string,
  newRole: UserRole
): Promise<OrganisationMembership | null> {
  const store = getStoredMemberships()
  const list = store[orgId] || []
  let updatedMember: OrganisationMembership | null = null

  store[orgId] = list.map((m) => {
    if (m.id === membershipId) {
      updatedMember = { ...m, role: newRole }
      return updatedMember
    }
    return m
  })

  if (updatedMember) {
    saveStoredMemberships(store)
  }

  return updatedMember
}
