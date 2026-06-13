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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      carousel_slides: {
        Row: {
          button_link: string | null
          button_text: string | null
          carousel_type: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          scheduled_at: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          carousel_type: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          scheduled_at?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          carousel_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          scheduled_at?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_leads: {
        Row: {
          application_id: string
          created_at: string
          id: string
          intent: string | null
          landing_page: string | null
          lead_source: string | null
          mobile_number: string
          notes: string | null
          notified_at: string | null
          paid_at: string | null
          payout_reference: string | null
          platform: string
          referral_code: string | null
          reward_status: string
          segment_priority: boolean | null
          status: string
          ugc_screenshot_url: string | null
          ugc_submitted_at: string | null
          ugc_verified: boolean | null
          updated_at: string
          upi_id: string
          utm_campaign: string | null
          utm_source: string | null
          whatsapp_number: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          intent?: string | null
          landing_page?: string | null
          lead_source?: string | null
          mobile_number: string
          notes?: string | null
          notified_at?: string | null
          paid_at?: string | null
          payout_reference?: string | null
          platform: string
          referral_code?: string | null
          reward_status?: string
          segment_priority?: boolean | null
          status?: string
          ugc_screenshot_url?: string | null
          ugc_submitted_at?: string | null
          ugc_verified?: boolean | null
          updated_at?: string
          upi_id: string
          utm_campaign?: string | null
          utm_source?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          intent?: string | null
          landing_page?: string | null
          lead_source?: string | null
          mobile_number?: string
          notes?: string | null
          notified_at?: string | null
          paid_at?: string | null
          payout_reference?: string | null
          platform?: string
          referral_code?: string | null
          reward_status?: string
          segment_priority?: boolean | null
          status?: string
          ugc_screenshot_url?: string | null
          ugc_submitted_at?: string | null
          ugc_verified?: boolean | null
          updated_at?: string
          upi_id?: string
          utm_campaign?: string | null
          utm_source?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string | null
          created_at: string
          email: string
          follower_count: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          source: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          follower_count?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          source?: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          follower_count?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          source?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          action_token: string | null
          admin_notes: string | null
          amount: number
          coins: number
          created_at: string
          delivered_at: string | null
          expected_amount_paise: number | null
          expired_at: string | null
          expires_at: string | null
          id: string
          name: string
          package: string
          paid_at: string | null
          payer_upi: string | null
          payment_method: string
          poppo_id: string
          refund_notes: string | null
          refund_status: string | null
          refunded_at: string | null
          status: string
          updated_at: string
          utr: string | null
          utr_submitted_at: string | null
          whatsapp: string
        }
        Insert: {
          action_token?: string | null
          admin_notes?: string | null
          amount: number
          coins: number
          created_at?: string
          delivered_at?: string | null
          expected_amount_paise?: number | null
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          name: string
          package: string
          paid_at?: string | null
          payer_upi?: string | null
          payment_method?: string
          poppo_id: string
          refund_notes?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          utr?: string | null
          utr_submitted_at?: string | null
          whatsapp: string
        }
        Update: {
          action_token?: string | null
          admin_notes?: string | null
          amount?: number
          coins?: number
          created_at?: string
          delivered_at?: string | null
          expected_amount_paise?: number | null
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          package?: string
          paid_at?: string | null
          payer_upi?: string | null
          payment_method?: string
          poppo_id?: string
          refund_notes?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          utr?: string | null
          utr_submitted_at?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      unmatched_payments: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          payer_upi: string | null
          raw_payload: string | null
          reason: string
          utr: string | null
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          payer_upi?: string | null
          raw_payload?: string | null
          reason: string
          utr?: string | null
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          payer_upi?: string | null
          raw_payload?: string | null
          reason?: string
          utr?: string | null
        }
        Relationships: []
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
    Enums: {},
  },
} as const
