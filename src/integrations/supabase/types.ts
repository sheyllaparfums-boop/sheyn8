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
      activity_logs: {
        Row: {
          auth_user_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          status: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      api_credential_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          key: string
          latency_ms: number | null
          message: string | null
          metadata: Json
          status: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          key: string
          latency_ms?: number | null
          message?: string | null
          metadata?: Json
          status: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          key?: string
          latency_ms?: number | null
          message?: string | null
          metadata?: Json
          status?: string
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          auto_health_check: boolean
          created_at: string
          environment: string
          expires_at: string | null
          key: string
          last_validated_at: string | null
          message: string | null
          monthly_cost_usd: number
          notify_on_failure: boolean
          quota_limit: number | null
          quota_used: number
          status: string
          updated_at: string
          value: string | null
          webhook_url: string | null
        }
        Insert: {
          auto_health_check?: boolean
          created_at?: string
          environment?: string
          expires_at?: string | null
          key: string
          last_validated_at?: string | null
          message?: string | null
          monthly_cost_usd?: number
          notify_on_failure?: boolean
          quota_limit?: number | null
          quota_used?: number
          status?: string
          updated_at?: string
          value?: string | null
          webhook_url?: string | null
        }
        Update: {
          auto_health_check?: boolean
          created_at?: string
          environment?: string
          expires_at?: string | null
          key?: string
          last_validated_at?: string | null
          message?: string | null
          monthly_cost_usd?: number
          notify_on_failure?: boolean
          quota_limit?: number | null
          quota_used?: number
          status?: string
          updated_at?: string
          value?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      broadcast_reads: {
        Row: {
          broadcast_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      carousels: {
        Row: {
          audience: string | null
          caption: string | null
          created_at: string
          cta: string | null
          format: string
          hashtags: string[]
          hook: string | null
          id: string
          is_favorite: boolean
          niche: string
          project_id: string | null
          slide_count: number
          slides: Json
          theme: string
          tone: string
          topic: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          audience?: string | null
          caption?: string | null
          created_at?: string
          cta?: string | null
          format?: string
          hashtags?: string[]
          hook?: string | null
          id?: string
          is_favorite?: boolean
          niche?: string
          project_id?: string | null
          slide_count?: number
          slides?: Json
          theme?: string
          tone?: string
          topic: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Update: {
          audience?: string | null
          caption?: string | null
          created_at?: string
          cta?: string | null
          format?: string
          hashtags?: string[]
          hook?: string | null
          id?: string
          is_favorite?: boolean
          niche?: string
          project_id?: string | null
          slide_count?: number
          slides?: Json
          theme?: string
          tone?: string
          topic?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carousels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analyses: {
        Row: {
          ai_insights: Json | null
          base_handle: string | null
          competitor_handle: string
          created_at: string
          engagement_rate: number | null
          followers: number | null
          id: string
          project_id: string | null
          snapshot: Json
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          ai_insights?: Json | null
          base_handle?: string | null
          competitor_handle: string
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          project_id?: string | null
          snapshot?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Update: {
          ai_insights?: Json | null
          base_handle?: string | null
          competitor_handle?: string
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          project_id?: string | null
          snapshot?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          attachments: Json
          checklist: Json
          color: string | null
          content_type: string
          created_at: string
          hook: string | null
          id: string
          notes: string | null
          platform: string
          project_id: string | null
          recurrence: string | null
          recurrence_until: string | null
          reminder_minutes: number | null
          scheduled_at: string
          source: string | null
          status: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          attachments?: Json
          checklist?: Json
          color?: string | null
          content_type?: string
          created_at?: string
          hook?: string | null
          id?: string
          notes?: string | null
          platform?: string
          project_id?: string | null
          recurrence?: string | null
          recurrence_until?: string | null
          reminder_minutes?: number | null
          scheduled_at: string
          source?: string | null
          status?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Update: {
          attachments?: Json
          checklist?: Json
          color?: string | null
          content_type?: string
          created_at?: string
          hook?: string | null
          id?: string
          notes?: string | null
          platform?: string
          project_id?: string | null
          recurrence?: string | null
          recurrence_until?: string | null
          reminder_minutes?: number | null
          scheduled_at?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pages: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          slug: string
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentorship_playlists: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          video_ids: string[]
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
          video_ids?: string[]
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          video_ids?: string[]
        }
        Relationships: []
      }
      mentorship_user_state: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          is_watched: boolean
          last_watched_at: string | null
          notes: string | null
          progress_seconds: number
          tags: string[]
          updated_at: string
          user_id: string
          video_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_watched?: boolean
          last_watched_at?: string | null
          notes?: string | null
          progress_seconds?: number
          tags?: string[]
          updated_at?: string
          user_id?: string
          video_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_watched?: boolean
          last_watched_at?: string | null
          notes?: string | null
          progress_seconds?: number
          tags?: string[]
          updated_at?: string
          user_id?: string
          video_id?: string
          view_count?: number
        }
        Relationships: []
      }
      mentorship_videos: {
        Row: {
          category: string
          channel_title: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean
          published_at: string | null
          search_query: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_id: string
        }
        Insert: {
          category?: string
          channel_title?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          published_at?: string | null
          search_query?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_id: string
        }
        Update: {
          category?: string
          channel_title?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          published_at?: string | null
          search_query?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      profile_analyses: {
        Row: {
          ai_insights: Json | null
          avg_comments: number
          avg_likes: number
          created_at: string
          engagement_rate: number
          followers: number
          following: number
          handle: string
          id: string
          is_public: boolean
          niche: string | null
          posts_count: number
          project_id: string | null
          public_slug: string | null
          schedule_cron: string | null
          schedule_enabled: boolean
          snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          avg_comments?: number
          avg_likes?: number
          created_at?: string
          engagement_rate?: number
          followers?: number
          following?: number
          handle: string
          id?: string
          is_public?: boolean
          niche?: string | null
          posts_count?: number
          project_id?: string | null
          public_slug?: string | null
          schedule_cron?: string | null
          schedule_enabled?: boolean
          snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_insights?: Json | null
          avg_comments?: number
          avg_likes?: number
          created_at?: string
          engagement_rate?: number
          followers?: number
          following?: number
          handle?: string
          id?: string
          is_public?: boolean
          niche?: string | null
          posts_count?: number
          project_id?: string | null
          public_slug?: string | null
          schedule_cron?: string | null
          schedule_enabled?: boolean
          snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          goal: string | null
          handle: string | null
          id: string
          name: string | null
          niche: string | null
          onboarding_completed: boolean
          plan: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          validated_profile: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          goal?: string | null
          handle?: string | null
          id?: string
          name?: string | null
          niche?: string | null
          onboarding_completed?: boolean
          plan?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          validated_profile?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          goal?: string | null
          handle?: string | null
          id?: string
          name?: string | null
          niche?: string | null
          onboarding_completed?: boolean
          plan?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          validated_profile?: Json | null
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          color: string
          created_at: string
          default_tags: string[]
          description: string
          duration_days: number | null
          icon: string
          id: string
          is_active: boolean
          name: string
          suggested_content: Json
        }
        Insert: {
          color?: string
          created_at?: string
          default_tags?: string[]
          description: string
          duration_days?: number | null
          icon?: string
          id: string
          is_active?: boolean
          name: string
          suggested_content?: Json
        }
        Update: {
          color?: string
          created_at?: string
          default_tags?: string[]
          description?: string
          duration_days?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          suggested_content?: Json
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          cover_url: string | null
          created_at: string
          deadline_at: string | null
          description: string | null
          emoji: string | null
          icon: string
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_pinned: boolean
          is_public: boolean
          name: string
          progress: number
          public_slug: string | null
          starts_at: string | null
          status: string
          tags: string[]
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          cover_url?: string | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          emoji?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_pinned?: boolean
          is_public?: boolean
          name: string
          progress?: number
          public_slug?: string | null
          starts_at?: string | null
          status?: string
          tags?: string[]
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          cover_url?: string | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          emoji?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_pinned?: boolean
          is_public?: boolean
          name?: string
          progress?: number
          public_slug?: string | null
          starts_at?: string | null
          status?: string
          tags?: string[]
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reel_transcriptions: {
        Row: {
          ai_repurpose: Json | null
          audio_events: Json | null
          author_handle: string | null
          caption: string | null
          created_at: string
          duration_seconds: number | null
          error: string | null
          id: string
          language: string | null
          project_id: string | null
          reel_url: string
          shortcode: string | null
          status: string
          thumbnail_url: string | null
          transcript: string | null
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
          video_url: string | null
          words: Json | null
        }
        Insert: {
          ai_repurpose?: Json | null
          audio_events?: Json | null
          author_handle?: string | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          id?: string
          language?: string | null
          project_id?: string | null
          reel_url: string
          shortcode?: string | null
          status?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          video_url?: string | null
          words?: Json | null
        }
        Update: {
          ai_repurpose?: Json | null
          audio_events?: Json | null
          author_handle?: string | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          id?: string
          language?: string | null
          project_id?: string | null
          reel_url?: string
          shortcode?: string | null
          status?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          video_url?: string | null
          words?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_transcriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          last_run_at: string | null
          last_run_status: string | null
          name: string
          schedule_cron: string | null
          schedule_enabled: boolean
          snapshot: Json
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          schedule_cron?: string | null
          schedule_enabled?: boolean
          snapshot?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          schedule_cron?: string | null
          schedule_enabled?: boolean
          snapshot?: Json
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viral_hooks: {
        Row: {
          created_at: string
          format: string
          hook: string
          id: string
          is_favorite: boolean
          language: string
          niche: string
          notes: string | null
          performance: string
          project_id: string | null
          source: string | null
          tags: string[]
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
          uses: number
        }
        Insert: {
          created_at?: string
          format?: string
          hook: string
          id?: string
          is_favorite?: boolean
          language?: string
          niche?: string
          notes?: string | null
          performance?: string
          project_id?: string | null
          source?: string | null
          tags?: string[]
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          uses?: number
        }
        Update: {
          created_at?: string
          format?: string
          hook?: string
          id?: string
          is_favorite?: boolean
          language?: string
          niche?: string
          notes?: string | null
          performance?: string
          project_id?: string | null
          source?: string | null
          tags?: string[]
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "viral_hooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          duration_ms: number | null
          error: string | null
          estimated_cost_usd: number
          estimated_tokens: number
          finished_at: string | null
          id: string
          node_logs: Json
          started_at: string
          status: string
          trigger_source: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          estimated_cost_usd?: number
          estimated_tokens?: number
          finished_at?: string | null
          id?: string
          node_logs?: Json
          started_at?: string
          status?: string
          trigger_source?: string
          user_id?: string
          workflow_id: string
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          estimated_cost_usd?: number
          estimated_tokens?: number
          finished_at?: string | null
          id?: string
          node_logs?: Json
          started_at?: string
          status?: string
          trigger_source?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "user_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          estimated_cost_usd: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          snapshot: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          estimated_cost_usd?: number
          icon?: string | null
          id: string
          is_active?: boolean
          name: string
          snapshot?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          estimated_cost_usd?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          snapshot?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_project_stats: { Args: { _project_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      slugify: { Args: { _input: string }; Returns: string }
    }
    Enums: {
      app_role: "CEO" | "USER"
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
      app_role: ["CEO", "USER"],
    },
  },
} as const
