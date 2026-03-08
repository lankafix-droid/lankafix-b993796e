export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          assigned_at: string | null
          assignment_mode: string | null
          booking_source: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          category_code: string
          completed_at: string | null
          completion_otp: string | null
          completion_otp_expires_at: string | null
          contact_unlocked: boolean | null
          created_at: string
          customer_address: Json | null
          customer_id: string | null
          customer_latitude: number | null
          customer_longitude: number | null
          customer_rating: number | null
          customer_review: string | null
          deposit_lkr: number | null
          device_details: Json | null
          diagnostic_answers: Json | null
          diagnostic_summary: Json | null
          emergency_surcharge_lkr: number | null
          estimated_price_lkr: number | null
          final_price_lkr: number | null
          id: string
          is_emergency: boolean | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          photos: Json | null
          pricing_archetype: Database["public"]["Enums"]["pricing_archetype"]
          protection_fee_lkr: number | null
          protection_paid_at: string | null
          protection_refundable: boolean | null
          protection_status: string | null
          protection_type: string | null
          revisit_count: number | null
          scheduled_at: string | null
          service_mode: Database["public"]["Enums"]["service_mode"] | null
          service_type: string | null
          sla_breached: boolean | null
          sla_eta_minutes: number | null
          start_otp: string | null
          start_otp_expires_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          travel_fee_lkr: number | null
          under_mediation: boolean | null
          updated_at: string
          zone_code: string | null
        }
        Insert: {
          assigned_at?: string | null
          assignment_mode?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_code: string
          completed_at?: string | null
          completion_otp?: string | null
          completion_otp_expires_at?: string | null
          contact_unlocked?: boolean | null
          created_at?: string
          customer_address?: Json | null
          customer_id?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_rating?: number | null
          customer_review?: string | null
          deposit_lkr?: number | null
          device_details?: Json | null
          diagnostic_answers?: Json | null
          diagnostic_summary?: Json | null
          emergency_surcharge_lkr?: number | null
          estimated_price_lkr?: number | null
          final_price_lkr?: number | null
          id?: string
          is_emergency?: boolean | null
          notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          photos?: Json | null
          pricing_archetype?: Database["public"]["Enums"]["pricing_archetype"]
          protection_fee_lkr?: number | null
          protection_paid_at?: string | null
          protection_refundable?: boolean | null
          protection_status?: string | null
          protection_type?: string | null
          revisit_count?: number | null
          scheduled_at?: string | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          service_type?: string | null
          sla_breached?: boolean | null
          sla_eta_minutes?: number | null
          start_otp?: string | null
          start_otp_expires_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          travel_fee_lkr?: number | null
          under_mediation?: boolean | null
          updated_at?: string
          zone_code?: string | null
        }
        Update: {
          assigned_at?: string | null
          assignment_mode?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_code?: string
          completed_at?: string | null
          completion_otp?: string | null
          completion_otp_expires_at?: string | null
          contact_unlocked?: boolean | null
          created_at?: string
          customer_address?: Json | null
          customer_id?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_rating?: number | null
          customer_review?: string | null
          deposit_lkr?: number | null
          device_details?: Json | null
          diagnostic_answers?: Json | null
          diagnostic_summary?: Json | null
          emergency_surcharge_lkr?: number | null
          estimated_price_lkr?: number | null
          final_price_lkr?: number | null
          id?: string
          is_emergency?: boolean | null
          notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          photos?: Json | null
          pricing_archetype?: Database["public"]["Enums"]["pricing_archetype"]
          protection_fee_lkr?: number | null
          protection_paid_at?: string | null
          protection_refundable?: boolean | null
          protection_status?: string | null
          protection_type?: string | null
          revisit_count?: number | null
          scheduled_at?: string | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          service_type?: string | null
          sla_breached?: boolean | null
          sla_eta_minutes?: number | null
          start_otp?: string | null
          start_otp_expires_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          travel_fee_lkr?: number | null
          under_mediation?: boolean | null
          updated_at?: string
          zone_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean | null
          label: string
          landmark: string | null
          latitude: number | null
          longitude: number | null
          zone_code: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean | null
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          zone_code?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean | null
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          zone_code?: string | null
        }
        Relationships: []
      }
      dispatch_log: {
        Row: {
          booking_id: string
          created_at: string
          dispatch_round: number | null
          distance_km: number | null
          eta_minutes: number | null
          id: string
          partner_id: string
          responded_at: string | null
          response: string | null
          response_time_seconds: number | null
          score: number | null
          score_breakdown: Json | null
          status: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          dispatch_round?: number | null
          distance_km?: number | null
          eta_minutes?: number | null
          id?: string
          partner_id: string
          responded_at?: string | null
          response?: string | null
          response_time_seconds?: number | null
          score?: number | null
          score_breakdown?: Json | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          dispatch_round?: number | null
          distance_km?: number | null
          eta_minutes?: number | null
          id?: string
          partner_id?: string
          responded_at?: string | null
          response?: string | null
          response_time_seconds?: number | null
          score?: number | null
          score_breakdown?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      job_timeline: {
        Row: {
          actor: string | null
          booking_id: string
          created_at: string
          id: string
          metadata: Json | null
          note: string | null
          status: string
        }
        Insert: {
          actor?: string | null
          booking_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          status: string
        }
        Update: {
          actor?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_timeline_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string
          id: string
          notes: string | null
          partner_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          notes?: string | null
          partner_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          partner_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_settlements: {
        Row: {
          booking_id: string
          created_at: string
          gross_amount_lkr: number
          id: string
          net_payout_lkr: number
          partner_id: string
          platform_commission_lkr: number
          settled_at: string | null
          settlement_status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          gross_amount_lkr?: number
          id?: string
          net_payout_lkr?: number
          partner_id: string
          platform_commission_lkr?: number
          settled_at?: string | null
          settlement_status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          gross_amount_lkr?: number
          id?: string
          net_payout_lkr?: number
          partner_id?: string
          platform_commission_lkr?: number
          settled_at?: string | null
          settlement_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_settlements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          acceptance_rate: number | null
          active_job_id: string | null
          availability_status: Database["public"]["Enums"]["partner_availability"]
          average_response_time_minutes: number | null
          base_latitude: number | null
          base_longitude: number | null
          brand_specializations: string[] | null
          business_name: string | null
          cancellation_rate: number | null
          categories_supported: string[]
          completed_jobs_count: number | null
          created_at: string
          current_job_count: number | null
          current_latitude: number | null
          current_longitude: number | null
          emergency_available: boolean | null
          experience_years: number | null
          full_name: string
          id: string
          last_location_ping_at: string | null
          late_arrival_count: number | null
          max_concurrent_jobs: number | null
          max_jobs_per_day: number | null
          performance_score: number | null
          phone_number: string
          profile_photo_url: string | null
          rating_average: number | null
          service_zones: string[] | null
          specializations: string[] | null
          strike_count: number | null
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
          verification_status: Database["public"]["Enums"]["partner_verification_status"]
        }
        Insert: {
          acceptance_rate?: number | null
          active_job_id?: string | null
          availability_status?: Database["public"]["Enums"]["partner_availability"]
          average_response_time_minutes?: number | null
          base_latitude?: number | null
          base_longitude?: number | null
          brand_specializations?: string[] | null
          business_name?: string | null
          cancellation_rate?: number | null
          categories_supported?: string[]
          completed_jobs_count?: number | null
          created_at?: string
          current_job_count?: number | null
          current_latitude?: number | null
          current_longitude?: number | null
          emergency_available?: boolean | null
          experience_years?: number | null
          full_name: string
          id?: string
          last_location_ping_at?: string | null
          late_arrival_count?: number | null
          max_concurrent_jobs?: number | null
          max_jobs_per_day?: number | null
          performance_score?: number | null
          phone_number: string
          profile_photo_url?: string | null
          rating_average?: number | null
          service_zones?: string[] | null
          specializations?: string[] | null
          strike_count?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
          verification_status?: Database["public"]["Enums"]["partner_verification_status"]
        }
        Update: {
          acceptance_rate?: number | null
          active_job_id?: string | null
          availability_status?: Database["public"]["Enums"]["partner_availability"]
          average_response_time_minutes?: number | null
          base_latitude?: number | null
          base_longitude?: number | null
          brand_specializations?: string[] | null
          business_name?: string | null
          cancellation_rate?: number | null
          categories_supported?: string[]
          completed_jobs_count?: number | null
          created_at?: string
          current_job_count?: number | null
          current_latitude?: number | null
          current_longitude?: number | null
          emergency_available?: boolean | null
          experience_years?: number | null
          full_name?: string
          id?: string
          last_location_ping_at?: string | null
          late_arrival_count?: number | null
          max_concurrent_jobs?: number | null
          max_jobs_per_day?: number | null
          performance_score?: number | null
          phone_number?: string
          profile_photo_url?: string | null
          rating_average?: number | null
          service_zones?: string[] | null
          specializations?: string[] | null
          strike_count?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
          verification_status?: Database["public"]["Enums"]["partner_verification_status"]
        }
        Relationships: []
      }
      parts_catalog: {
        Row: {
          brand: string | null
          category_code: string
          id: string
          last_updated_at: string | null
          model: string | null
          part_grade: string | null
          part_type: string
          price_lkr: number
          stock_status: string | null
          supplier_name: string | null
        }
        Insert: {
          brand?: string | null
          category_code: string
          id?: string
          last_updated_at?: string | null
          model?: string | null
          part_grade?: string | null
          part_type: string
          price_lkr?: number
          stock_status?: string | null
          supplier_name?: string | null
        }
        Update: {
          brand?: string | null
          category_code?: string
          id?: string
          last_updated_at?: string | null
          model?: string | null
          part_grade?: string | null
          part_type?: string
          price_lkr?: number
          stock_status?: string | null
          supplier_name?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_lkr: number
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_status: string
          payment_type: string
          transaction_ref: string | null
        }
        Insert: {
          amount_lkr: number
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          payment_type?: string
          transaction_ref?: string | null
        }
        Update: {
          amount_lkr?: number
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          payment_type?: string
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          archetype: Database["public"]["Enums"]["pricing_archetype"]
          base_price_lkr: number | null
          category_code: string
          description: string | null
          id: string
          includes: string[] | null
          is_active: boolean | null
          label: string
          service_type: string
          updated_at: string
        }
        Insert: {
          archetype: Database["public"]["Enums"]["pricing_archetype"]
          base_price_lkr?: number | null
          category_code: string
          description?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          label: string
          service_type: string
          updated_at?: string
        }
        Update: {
          archetype?: Database["public"]["Enums"]["pricing_archetype"]
          base_price_lkr?: number | null
          category_code?: string
          description?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          label?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_address: Json | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_address?: Json | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_address?: Json | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          id: string
          item_type: string
          label: string
          metadata: Json | null
          qty: number | null
          quote_id: string
          total_price_lkr: number
          unit_price_lkr: number
        }
        Insert: {
          id?: string
          item_type?: string
          label: string
          metadata?: Json | null
          qty?: number | null
          quote_id: string
          total_price_lkr?: number
          unit_price_lkr?: number
        }
        Update: {
          id?: string
          item_type?: string
          label?: string
          metadata?: Json | null
          qty?: number | null
          quote_id?: string
          total_price_lkr?: number
          unit_price_lkr?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          additional_items: Json | null
          approved_at: string | null
          booking_id: string
          created_at: string
          customer_note: string | null
          estimated_completion: string | null
          expires_at: string | null
          id: string
          labour_lkr: number | null
          notes: string | null
          part_grade: string | null
          partner_id: string
          parts: Json | null
          service_charge_lkr: number | null
          status: Database["public"]["Enums"]["quote_status"]
          total_lkr: number | null
          updated_at: string
          warranty_days: number | null
          warranty_terms: string | null
        }
        Insert: {
          additional_items?: Json | null
          approved_at?: string | null
          booking_id: string
          created_at?: string
          customer_note?: string | null
          estimated_completion?: string | null
          expires_at?: string | null
          id?: string
          labour_lkr?: number | null
          notes?: string | null
          part_grade?: string | null
          partner_id: string
          parts?: Json | null
          service_charge_lkr?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_lkr?: number | null
          updated_at?: string
          warranty_days?: number | null
          warranty_terms?: string | null
        }
        Update: {
          additional_items?: Json | null
          approved_at?: string | null
          booking_id?: string
          created_at?: string
          customer_note?: string | null
          estimated_completion?: string | null
          expires_at?: string | null
          id?: string
          labour_lkr?: number | null
          notes?: string | null
          part_grade?: string | null
          partner_id?: string
          parts?: Json | null
          service_charge_lkr?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_lkr?: number | null
          updated_at?: string
          warranty_days?: number | null
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zones: {
        Row: {
          center_latitude: number | null
          center_longitude: number | null
          created_at: string
          id: string
          is_active: boolean | null
          surge_multiplier: number | null
          travel_fee_lkr: number | null
          zone_code: string
          zone_group: string
          zone_name: string
        }
        Insert: {
          center_latitude?: number | null
          center_longitude?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          surge_multiplier?: number | null
          travel_fee_lkr?: number | null
          zone_code: string
          zone_group?: string
          zone_name: string
        }
        Update: {
          center_latitude?: number | null
          center_longitude?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          surge_multiplier?: number | null
          travel_fee_lkr?: number | null
          zone_code?: string
          zone_group?: string
          zone_name?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          attachments: Json | null
          booking_id: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          issue_type: string
          partner_id: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          attachments?: Json | null
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          issue_type: string
          partner_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          attachments?: Json | null
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          issue_type?: string
          partner_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status:
        | "requested"
        | "matching"
        | "awaiting_partner_confirmation"
        | "assigned"
        | "tech_en_route"
        | "arrived"
        | "inspection_started"
        | "quote_submitted"
        | "quote_approved"
        | "repair_started"
        | "quality_check"
        | "invoice_ready"
        | "completed"
        | "cancelled"
        | "no_show"
      partner_availability: "online" | "offline" | "busy"
      partner_verification_status: "pending" | "verified" | "suspended"
      payment_status:
        | "pending"
        | "deposit_paid"
        | "paid"
        | "refunded"
        | "partial_refund"
      pricing_archetype:
        | "fixed_price"
        | "starting_from"
        | "diagnostic_first"
        | "inspection_required"
      quote_status:
        | "draft"
        | "submitted"
        | "awaiting_approval"
        | "approved"
        | "rejected"
        | "revision_requested"
        | "expired"
      service_mode:
        | "on_site"
        | "drop_off"
        | "pickup_return"
        | "express"
        | "remote"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      booking_status: [
        "requested",
        "matching",
        "awaiting_partner_confirmation",
        "assigned",
        "tech_en_route",
        "arrived",
        "inspection_started",
        "quote_submitted",
        "quote_approved",
        "repair_started",
        "quality_check",
        "invoice_ready",
        "completed",
        "cancelled",
        "no_show",
      ],
      partner_availability: ["online", "offline", "busy"],
      partner_verification_status: ["pending", "verified", "suspended"],
      payment_status: [
        "pending",
        "deposit_paid",
        "paid",
        "refunded",
        "partial_refund",
      ],
      pricing_archetype: [
        "fixed_price",
        "starting_from",
        "diagnostic_first",
        "inspection_required",
      ],
      quote_status: [
        "draft",
        "submitted",
        "awaiting_approval",
        "approved",
        "rejected",
        "revision_requested",
        "expired",
      ],
      service_mode: [
        "on_site",
        "drop_off",
        "pickup_return",
        "express",
        "remote",
      ],
    },
  },
} as const
