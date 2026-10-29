/**
 * features/incidents/index.ts
 * Incident reporting and resolution.
 */
export {
  reportIncident,
  updateIncidentStatus,
  assignIncident,
  addIncidentEvidence,
  uploadIncidentEvidence,
  placeSafetyHold,
  releaseSafetyHold,
  getSafetyHolds,
  getIncidentHistory,
  getResourceIncidents,
  getIncident,
} from './incidentService'
