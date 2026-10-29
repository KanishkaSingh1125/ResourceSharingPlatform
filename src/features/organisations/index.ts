/**
 * features/organisations/index.ts
 * Organisation management: CRUD, membership, verification.
 */
export {
  createOrganisation,
  getOrganisation,
  getOrganisationBySlug,
  updateOrganisation,
  listOrganisations,
  getMyOrganisations,
  getOrgMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  transitionVerificationStatus,
  getVerificationHistory,
  getOrgSharingAnalytics,
  uploadVerificationDocument,
  getVerificationDocuments,
  deleteVerificationDocument,
} from './organisationService'
