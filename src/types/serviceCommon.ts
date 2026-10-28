export interface ServiceError {
  code: string
  message: string
  details?: unknown
}

export interface ServiceResponse<T> {
  data: T | null
  error: ServiceError | null
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type SortDirection = 'asc' | 'desc'

