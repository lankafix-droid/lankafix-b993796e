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
      ai_interaction_logs: {
        Row: {
          ai_model: string | null
          ai_response: Json | null
          booking_id: string | null
          client_platform: string | null
          confidence_bucket: string | null
          confidence_score: number | null
          converted_to_booking: boolean | null
          created_at: string
          final_service_selected: string | null
          id: string
          image_size_bytes: number | null
          input_image_url: string | null
          input_query: string | null
          interaction_type: string
          matched_category: string | null
          matched_service: string | null
          metadata: Json | null
          recommended_service_used: boolean | null
          response_time_ms: number | null
          session_id: string | null
          urgency_level: string | null
          user_accepted: boolean | null
          user_action: string | null
          user_id: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_response?: Json | null
          booking_id?: string | null
          client_platform?: string | null
          confidence_bucket?: string | null
          confidence_score?: number | null
          converted_to_booking?: boolean | null
          created_at?: string
          final_service_selected?: string | null
          id?: string
          image_size_bytes?: number | null
          input_image_url?: string | null
          input_query?: string | null
          interaction_type?: string
          matched_category?: string | null
          matched_service?: string | null
          metadata?: Json | null
          recommended_service_used?: boolean | null
          response_time_ms?: number | null
          session_id?: string | null
          urgency_level?: string | null
          user_accepted?: boolean | null
          user_action?: string | null
          user_id?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_response?: Json | null
          booking_id?: string | null
          client_platform?: string | null
          confidence_bucket?: string | null
          confidence_score?: number | null
          converted_to_booking?: boolean | null
          created_at?: string
          final_service_selected?: string | null
          id?: string
          image_size_bytes?: number | null
          input_image_url?: string | null
          input_query?: string | null
          interaction_type?: string
          matched_category?: string | null
          matched_service?: string | null
          metadata?: Json | null
          recommended_service_used?: boolean | null
          response_time_ms?: number | null
          session_id?: string | null
          urgency_level?: string | null
          user_accepted?: boolean | null
          user_action?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      booking_messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          original_content: string | null
          sender_id: string
          sender_role: string
          was_masked: boolean
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          original_content?: string | null
          sender_id: string
          sender_role?: string
          was_masked?: boolean
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          original_content?: string | null
          sender_id?: string
          sender_role?: string
          was_masked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_arrival_at: string | null
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
          dispatch_mode: string | null
          dispatch_round: number | null
          dispatch_status: string | null
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
          promised_eta_minutes: number | null
          protection_fee_lkr: number | null
          protection_paid_at: string | null
          protection_refundable: boolean | null
          protection_status: string | null
          protection_type: string | null
          revisit_count: number | null
          scheduled_at: string | null
          selected_partner_id: string | null
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
          actual_arrival_at?: string | null
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
          dispatch_mode?: string | null
          dispatch_round?: number | null
          dispatch_status?: string | null
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
          promised_eta_minutes?: number | null
          protection_fee_lkr?: number | null
          protection_paid_at?: string | null
          protection_refundable?: boolean | null
          protection_status?: string | null
          protection_type?: string | null
          revisit_count?: number | null
          scheduled_at?: string | null
          selected_partner_id?: string | null
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
          actual_arrival_at?: string | null
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
          dispatch_mode?: string | null
          dispatch_round?: number | null
          dispatch_status?: string | null
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
          promised_eta_minutes?: number | null
          protection_fee_lkr?: number | null
          protection_paid_at?: string | null
          protection_refundable?: boolean | null
          protection_status?: string | null
          protection_type?: string | null
          revisit_count?: number | null
          scheduled_at?: string | null
          selected_partner_id?: string | null
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
          {
            foreignKeyName: "bookings_selected_partner_id_fkey"
            columns: ["selected_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      bypass_attempts: {
        Row: {
          action_taken: string | null
          actor_id: string
          actor_role: string
          attempt_type: string
          booking_id: string | null
          created_at: string
          detected_content: string | null
          id: string
        }
        Insert: {
          action_taken?: string | null
          actor_id: string
          actor_role?: string
          attempt_type?: string
          booking_id?: string | null
          created_at?: string
          detected_content?: string | null
          id?: string
        }
        Update: {
          action_taken?: string | null
          actor_id?: string
          actor_role?: string
          attempt_type?: string
          booking_id?: string | null
          created_at?: string
          detected_content?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bypass_attempts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      customer_reminders: {
        Row: {
          category_code: string
          clicked_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          dismissed_at: string | null
          due_date: string
          id: string
          linked_booking_id: string | null
          linked_quote_id: string | null
          message: string
          metadata: Json | null
          next_best_action: string | null
          next_best_category: string | null
          next_best_service: string | null
          priority: string
          reminder_type: string
          sent_at: string | null
          service_type: string | null
          status: string
          title: string
          viewed_at: string | null
        }
        Insert: {
          category_code: string
          clicked_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          dismissed_at?: string | null
          due_date: string
          id?: string
          linked_booking_id?: string | null
          linked_quote_id?: string | null
          message: string
          metadata?: Json | null
          next_best_action?: string | null
          next_best_category?: string | null
          next_best_service?: string | null
          priority?: string
          reminder_type?: string
          sent_at?: string | null
          service_type?: string | null
          status?: string
          title: string
          viewed_at?: string | null
        }
        Update: {
          category_code?: string
          clicked_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          dismissed_at?: string | null
          due_date?: string
          id?: string
          linked_booking_id?: string | null
          linked_quote_id?: string | null
          message?: string
          metadata?: Json | null
          next_best_action?: string | null
          next_best_category?: string | null
          next_best_service?: string | null
          priority?: string
          reminder_type?: string
          sent_at?: string | null
          service_type?: string | null
          status?: string
          title?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      device_passports: {
        Row: {
          brand: string
          created_at: string
          device_category: string
          device_nickname: string
          health_score: number
          id: string
          installation_date: string | null
          installation_location: string
          model: string
          owner_name: string | null
          purchase_date: string | null
          purchase_invoice_url: string | null
          purchase_seller: string | null
          qr_code: string | null
          serial_number: string | null
          total_service_cost: number
          total_services_performed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          device_category: string
          device_nickname: string
          health_score?: number
          id?: string
          installation_date?: string | null
          installation_location?: string
          model: string
          owner_name?: string | null
          purchase_date?: string | null
          purchase_invoice_url?: string | null
          purchase_seller?: string | null
          qr_code?: string | null
          serial_number?: string | null
          total_service_cost?: number
          total_services_performed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          device_category?: string
          device_nickname?: string
          health_score?: number
          id?: string
          installation_date?: string | null
          installation_location?: string
          model?: string
          owner_name?: string | null
          purchase_date?: string | null
          purchase_invoice_url?: string | null
          purchase_seller?: string | null
          qr_code?: string | null
          serial_number?: string | null
          total_service_cost?: number
          total_services_performed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_service_ledger: {
        Row: {
          created_at: string
          device_passport_id: string
          diagnosis_result: string | null
          id: string
          job_id: string | null
          partner_id: string | null
          partner_name: string | null
          parts_replaced: Json
          recommendations: string | null
          service_cost: number
          service_date: string
          service_photos: Json
          service_type: string
          technician_id: string | null
          technician_name: string | null
          work_completed: string
        }
        Insert: {
          created_at?: string
          device_passport_id: string
          diagnosis_result?: string | null
          id?: string
          job_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          parts_replaced?: Json
          recommendations?: string | null
          service_cost?: number
          service_date?: string
          service_photos?: Json
          service_type: string
          technician_id?: string | null
          technician_name?: string | null
          work_completed: string
        }
        Update: {
          created_at?: string
          device_passport_id?: string
          diagnosis_result?: string | null
          id?: string
          job_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          parts_replaced?: Json
          recommendations?: string | null
          service_cost?: number
          service_date?: string
          service_photos?: Json
          service_type?: string
          technician_id?: string | null
          technician_name?: string | null
          work_completed?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_service_ledger_device_passport_id_fkey"
            columns: ["device_passport_id"]
            isOneToOne: false
            referencedRelation: "device_passports"
            referencedColumns: ["id"]
          },
        ]
      }
      device_warranties: {
        Row: {
          created_at: string
          description: string | null
          device_passport_id: string
          id: string
          status: string
          warranty_end_date: string
          warranty_provider: string
          warranty_start_date: string
          warranty_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          device_passport_id: string
          id?: string
          status?: string
          warranty_end_date: string
          warranty_provider: string
          warranty_start_date: string
          warranty_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          device_passport_id?: string
          id?: string
          status?: string
          warranty_end_date?: string
          warranty_provider?: string
          warranty_start_date?: string
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_warranties_device_passport_id_fkey"
            columns: ["device_passport_id"]
            isOneToOne: false
            referencedRelation: "device_passports"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_escalations: {
        Row: {
          booking_id: string
          created_at: string
          dispatch_rounds_attempted: number | null
          id: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          dispatch_rounds_attempted?: number | null
          id?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          dispatch_rounds_attempted?: number | null
          id?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_escalations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      loyalty_points: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_id: string
          id: string
          points: number
          reason: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          points?: number
          reason?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          points?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      match_logs: {
        Row: {
          auto_assigned: boolean | null
          booking_id: string | null
          category_code: string
          created_at: string
          customer_zone: string | null
          id: string
          is_emergency: boolean | null
          match_duration_ms: number | null
          no_match_found: boolean | null
          ranked_technicians: Json | null
          selected_technician_id: string | null
          service_type: string | null
          top_match_reason: string | null
          top_match_score: number | null
          total_candidates: number | null
        }
        Insert: {
          auto_assigned?: boolean | null
          booking_id?: string | null
          category_code: string
          created_at?: string
          customer_zone?: string | null
          id?: string
          is_emergency?: boolean | null
          match_duration_ms?: number | null
          no_match_found?: boolean | null
          ranked_technicians?: Json | null
          selected_technician_id?: string | null
          service_type?: string | null
          top_match_reason?: string | null
          top_match_score?: number | null
          total_candidates?: number | null
        }
        Update: {
          auto_assigned?: boolean | null
          booking_id?: string | null
          category_code?: string
          created_at?: string
          customer_zone?: string | null
          id?: string
          is_emergency?: boolean | null
          match_duration_ms?: number | null
          no_match_found?: boolean | null
          ranked_technicians?: Json | null
          selected_technician_id?: string | null
          service_type?: string | null
          top_match_reason?: string | null
          top_match_score?: number | null
          total_candidates?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_logs_selected_technician_id_fkey"
            columns: ["selected_technician_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          partner_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          message: string
          read_status: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message: string
          read_status?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read_status?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch: string | null
          created_at: string
          id: string
          partner_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          created_at?: string
          id?: string
          partner_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_bank_accounts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
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
          rejection_reason: string | null
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
          rejection_reason?: string | null
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
          rejection_reason?: string | null
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
      partner_notifications: {
        Row: {
          action_taken: string | null
          actioned_at: string | null
          body: string | null
          booking_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          notification_type: string
          partner_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          action_taken?: string | null
          actioned_at?: string | null
          body?: string | null
          booking_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          partner_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          action_taken?: string | null
          actioned_at?: string | null
          body?: string | null
          booking_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          partner_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_schedules: {
        Row: {
          created_at: string
          emergency_available: boolean
          end_time: string
          id: string
          partner_id: string
          start_time: string
          updated_at: string
          working_days: string[]
        }
        Insert: {
          created_at?: string
          emergency_available?: boolean
          end_time?: string
          id?: string
          partner_id: string
          start_time?: string
          updated_at?: string
          working_days?: string[]
        }
        Update: {
          created_at?: string
          emergency_available?: boolean
          end_time?: string
          id?: string
          partner_id?: string
          start_time?: string
          updated_at?: string
          working_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "partner_schedules_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
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
            isOneToOne: true
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
      partner_warnings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          issued_by: string | null
          partner_id: string
          resolved_at: string | null
          severity: string
          warning_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          issued_by?: string | null
          partner_id: string
          resolved_at?: string | null
          severity?: string
          warning_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          issued_by?: string | null
          partner_id?: string
          resolved_at?: string | null
          severity?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_warnings_partner_id_fkey"
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
          email: string | null
          emergency_available: boolean | null
          experience_years: number | null
          express_capable: boolean | null
          full_name: string
          id: string
          inspection_capable: boolean | null
          last_location_ping_at: string | null
          late_arrival_count: number | null
          max_concurrent_jobs: number | null
          max_jobs_per_day: number | null
          nic_number: string | null
          on_time_rate: number | null
          performance_score: number | null
          phone_number: string
          previous_company: string | null
          profile_photo_url: string | null
          provider_type: string | null
          quote_approval_rate: number | null
          rating_average: number | null
          reliability_tier: string
          service_types_supported: string[] | null
          service_zones: string[] | null
          specializations: string[] | null
          strike_count: number | null
          tools_declared: string[] | null
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
          email?: string | null
          emergency_available?: boolean | null
          experience_years?: number | null
          express_capable?: boolean | null
          full_name: string
          id?: string
          inspection_capable?: boolean | null
          last_location_ping_at?: string | null
          late_arrival_count?: number | null
          max_concurrent_jobs?: number | null
          max_jobs_per_day?: number | null
          nic_number?: string | null
          on_time_rate?: number | null
          performance_score?: number | null
          phone_number: string
          previous_company?: string | null
          profile_photo_url?: string | null
          provider_type?: string | null
          quote_approval_rate?: number | null
          rating_average?: number | null
          reliability_tier?: string
          service_types_supported?: string[] | null
          service_zones?: string[] | null
          specializations?: string[] | null
          strike_count?: number | null
          tools_declared?: string[] | null
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
          email?: string | null
          emergency_available?: boolean | null
          experience_years?: number | null
          express_capable?: boolean | null
          full_name?: string
          id?: string
          inspection_capable?: boolean | null
          last_location_ping_at?: string | null
          late_arrival_count?: number | null
          max_concurrent_jobs?: number | null
          max_jobs_per_day?: number | null
          nic_number?: string | null
          on_time_rate?: number | null
          performance_score?: number | null
          phone_number?: string
          previous_company?: string | null
          profile_photo_url?: string | null
          provider_type?: string | null
          quote_approval_rate?: number | null
          rating_average?: number | null
          reliability_tier?: string
          service_types_supported?: string[] | null
          service_zones?: string[] | null
          specializations?: string[] | null
          strike_count?: number | null
          tools_declared?: string[] | null
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
          quote_id: string | null
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
          quote_id?: string | null
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
          quote_id?: string | null
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
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
      policy_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          partner_id: string
          policy_type: string
          policy_version: string
          source_screen: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          partner_id: string
          policy_type: string
          policy_version?: string
          source_screen?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          partner_id?: string
          policy_type?: string
          policy_version?: string
          source_screen?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_acceptances_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
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
          additional_cost_lkr: number | null
          additional_items: Json | null
          approved_at: string | null
          booking_id: string
          created_at: string
          customer_note: string | null
          discount_lkr: number | null
          estimated_completion: string | null
          expires_at: string | null
          id: string
          labour_lkr: number | null
          notes: string | null
          part_grade: string | null
          partner_id: string
          parts: Json | null
          parts_cost_lkr: number | null
          rejected_at: string | null
          service_charge_lkr: number | null
          status: Database["public"]["Enums"]["quote_status"]
          submitted_at: string | null
          technician_note: string | null
          total_lkr: number | null
          updated_at: string
          warranty_days: number | null
          warranty_terms: string | null
        }
        Insert: {
          additional_cost_lkr?: number | null
          additional_items?: Json | null
          approved_at?: string | null
          booking_id: string
          created_at?: string
          customer_note?: string | null
          discount_lkr?: number | null
          estimated_completion?: string | null
          expires_at?: string | null
          id?: string
          labour_lkr?: number | null
          notes?: string | null
          part_grade?: string | null
          partner_id: string
          parts?: Json | null
          parts_cost_lkr?: number | null
          rejected_at?: string | null
          service_charge_lkr?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          submitted_at?: string | null
          technician_note?: string | null
          total_lkr?: number | null
          updated_at?: string
          warranty_days?: number | null
          warranty_terms?: string | null
        }
        Update: {
          additional_cost_lkr?: number | null
          additional_items?: Json | null
          approved_at?: string | null
          booking_id?: string
          created_at?: string
          customer_note?: string | null
          discount_lkr?: number | null
          estimated_completion?: string | null
          expires_at?: string | null
          id?: string
          labour_lkr?: number | null
          notes?: string | null
          part_grade?: string | null
          partner_id?: string
          parts?: Json | null
          parts_cost_lkr?: number | null
          rejected_at?: string | null
          service_charge_lkr?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          submitted_at?: string | null
          technician_note?: string | null
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
      ratings: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          partner_id: string
          rating: number
          review_text: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          partner_id: string
          rating: number
          review_text?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          partner_id?: string
          rating?: number
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      service_relationships: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          last_booking_at: string | null
          last_booking_id: string | null
          partner_id: string
          total_bookings: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          last_booking_at?: string | null
          last_booking_id?: string | null
          partner_id: string
          total_bookings?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          last_booking_at?: string | null
          last_booking_id?: string | null
          partner_id?: string
          total_bookings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_relationships_last_booking_id_fkey"
            columns: ["last_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_relationships_partner_id_fkey"
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
      support_cases: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          created_at: string
          description: string
          id: string
          issue_type: string
          priority: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      system_incidents: {
        Row: {
          booking_id: string | null
          created_at: string
          error_message: string | null
          id: string
          incident_type: string
          metadata: Json | null
          partner_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          incident_type?: string
          metadata?: Json | null
          partner_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          incident_type?: string
          metadata?: Json | null
          partner_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_incidents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_incidents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          platform_source: string | null
          policy_group: string
          role: string
          session_info: Json | null
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          platform_source?: string | null
          policy_group: string
          role?: string
          session_info?: Json | null
          terms_version?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          platform_source?: string | null
          policy_group?: string
          role?: string
          session_info?: Json | null
          terms_version?: string
          user_id?: string
        }
        Relationships: []
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
      check_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _max_requests: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
        | "quote_rejected"
        | "quote_revised"
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
        "quote_rejected",
        "quote_revised",
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
