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
          cancellation_reason: string | null
          cancelled_at: string | null
          category_code: string
          completed_at: string | null
          completion_otp: string | null
          created_at: string
          customer_address: Json | null
          customer_id: string | null
          customer_latitude: number | null
          customer_longitude: number | null
          customer_rating: number | null
          customer_review: string | null
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
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          photos: Json | null
          pricing_archetype: Database["public"]["Enums"]["pricing_archetype"]
          scheduled_at: string | null
          service_mode: Database["public"]["Enums"]["service_mode"] | null
          service_type: string | null
          start_otp: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          travel_fee_lkr: number | null
          updated_at: string
          zone_code: string | null
        }
        Insert: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_code: string
          completed_at?: string | null
          completion_otp?: string | null
          created_at?: string
          customer_address?: Json | null
          customer_id?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_rating?: number | null
          customer_review?: string | null
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
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          photos?: Json | null
          pricing_archetype?: Database["public"]["Enums"]["pricing_archetype"]
          scheduled_at?: string | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          service_type?: string | null
          start_otp?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          travel_fee_lkr?: number | null
          updated_at?: string
          zone_code?: string | null
        }
        Update: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_code?: string
          completed_at?: string | null
          completion_otp?: string | null
          created_at?: string
          customer_address?: Json | null
          customer_id?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_rating?: number | null
          customer_review?: string | null
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
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          photos?: Json | null
          pricing_archetype?: Database["public"]["Enums"]["pricing_archetype"]
          scheduled_at?: string | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          service_type?: string | null
          start_otp?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          travel_fee_lkr?: number | null
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
      dispatch_log: {
        Row: {
          booking_id: string
          created_at: string
          distance_km: number | null
          eta_minutes: number | null
          id: string
          partner_id: string
          responded_at: string | null
          response: string | null
          score: number | null
          status: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          distance_km?: number | null
          eta_minutes?: number | null
          id?: string
          partner_id: string
          responded_at?: string | null
          response?: string | null
          score?: number | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          distance_km?: number | null
          eta_minutes?: number | null
          id?: string
          partner_id?: string
          responded_at?: string | null
          response?: string | null
          score?: number | null
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
      partners: {
        Row: {
          active_job_id: string | null
          availability_status: Database["public"]["Enums"]["partner_availability"]
          average_response_time_minutes: number | null
          base_latitude: number | null
          base_longitude: number | null
          brand_specializations: string[] | null
          business_name: string | null
          categories_supported: string[]
          completed_jobs_count: number | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          emergency_available: boolean | null
          experience_years: number | null
          full_name: string
          id: string
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
          active_job_id?: string | null
          availability_status?: Database["public"]["Enums"]["partner_availability"]
          average_response_time_minutes?: number | null
          base_latitude?: number | null
          base_longitude?: number | null
          brand_specializations?: string[] | null
          business_name?: string | null
          categories_supported?: string[]
          completed_jobs_count?: number | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          emergency_available?: boolean | null
          experience_years?: number | null
          full_name: string
          id?: string
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
          active_job_id?: string | null
          availability_status?: Database["public"]["Enums"]["partner_availability"]
          average_response_time_minutes?: number | null
          base_latitude?: number | null
          base_longitude?: number | null
          brand_specializations?: string[] | null
          business_name?: string | null
          categories_supported?: string[]
          completed_jobs_count?: number | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          emergency_available?: boolean | null
          experience_years?: number | null
          full_name?: string
          id?: string
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
