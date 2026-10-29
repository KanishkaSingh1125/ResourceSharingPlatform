export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          phone: string | null
          title: string | null
          department: string | null
          organisation_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          title?: string | null
          department?: string | null
          organisation_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          title?: string | null
          department?: string | null
          organisation_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      organisations: {
        Row: {
          id: string
          name: string
          legal_name: string
          slug: string
          type: string
          registration_id: string
          official_email: string
          phone: string
          website_url: string | null
          address: Json
          intended_use: Json
          representative: Json
          verification_status: string
          tier: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          legal_name: string
          slug: string
          type: string
          registration_id: string
          official_email: string
          phone: string
          website_url?: string | null
          address: Json
          intended_use: Json
          representative: Json
          verification_status?: string
          tier?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          legal_name?: string
          slug?: string
          type?: string
          registration_id?: string
          official_email?: string
          phone?: string
          website_url?: string | null
          address?: Json
          intended_use?: Json
          representative?: Json
          verification_status?: string
          tier?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organisation_memberships: {
        Row: {
          id: string
          organisation_id: string
          user_id: string
          role: string
          status: string
          joined_at: string
        }
        Insert: {
          id?: string
          organisation_id: string
          user_id: string
          role?: string
          status?: string
          joined_at?: string
        }
        Update: {
          id?: string
          organisation_id?: string
          user_id?: string
          role?: string
          status?: string
          joined_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          organisation_id: string
          title: string
          slug: string
          description: string
          category: string
          resource_type: string
          images: Json
          location: Json
          capacity: number | null
          is_accessible: boolean
          availability_status: string
          access_level: string
          rate: Json
          usage_rules: Json
          required_credentials: Json
          booking_conditions: Json
          specifications: Json
          operating_hours: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organisation_id: string
          title: string
          slug: string
          description: string
          category: string
          resource_type: string
          images?: Json
          location: Json
          capacity?: number | null
          is_accessible?: boolean
          availability_status?: string
          access_level?: string
          rate: Json
          usage_rules?: Json
          required_credentials?: Json
          booking_conditions?: Json
          specifications?: Json
          operating_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organisation_id?: string
          title?: string
          slug?: string
          description?: string
          category?: string
          resource_type?: string
          images?: Json
          location?: Json
          capacity?: number | null
          is_accessible?: boolean
          availability_status?: string
          access_level?: string
          rate?: Json
          usage_rules?: Json
          required_credentials?: Json
          booking_conditions?: Json
          specifications?: Json
          operating_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          resource_id: string
          user_id: string
          organisation_id: string
          owner_organisation_id: string
          status: string
          start_time: string
          end_time: string
          purpose: string
          attendees_count: number | null
          special_requirements: string | null
          qr_pass_code: string | null
          check_in_time: string | null
          check_out_time: string | null
          condition_on_checkout: string | null
          condition_on_return: string | null
          rejection_reason: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          user_id: string
          organisation_id: string
          owner_organisation_id: string
          status?: string
          start_time: string
          end_time: string
          purpose: string
          attendees_count?: number | null
          special_requirements?: string | null
          qr_pass_code?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          condition_on_checkout?: string | null
          condition_on_return?: string | null
          rejection_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resource_id?: string
          user_id?: string
          organisation_id?: string
          owner_organisation_id?: string
          status?: string
          start_time?: string
          end_time?: string
          purpose?: string
          attendees_count?: number | null
          special_requirements?: string | null
          qr_pass_code?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          condition_on_checkout?: string | null
          condition_on_return?: string | null
          rejection_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          link?: string | null
          created_at?: string
        }
      }
      reports_and_incidents: {
        Row: {
          id: string
          type: string
          resource_id: string
          booking_id: string | null
          reported_by_user_id: string
          organisation_id: string
          severity: string
          title: string
          description: string
          status: string
          attachments: Json
          resolution_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          resource_id: string
          booking_id?: string | null
          reported_by_user_id: string
          organisation_id: string
          severity: string
          title: string
          description: string
          status?: string
          attachments?: Json
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          resource_id?: string
          booking_id?: string | null
          reported_by_user_id?: string
          organisation_id?: string
          severity?: string
          title?: string
          description?: string
          status?: string
          attachments?: Json
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
