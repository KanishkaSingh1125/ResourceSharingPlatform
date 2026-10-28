/**
 * features/eligibility/index.ts
 * Eligibility checks, FairShare scoring, and credential management.
 */
export {
  checkEligibility,
  getEligibilityRules,
  addEligibilityRule,
  deleteEligibilityRule,
  getMyCredentials,
  addCredential,
  computeFairShareScore,
} from './eligibilityService'
