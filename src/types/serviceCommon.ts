import { isSupabaseConfigured } from '@/lib/supabase'

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

export function requireBackendInProduction(operation: string): void {
  if (import.meta.env.PROD && !isSupabaseConfigured) {
    throw new Error(`${operation} requires a configured backend.`)
  }
}
