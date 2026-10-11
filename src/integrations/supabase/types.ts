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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_summaries: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          model: string
          month: string
          stats: Json
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          model: string
          month: string
          stats?: Json
          summary: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          model?: string
          month?: string
          stats?: Json
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_events: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          delivery_status: string
          error: string
          id: string
          missed_days: number
          patient_id: string
          streak_start: string
          token: string
        }
        Insert: {
          channel?: string
          contact_id: string
          created_at?: string
          delivery_status: string
          error?: string
          id?: string
          missed_days: number
          patient_id: string
          streak_start: string
          token?: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          delivery_status?: string
          error?: string
          id?: string
          missed_days?: number
          patient_id?: string
          streak_start?: string
          token?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocked_name: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocked_name?: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocked_name?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          created_at: string
          day: string
          id: string
          motivation: number
          pain: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          motivation: number
          pain: number
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          motivation?: number
          pain?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      completions: {
        Row: {
          created_at: string
          day: string
          exercise_id: string
          id: string
          occurrence: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          exercise_id: string
          id?: string
          occurrence?: number
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          day?: string
          exercise_id?: string
          id?: string
          occurrence?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          from_name: string
          from_user: string
          id: string
          kind: string
          message: string
          read_at: string | null
          status: string
          to_name: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_name?: string
          from_user: string
          id?: string
          kind: string
          message?: string
          read_at?: string | null
          status?: string
          to_name?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_name?: string
          from_user?: string
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          status?: string
          to_name?: string
          to_user?: string
        }
        Relationships: []
      }
      encouragements: {
        Row: {
          created_at: string
          from_name: string
          from_user: string
          id: string
          message: string
          read_at: string | null
          to_user: string
        }
        Insert: {
          created_at?: string
          from_name?: string
          from_user: string
          id?: string
          message: string
          read_at?: string | null
          to_user: string
        }
        Update: {
          created_at?: string
          from_name?: string
          from_user?: string
          id?: string
          message?: string
          read_at?: string | null
          to_user?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          cooldown_minutes: number
          created_at: string
          days: number[]
          frequency: string
          gap_days: number
          id: string
          name: string
          notes: string
          occurrences: number
          reps: string
          user_id: string
          weekly_mode: string
        }
        Insert: {
          cooldown_minutes?: number
          created_at?: string
          days?: number[]
          frequency?: string
          gap_days?: number
          id?: string
          name: string
          notes?: string
          occurrences?: number
          reps?: string
          user_id?: string
          weekly_mode?: string
        }
        Update: {
          cooldown_minutes?: number
          created_at?: string
          days?: number[]
          frequency?: string
          gap_days?: number
          id?: string
          name?: string
          notes?: string
          occurrences?: number
          reps?: string
          user_id?: string
          weekly_mode?: string
        }
        Relationships: []
      }
      inbox_typing: {
        Row: {
          expires_at: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          expires_at?: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          expires_at?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          relationship: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          relationship: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          relationship?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      network_profiles: {
        Row: {
          availability: string[]
          created_at: string
          discoverable: boolean
          display_name: string
          finished_at: string | null
          finished_therapy: boolean
          is_mentor: boolean
          languages: string[]
          mentor_bio: string
          photo_path: string | null
          rehab_area: string
          rehab_areas: string[]
          share_exercise_counts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string[]
          created_at?: string
          discoverable?: boolean
          display_name?: string
          finished_at?: string | null
          finished_therapy?: boolean
          is_mentor?: boolean
          languages?: string[]
          mentor_bio?: string
          photo_path?: string | null
          rehab_area?: string
          rehab_areas?: string[]
          share_exercise_counts?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          availability?: string[]
          created_at?: string
          discoverable?: boolean
          display_name?: string
          finished_at?: string | null
          finished_therapy?: boolean
          is_mentor?: boolean
          languages?: string[]
          mentor_bio?: string
          photo_path?: string | null
          rehab_area?: string
          rehab_areas?: string[]
          share_exercise_counts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preferences: {
        Row: {
          partner_email: string
          reminder_time: string
          reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          partner_email?: string
          reminder_time?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          partner_email?: string
          reminder_time?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rehab_sessions: {
        Row: {
          created_at: string
          guest_id: string
          guest_name: string
          id: string
          meeting_url: string
          mode: string
          note: string
          organizer_id: string
          organizer_name: string
          place: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          guest_name?: string
          id?: string
          meeting_url?: string
          mode: string
          note?: string
          organizer_id: string
          organizer_name?: string
          place?: string
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          guest_name?: string
          id?: string
          meeting_url?: string
          mode?: string
          note?: string
          organizer_id?: string
          organizer_name?: string
          place?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      shared_sessions: {
        Row: {
          alert_id: string
          contact_id: string
          contact_name: string
          created_at: string
          id: string
          note: string
          patient_id: string
          proposed_for: string
          status: string
        }
        Insert: {
          alert_id: string
          contact_id: string
          contact_name?: string
          created_at?: string
          id?: string
          note?: string
          patient_id: string
          proposed_for: string
          status?: string
        }
        Update: {
          alert_id?: string
          contact_id?: string
          contact_name?: string
          created_at?: string
          id?: string
          note?: string
          patient_id?: string
          proposed_for?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_sessions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alert_events"
            referencedColumns: ["id"]
          },
        ]
      }
      support_contacts: {
        Row: {
          connected_user_id: string | null
          created_at: string
          id: string
          kind: string
          name: string
          notify_on_missed: boolean
          phone: string
          user_id: string
          welcomed_at: string | null
        }
        Insert: {
          connected_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
          notify_on_missed?: boolean
          phone?: string
          user_id?: string
          welcomed_at?: string | null
        }
        Update: {
          connected_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          notify_on_missed?: boolean
          phone?: string
          user_id?: string
          welcomed_at?: string | null
        }
        Relationships: []
      }
      support_notifications: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          missed_days: number
          patient_id: string
          patient_name: string
          read_at: string | null
          recipient_id: string
          support_token: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          missed_days: number
          patient_id: string
          patient_name: string
          read_at?: string | null
          recipient_id: string
          support_token: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          missed_days?: number
          patient_id?: string
          patient_name?: string
          read_at?: string | null
          recipient_id?: string
          support_token?: string
        }
        Relationships: []
      }
      support_profiles: {
        Row: {
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      block_person: { Args: { p_other: string }; Returns: undefined }
      buddy_relationship_stats: {
        Args: { p_timezone?: string }
        Returns: {
          cheer_xp: number
          message_days: string[]
          messages_sent: number
          shared_today: number
          shared_total: number
          shared_week: number
          user_id: string
        }[]
      }
      can_read_inbox_typing: {
        Args: { p_recipient: string; p_sender: string }
        Returns: boolean
      }
      can_read_profile_photo: { Args: { p_path: string }; Returns: boolean }
      can_view_profile_photo: { Args: { p_user_id: string }; Returns: boolean }
      cancel_connection_request: { Args: { p_id: string }; Returns: undefined }
      cancel_rehab_session: { Args: { p_id: string }; Returns: undefined }
      create_invite_code: { Args: { p_relationship: string }; Returns: string }
      disconnect_person: { Args: { p_other: string }; Returns: undefined }
      inbox_channels: {
        Args: never
        Returns: {
          can_message: boolean
          kind: string
          name: string
          user_id: string
        }[]
      }
      network_are_connected: {
        Args: { a: string; b: string }
        Returns: boolean
      }
      network_directory: {
        Args: never
        Returns: {
          availability: string[]
          discoverable: boolean
          display_name: string
          is_mentor: boolean
          languages: string[]
          mentor_bio: string
          rehab_area: string
          rehab_areas: string[]
          user_id: string
        }[]
      }
      network_display_name: { Args: { u: string }; Returns: string }
      network_is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      people_i_support: {
        Args: never
        Returns: {
          kind: string
          name: string
          user_id: string
        }[]
      }
      propose_rehab_session: {
        Args: {
          p_mode: string
          p_note?: string
          p_place?: string
          p_starts_at: string
          p_with: string
        }
        Returns: string
      }
      redeem_invite_code: { Args: { p_code: string }; Returns: string }
      reschedule_rehab_session: {
        Args: { p_id: string; p_note?: string; p_starts_at: string }
        Returns: undefined
      }
      respond_connection_request: {
        Args: { p_accept: boolean; p_id: string }
        Returns: undefined
      }
      respond_rehab_session: {
        Args: { p_accept: boolean; p_id: string }
        Returns: undefined
      }
      send_connection_request: {
        Args: { p_kind: string; p_message?: string; p_to: string }
        Returns: string
      }
      send_encouragement: {
        Args: { p_message: string; p_to: string }
        Returns: undefined
      }
      set_inbox_typing: {
        Args: { p_to: string; p_typing: boolean }
        Returns: undefined
      }
      simulate_missed_sessions: { Args: never; Returns: number }
      supported_person_phone: { Args: { p_user: string }; Returns: string }
      visible_profile_photo: { Args: { p_user_id: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
