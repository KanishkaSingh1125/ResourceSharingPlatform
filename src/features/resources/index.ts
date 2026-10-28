/**
 * features/resources/index.ts
 * Resource catalogue: CRUD, search, availability, maintenance.
 */
export {
  getCategories,
  createResource,
  getResource,
  updateResource,
  searchResources,
  getOrgResources,
  getAvailability,
  setAvailability,
  getMaintenanceBlocks,
  createMaintenanceBlock,
  deleteMaintenanceBlock,
} from './resourceService'
