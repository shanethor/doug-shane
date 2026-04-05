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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acord_extraction_runs: {
        Row: {
          created_at: string
          file_id: string | null
          final_output: Json | null
          form_type: string
          form_version: string | null
          id: string
          model_output: Json | null
          page_count: number | null
          raw_ocr_text: string | null
          submission_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          final_output?: Json | null
          form_type: string
          form_version?: string | null
          id?: string
          model_output?: Json | null
          page_count?: number | null
          raw_ocr_text?: string | null
          submission_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          final_output?: Json | null
          form_type?: string
          form_version?: string | null
          id?: string
          model_output?: Json | null
          page_count?: number | null
          raw_ocr_text?: string | null
          submission_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acord_extraction_runs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      acord_field_corrections: {
        Row: {
          corrected_at: string
          corrected_by_user_id: string
          corrected_value: string
          extraction_run_id: string
          field_label: string | null
          field_path: string
          form_type: string
          id: string
          original_value: string | null
        }
        Insert: {
          corrected_at?: string
          corrected_by_user_id: string
          corrected_value: string
          extraction_run_id: string
          field_label?: string | null
          field_path: string
          form_type: string
          id?: string
          original_value?: string | null
        }
        Update: {
          corrected_at?: string
          corrected_by_user_id?: string
          corrected_value?: string
          extraction_run_id?: string
          field_label?: string | null
          field_path?: string
          form_type?: string
          id?: string
          original_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acord_field_corrections_extraction_run_id_fkey"
            columns: ["extraction_run_id"]
            isOneToOne: false
            referencedRelation: "acord_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          code: string
          created_at: string
          full_site_access: boolean
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          code: string
          created_at?: string
          full_site_access?: boolean
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          full_site_access?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      agency_network_overlaps: {
        Row: {
          contact_email: string
          contact_name: string | null
          created_at: string
          id: string
          last_computed_at: string
          overlap_count: number
          producer_user_ids: string[]
        }
        Insert: {
          contact_email: string
          contact_name?: string | null
          created_at?: string
          id?: string
          last_computed_at?: string
          overlap_count?: number
          producer_user_ids?: string[]
        }
        Update: {
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          last_computed_at?: string
          overlap_count?: number
          producer_user_ids?: string[]
        }
        Relationships: []
      }
      ai_error_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string
          function_name: string
          id: string
          metadata: Json | null
          operation: string | null
          resolved: boolean | null
          session_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message: string
          function_name: string
          id?: string
          metadata?: Json | null
          operation?: string | null
          resolved?: boolean | null
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string
          function_name?: string
          id?: string
          metadata?: Json | null
          operation?: string | null
          resolved?: boolean | null
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          object_id: string
          object_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          object_id: string
          object_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          object_id?: string
          object_type?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_messages: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: []
      }
      beta_todos: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          is_done: boolean
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booked_meetings: {
        Row: {
          booking_link_id: string
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          end_time: string
          external_event_id: string | null
          id: string
          notes: string | null
          start_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_link_id: string
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          end_time: string
          external_event_id?: string | null
          id?: string
          notes?: string | null
          start_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_link_id?: string
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          end_time?: string
          external_event_id?: string | null
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booked_meetings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_links: {
        Row: {
          availability_template: Json
          buffer_after: number
          buffer_before: number
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          min_notice_minutes: number
          public_slug: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_template?: Json
          buffer_after?: number
          buffer_before?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          min_notice_minutes?: number
          public_slug: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_template?: Json
          buffer_after?: number
          buffer_before?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          min_notice_minutes?: number
          public_slug?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      branding_packages: {
        Row: {
          brand_colors: Json
          brand_name: string
          created_at: string
          disclaimer: string | null
          id: string
          industry: string | null
          is_default: boolean
          logo_url: string | null
          metadata: Json | null
          name: string
          tagline: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_colors?: Json
          brand_name?: string
          created_at?: string
          disclaimer?: string | null
          id?: string
          industry?: string | null
          is_default?: boolean
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          tagline?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_colors?: Json
          brand_name?: string
          created_at?: string
          disclaimer?: string | null
          id?: string
          industry?: string | null
          is_default?: boolean
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          tagline?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_submissions: {
        Row: {
          company_name: string | null
          coverage_lines: string[] | null
          created_at: string
          description: string | null
          file_urls: Json | null
          id: string
          lead_id: string | null
          narrative: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          coverage_lines?: string[] | null
          created_at?: string
          description?: string | null
          file_urls?: Json | null
          id?: string
          lead_id?: string | null
          narrative?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          coverage_lines?: string[] | null
          created_at?: string
          description?: string | null
          file_urls?: Json | null
          id?: string
          lead_id?: string | null
          narrative?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          attendees: string[] | null
          created_at: string
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          external_event_id: string | null
          id: string
          lead_id: string | null
          location: string | null
          metadata: Json | null
          provider: string | null
          start_time: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          external_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          metadata?: Json | null
          provider?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          external_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          metadata?: Json | null
          provider?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_persons: {
        Row: {
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          is_business_owner: boolean | null
          linkedin_url: string | null
          location: string | null
          metadata: Json | null
          owner_user_id: string
          primary_email: string | null
          primary_phone: string | null
          tier: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_business_owner?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          owner_user_id: string
          primary_email?: string | null
          primary_phone?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_business_owner?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          owner_user_id?: string
          primary_email?: string | null
          primary_phone?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      carriers: {
        Row: {
          created_at: string
          id: string
          loss_run_email: string | null
          loss_run_fax: string | null
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          loss_run_email?: string | null
          loss_run_fax?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          loss_run_email?: string | null
          loss_run_fax?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          created_at: string
          doc_type: string | null
          document_type: string
          extraction_confidence: number | null
          extraction_metadata: Json | null
          extraction_status: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          lead_id: string | null
          submission_id: string | null
          total_pages: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string | null
          document_type?: string
          extraction_confidence?: number | null
          extraction_metadata?: Json | null
          extraction_status?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          lead_id?: string | null
          submission_id?: string | null
          total_pages?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string | null
          document_type?: string
          extraction_confidence?: number | null
          extraction_metadata?: Json | null
          extraction_status?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          lead_id?: string | null
          submission_id?: string | null
          total_pages?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_assignments: {
        Row: {
          client_service_user_id: string
          created_at: string
          id: string
          producer_user_id: string
          scope: string
        }
        Insert: {
          client_service_user_id: string
          created_at?: string
          id?: string
          producer_user_id: string
          scope?: string
        }
        Update: {
          client_service_user_id?: string
          created_at?: string
          id?: string
          producer_user_id?: string
          scope?: string
        }
        Relationships: []
      }
      client_service_clients: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_clients_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "client_service_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          company_name: string
          created_at: string
          extracted_profile: Json | null
          icp_description: string | null
          id: string
          industry: string | null
          revenue_range: string | null
          target_buyer_titles: string[] | null
          target_geos: string[] | null
          typical_deal_size: string | null
          updated_at: string
          user_id: string
          vertical_tags: string[] | null
          website_urls: string[] | null
        }
        Insert: {
          company_name?: string
          created_at?: string
          extracted_profile?: Json | null
          icp_description?: string | null
          id?: string
          industry?: string | null
          revenue_range?: string | null
          target_buyer_titles?: string[] | null
          target_geos?: string[] | null
          typical_deal_size?: string | null
          updated_at?: string
          user_id: string
          vertical_tags?: string[] | null
          website_urls?: string[] | null
        }
        Update: {
          company_name?: string
          created_at?: string
          extracted_profile?: Json | null
          icp_description?: string | null
          id?: string
          industry?: string | null
          revenue_range?: string | null
          target_buyer_titles?: string[] | null
          target_geos?: string[] | null
          typical_deal_size?: string | null
          updated_at?: string
          user_id?: string
          vertical_tags?: string[] | null
          website_urls?: string[] | null
        }
        Relationships: []
      }
      concierge_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          request_id: string
          uploaded_by_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          request_id: string
          uploaded_by_role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          request_id?: string
          uploaded_by_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "concierge_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_requests: {
        Row: {
          category: string
          completed_at: string | null
          contact_phone: string | null
          contact_preference: string
          created_at: string
          description: string
          id: string
          internal_notes: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          contact_phone?: string | null
          contact_preference?: string
          created_at?: string
          description?: string
          id?: string
          internal_notes?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          contact_phone?: string | null
          contact_preference?: string
          created_at?: string
          description?: string
          id?: string
          internal_notes?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concierge_subscriptions: {
        Row: {
          created_at: string
          id: string
          max_active_requests: number
          subscription_status: string
          trial_end_at: string | null
          trial_start_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_active_requests?: number
          subscription_status?: string
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_active_requests?: number
          subscription_status?: string
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connect_community_posts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          likes_count: number
          post_type: string
          replies_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_type?: string
          replies_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_type?: string
          replies_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connect_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "connect_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_proposals: {
        Row: {
          client_company: string | null
          client_name: string
          created_at: string
          generated_html: string | null
          id: string
          key_points: Json | null
          opportunity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_company?: string | null
          client_name: string
          created_at?: string
          generated_html?: string | null
          id?: string
          key_points?: Json | null
          opportunity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_company?: string | null
          client_name?: string
          created_at?: string
          generated_html?: string | null
          id?: string
          key_points?: Json | null
          opportunity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connect_referrals: {
        Row: {
          created_at: string
          id: string
          outcome: string | null
          recipient_company: string | null
          recipient_name: string
          referred_contact_company: string | null
          referred_contact_name: string
          sender_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome?: string | null
          recipient_company?: string | null
          recipient_name: string
          referred_contact_company?: string | null
          referred_contact_name: string
          sender_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string | null
          recipient_company?: string | null
          recipient_name?: string
          referred_contact_company?: string | null
          referred_contact_name?: string
          sender_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_versions: {
        Row: {
          body_text: string
          consent_type: string
          created_at: string
          effective_date: string
          id: string
          title: string
          version: string
        }
        Insert: {
          body_text: string
          consent_type: string
          created_at?: string
          effective_date?: string
          id?: string
          title: string
          version: string
        }
        Update: {
          body_text?: string
          consent_type?: string
          created_at?: string
          effective_date?: string
          id?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      contact_merge_queue: {
        Row: {
          confidence: number | null
          contact_a_id: string
          contact_b_id: string
          created_at: string
          id: string
          match_reason: string | null
          owner_user_id: string
          resolved_at: string | null
          resolved_canonical_id: string | null
          status: string | null
        }
        Insert: {
          confidence?: number | null
          contact_a_id: string
          contact_b_id: string
          created_at?: string
          id?: string
          match_reason?: string | null
          owner_user_id: string
          resolved_at?: string | null
          resolved_canonical_id?: string | null
          status?: string | null
        }
        Update: {
          confidence?: number | null
          contact_a_id?: string
          contact_b_id?: string
          created_at?: string
          id?: string
          match_reason?: string | null
          owner_user_id?: string
          resolved_at?: string | null
          resolved_canonical_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_merge_queue_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_merge_queue_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_merge_queue_resolved_canonical_id_fkey"
            columns: ["resolved_canonical_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_relationships: {
        Row: {
          confidence: number | null
          contact_a_id: string | null
          contact_b_id: string | null
          created_at: string | null
          id: string
          owner_user_id: string
          source: string
          thread_id: string | null
        }
        Insert: {
          confidence?: number | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string | null
          id?: string
          owner_user_id: string
          source?: string
          thread_id?: string | null
        }
        Update: {
          confidence?: number | null
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string | null
          id?: string
          owner_user_id?: string
          source?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_relationships_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "email_discovered_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_relationships_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "email_discovered_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_sharing_settings: {
        Row: {
          canonical_person_id: string
          created_at: string
          id: string
          owner_user_id: string
          shared_with_user_id: string | null
          sharing_level: Database["public"]["Enums"]["sharing_level"] | null
        }
        Insert: {
          canonical_person_id: string
          created_at?: string
          id?: string
          owner_user_id: string
          shared_with_user_id?: string | null
          sharing_level?: Database["public"]["Enums"]["sharing_level"] | null
        }
        Update: {
          canonical_person_id?: string
          created_at?: string
          id?: string
          owner_user_id?: string
          shared_with_user_id?: string | null
          sharing_level?: Database["public"]["Enums"]["sharing_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_sharing_settings_canonical_person_id_fkey"
            columns: ["canonical_person_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_social_profiles: {
        Row: {
          canonical_person_id: string | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          platform: string
          profile_url: string | null
          username: string | null
          verified: boolean | null
        }
        Insert: {
          canonical_person_id?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          platform: string
          profile_url?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          canonical_person_id?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          profile_url?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_social_profiles_canonical_person_id_fkey"
            columns: ["canonical_person_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_templates: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          form_id: string
          full_name: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_id: string
          full_name: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_id?: string
          full_name?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_links: {
        Row: {
          agent_id: string
          created_at: string
          customer_email: string | null
          expires_at: string
          id: string
          is_used: boolean
          quote_id: string
          token: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          customer_email?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean
          quote_id: string
          token?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          customer_email?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean
          quote_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_submissions: {
        Row: {
          created_at: string
          data: Json
          id: string
          link_id: string
          quote_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          link_id: string
          quote_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          link_id?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_submissions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "customer_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      data_visibility_settings: {
        Row: {
          created_at: string
          data_type: string
          id: string
          is_enabled: boolean | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_type: string
          id?: string
          is_enabled?: boolean | null
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          id?: string
          is_enabled?: boolean | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_creations: {
        Row: {
          created_at: string
          design_json: Json
          height: number
          id: string
          template_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          design_json?: Json
          height?: number
          id?: string
          template_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          created_at?: string
          design_json?: Json
          height?: number
          id?: string
          template_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_creations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "design_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      design_templates: {
        Row: {
          base_height: number
          base_width: number
          category: string
          created_at: string
          description: string | null
          design_json: Json
          id: string
          is_default: boolean
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          base_height?: number
          base_width?: number
          category?: string
          created_at?: string
          description?: string | null
          design_json?: Json
          id?: string
          is_default?: boolean
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          base_height?: number
          base_width?: number
          category?: string
          created_at?: string
          description?: string | null
          design_json?: Json
          id?: string
          is_default?: boolean
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          email_id: string
          external_attachment_id: string | null
          file_name: string
          file_size: number | null
          id: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          email_id: string
          external_attachment_id?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          email_id?: string
          external_attachment_id?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "synced_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_connections: {
        Row: {
          access_token: string
          created_at: string
          email_address: string
          id: string
          is_active: boolean
          provider: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email_address: string
          id?: string
          is_active?: boolean
          provider: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email_address?: string
          id?: string
          is_active?: boolean
          provider?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_discovered_contacts: {
        Row: {
          apollo_data: Json | null
          classification_confidence: number | null
          classification_type: string | null
          contact_score: number | null
          contact_type: string | null
          created_at: string | null
          display_name: string | null
          domain: string | null
          email_address: string
          email_frequency: number | null
          employment_history: Json | null
          enrichment_data: Json | null
          enrichment_source: string | null
          enrichment_status: string
          filtered: boolean | null
          first_name: string | null
          first_seen_at: string | null
          hunter_company: string | null
          hunter_confidence: number | null
          hunter_linkedin_url: string | null
          hunter_phone: string | null
          hunter_position: string | null
          hunter_twitter_url: string | null
          hunter_verified: boolean | null
          id: string
          is_filtered: boolean | null
          last_enriched_at: string | null
          last_name: string | null
          last_seen_at: string | null
          linked_canonical_id: string | null
          location: string | null
          matches_ideal_profile: boolean | null
          profile_photo_url: string | null
          prospect_score: number | null
          seen_in_threads_with: Json | null
          status: string
          twitter_url: string | null
          user_id: string
        }
        Insert: {
          apollo_data?: Json | null
          classification_confidence?: number | null
          classification_type?: string | null
          contact_score?: number | null
          contact_type?: string | null
          created_at?: string | null
          display_name?: string | null
          domain?: string | null
          email_address: string
          email_frequency?: number | null
          employment_history?: Json | null
          enrichment_data?: Json | null
          enrichment_source?: string | null
          enrichment_status?: string
          filtered?: boolean | null
          first_name?: string | null
          first_seen_at?: string | null
          hunter_company?: string | null
          hunter_confidence?: number | null
          hunter_linkedin_url?: string | null
          hunter_phone?: string | null
          hunter_position?: string | null
          hunter_twitter_url?: string | null
          hunter_verified?: boolean | null
          id?: string
          is_filtered?: boolean | null
          last_enriched_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          linked_canonical_id?: string | null
          location?: string | null
          matches_ideal_profile?: boolean | null
          profile_photo_url?: string | null
          prospect_score?: number | null
          seen_in_threads_with?: Json | null
          status?: string
          twitter_url?: string | null
          user_id: string
        }
        Update: {
          apollo_data?: Json | null
          classification_confidence?: number | null
          classification_type?: string | null
          contact_score?: number | null
          contact_type?: string | null
          created_at?: string | null
          display_name?: string | null
          domain?: string | null
          email_address?: string
          email_frequency?: number | null
          employment_history?: Json | null
          enrichment_data?: Json | null
          enrichment_source?: string | null
          enrichment_status?: string
          filtered?: boolean | null
          first_name?: string | null
          first_seen_at?: string | null
          hunter_company?: string | null
          hunter_confidence?: number | null
          hunter_linkedin_url?: string | null
          hunter_phone?: string | null
          hunter_position?: string | null
          hunter_twitter_url?: string | null
          hunter_verified?: boolean | null
          id?: string
          is_filtered?: boolean | null
          last_enriched_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          linked_canonical_id?: string | null
          location?: string | null
          matches_ideal_profile?: boolean | null
          profile_photo_url?: string | null
          prospect_score?: number | null
          seen_in_threads_with?: Json | null
          status?: string
          twitter_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_discovered_contacts_linked_canonical_id_fkey"
            columns: ["linked_canonical_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          body_html: string
          connection_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          to_addresses: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string
          connection_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_addresses?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          connection_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_addresses?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "email_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signature_contacts: {
        Row: {
          confidence: number | null
          created_at: string
          extracted_address: string | null
          extracted_company: string | null
          extracted_email: string | null
          extracted_linkedin: string | null
          extracted_name: string | null
          extracted_phone: string | null
          extracted_title: string | null
          extracted_website: string | null
          id: string
          linked_canonical_id: string | null
          source_email_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          extracted_address?: string | null
          extracted_company?: string | null
          extracted_email?: string | null
          extracted_linkedin?: string | null
          extracted_name?: string | null
          extracted_phone?: string | null
          extracted_title?: string | null
          extracted_website?: string | null
          id?: string
          linked_canonical_id?: string | null
          source_email_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          extracted_address?: string | null
          extracted_company?: string | null
          extracted_email?: string | null
          extracted_linkedin?: string | null
          extracted_name?: string | null
          extracted_phone?: string | null
          extracted_title?: string | null
          extracted_website?: string | null
          id?: string
          linked_canonical_id?: string | null
          source_email_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_signature_contacts_linked_canonical_id_fkey"
            columns: ["linked_canonical_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_activity: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          engine_lead_id: string | null
          id: string
          metadata: Json | null
          source: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          engine_lead_id?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          engine_lead_id?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_activity_engine_lead_id_fkey"
            columns: ["engine_lead_id"]
            isOneToOne: false
            referencedRelation: "engine_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_leads: {
        Row: {
          action: string | null
          assigned_to: string | null
          batch_id: string | null
          company: string
          contact_name: string | null
          created_at: string
          detected_at: string
          email: string | null
          est_premium: number | null
          flood_insurance_needed: boolean | null
          flood_zone: string | null
          id: string
          industry: string | null
          lead_id: string | null
          owner_user_id: string
          phone: string | null
          score: number
          signal: string | null
          source: string
          source_url: string | null
          state: string | null
          status: string
          tier: number
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          assigned_to?: string | null
          batch_id?: string | null
          company: string
          contact_name?: string | null
          created_at?: string
          detected_at?: string
          email?: string | null
          est_premium?: number | null
          flood_insurance_needed?: boolean | null
          flood_zone?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          owner_user_id: string
          phone?: string | null
          score?: number
          signal?: string | null
          source?: string
          source_url?: string | null
          state?: string | null
          status?: string
          tier?: number
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          assigned_to?: string | null
          batch_id?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string
          detected_at?: string
          email?: string | null
          est_premium?: number | null
          flood_insurance_needed?: boolean | null
          flood_zone?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          owner_user_id?: string
          phone?: string | null
          score?: number
          signal?: string | null
          source?: string
          source_url?: string | null
          state?: string | null
          status?: string
          tier?: number
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_api_logs: {
        Row: {
          created_at: string | null
          credits_consumed: number | null
          email_discovered_contact_id: string | null
          endpoint: string | null
          error_message: string | null
          feeder_list_id: string | null
          id: string
          provider: string
          response_status: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_consumed?: number | null
          email_discovered_contact_id?: string | null
          endpoint?: string | null
          error_message?: string | null
          feeder_list_id?: string | null
          id?: string
          provider: string
          response_status?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_consumed?: number | null
          email_discovered_contact_id?: string | null
          endpoint?: string | null
          error_message?: string | null
          feeder_list_id?: string | null
          id?: string
          provider?: string
          response_status?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_api_logs_email_discovered_contact_id_fkey"
            columns: ["email_discovered_contact_id"]
            isOneToOne: false
            referencedRelation: "email_discovered_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_api_logs_feeder_list_id_fkey"
            columns: ["feeder_list_id"]
            isOneToOne: false
            referencedRelation: "feeder_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendars: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          email_address: string | null
          id: string
          is_active: boolean
          provider: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          email_address?: string | null
          id?: string
          is_active?: boolean
          provider: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          email_address?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      extraction_corrections: {
        Row: {
          ai_value: string | null
          corrected_value: string
          created_at: string
          field_key: string
          field_label: string | null
          form_id: string
          id: string
          status: string
          submission_id: string | null
          user_id: string
        }
        Insert: {
          ai_value?: string | null
          corrected_value: string
          created_at?: string
          field_key: string
          field_label?: string | null
          form_id: string
          id?: string
          status?: string
          submission_id?: string | null
          user_id: string
        }
        Update: {
          ai_value?: string | null
          corrected_value?: string
          created_at?: string
          field_key?: string
          field_label?: string | null
          form_id?: string
          id?: string
          status?: string
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_corrections_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_suggestions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          status: string
          suggestion: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          status?: string
          suggestion: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          status?: string
          suggestion?: string
          user_id?: string
        }
        Relationships: []
      }
      feeder_list_prospects: {
        Row: {
          avatar_url: string | null
          client_converted_at: string | null
          company: string | null
          connection_type: string | null
          converted_to_client: boolean | null
          converted_to_meeting: boolean | null
          created_at: string | null
          email: string | null
          enrichment_data: Json | null
          facebook_url: string | null
          feeder_list_id: string
          first_name: string | null
          id: string
          instagram_url: string | null
          intro_email_sent: boolean | null
          intro_email_sent_at: string | null
          is_mutual_with_producer: boolean | null
          last_name: string | null
          life_event_signals: Json | null
          linkedin_url: string | null
          location: string | null
          meeting_date: string | null
          name: string
          occupation: string | null
          phone: string | null
          prospect_score: number | null
          relationship_to_client: string | null
          status: string
          suggested_talking_point: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_converted_at?: string | null
          company?: string | null
          connection_type?: string | null
          converted_to_client?: boolean | null
          converted_to_meeting?: boolean | null
          created_at?: string | null
          email?: string | null
          enrichment_data?: Json | null
          facebook_url?: string | null
          feeder_list_id: string
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          intro_email_sent?: boolean | null
          intro_email_sent_at?: string | null
          is_mutual_with_producer?: boolean | null
          last_name?: string | null
          life_event_signals?: Json | null
          linkedin_url?: string | null
          location?: string | null
          meeting_date?: string | null
          name: string
          occupation?: string | null
          phone?: string | null
          prospect_score?: number | null
          relationship_to_client?: string | null
          status?: string
          suggested_talking_point?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_converted_at?: string | null
          company?: string | null
          connection_type?: string | null
          converted_to_client?: boolean | null
          converted_to_meeting?: boolean | null
          created_at?: string | null
          email?: string | null
          enrichment_data?: Json | null
          facebook_url?: string | null
          feeder_list_id?: string
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          intro_email_sent?: boolean | null
          intro_email_sent_at?: string | null
          is_mutual_with_producer?: boolean | null
          last_name?: string | null
          life_event_signals?: Json | null
          linkedin_url?: string | null
          location?: string | null
          meeting_date?: string | null
          name?: string
          occupation?: string | null
          phone?: string | null
          prospect_score?: number | null
          relationship_to_client?: string | null
          status?: string
          suggested_talking_point?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeder_list_prospects_feeder_list_id_fkey"
            columns: ["feeder_list_id"]
            isOneToOne: false
            referencedRelation: "feeder_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      feeder_lists: {
        Row: {
          auto_triggered: boolean | null
          calendar_event_id: string | null
          client_canonical_id: string | null
          client_name: string | null
          emailed_at: string | null
          emailed_to_producer: boolean | null
          generated_at: string | null
          id: string
          meeting_date: string | null
          producer_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          auto_triggered?: boolean | null
          calendar_event_id?: string | null
          client_canonical_id?: string | null
          client_name?: string | null
          emailed_at?: string | null
          emailed_to_producer?: boolean | null
          generated_at?: string | null
          id?: string
          meeting_date?: string | null
          producer_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          auto_triggered?: boolean | null
          calendar_event_id?: string | null
          client_canonical_id?: string | null
          client_name?: string | null
          emailed_at?: string | null
          emailed_to_producer?: boolean | null
          generated_at?: string | null
          id?: string
          meeting_date?: string | null
          producer_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeder_lists_client_canonical_id_fkey"
            columns: ["client_canonical_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      field_overrides: {
        Row: {
          ai_value: string | null
          created_at: string
          field_key: string
          form_id: string
          id: string
          override_value: string
          submission_id: string | null
          user_id: string
        }
        Insert: {
          ai_value?: string | null
          created_at?: string
          field_key: string
          form_id: string
          id?: string
          override_value: string
          submission_id?: string | null
          user_id: string
        }
        Update: {
          ai_value?: string | null
          created_at?: string
          field_key?: string
          form_id?: string
          id?: string
          override_value?: string
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_overrides_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_forms: {
        Row: {
          created_at: string
          display_name: string
          form_data: Json
          form_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          form_data?: Json
          form_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          form_data?: Json
          form_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_leads: {
        Row: {
          company_name: string
          contacts: Json | null
          created_at: string
          data_quality_score: number | null
          firmographics: Json | null
          fit_score: number | null
          id: string
          intent_score: number | null
          location: string | null
          raw_source_links: string[] | null
          source: string
          status: string
          updated_at: string
          user_id: string
          vertical_tags: string[] | null
          website: string | null
        }
        Insert: {
          company_name: string
          contacts?: Json | null
          created_at?: string
          data_quality_score?: number | null
          firmographics?: Json | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          location?: string | null
          raw_source_links?: string[] | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
          vertical_tags?: string[] | null
          website?: string | null
        }
        Update: {
          company_name?: string
          contacts?: Json | null
          created_at?: string
          data_quality_score?: number | null
          firmographics?: Json | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          location?: string | null
          raw_source_links?: string[] | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          vertical_tags?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      icloud_connections: {
        Row: {
          app_password_encrypted: string
          apple_id_email: string
          auto_sync: boolean
          contact_count: number | null
          created_at: string
          id: string
          last_sync_at: string | null
          status: string
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_password_encrypted: string
          apple_id_email: string
          auto_sync?: boolean
          contact_count?: number | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          status?: string
          sync_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_password_encrypted?: string
          apple_id_email?: string
          auto_sync?: boolean
          contact_count?: number | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          status?: string
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      industry_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          requested_industry: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          requested_industry: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          requested_industry?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insurance_applications: {
        Row: {
          created_at: string
          form_data: Json
          gaps: Json | null
          id: string
          status: string
          submission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_data?: Json
          gaps?: Json | null
          id?: string
          status?: string
          submission_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_data?: Json
          gaps?: Json | null
          id?: string
          status?: string
          submission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_applications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_links: {
        Row: {
          agent_id: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          expires_at: string
          id: string
          is_used: boolean
          lead_id: string | null
          line_type: string | null
          partner_slug: string | null
          prefill_data: Json | null
          submission_id: string | null
          token: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean
          lead_id?: string | null
          line_type?: string | null
          partner_slug?: string | null
          prefill_data?: Json | null
          submission_id?: string | null
          token?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean
          lead_id?: string | null
          line_type?: string | null
          partner_slug?: string | null
          prefill_data?: Json | null
          submission_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_submissions: {
        Row: {
          additional_notes: string | null
          business_name: string
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          intake_link_id: string
          requested_coverage: string | null
          requested_premium: string | null
        }
        Insert: {
          additional_notes?: string | null
          business_name: string
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          intake_link_id: string
          requested_coverage?: string | null
          requested_premium?: string | null
        }
        Update: {
          additional_notes?: string | null
          business_name?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          intake_link_id?: string
          requested_coverage?: string | null
          requested_premium?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_submissions_intake_link_id_fkey"
            columns: ["intake_link_id"]
            isOneToOne: false
            referencedRelation: "intake_links"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_email_drafts: {
        Row: {
          body_html: string
          created_at: string
          id: string
          prospect_id: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          prospect_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          prospect_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intro_email_drafts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "feeder_list_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_claims: {
        Row: {
          claimer_user_id: string
          created_at: string
          id: string
          lead_post_id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claimer_user_id: string
          created_at?: string
          id?: string
          lead_post_id: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claimer_user_id?: string
          created_at?: string
          id?: string
          lead_post_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_claims_lead_post_id_fkey"
            columns: ["lead_post_id"]
            isOneToOne: false
            referencedRelation: "lead_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_data_sources: {
        Row: {
          active: boolean | null
          api_type: string | null
          api_url: string
          auth_env_key: string | null
          created_at: string | null
          id: string
          notes: string | null
          requires_auth: boolean | null
          source_name: string
          state: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          api_type?: string | null
          api_url: string
          auth_env_key?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          requires_auth?: boolean | null
          source_name: string
          state: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          api_type?: string | null
          api_url?: string
          auth_env_key?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          requires_auth?: boolean | null
          source_name?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          note_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          note_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          note_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_posts: {
        Row: {
          created_at: string
          description: string
          elo_max: number | null
          elo_min: number | null
          estimated_value: number | null
          id: string
          lead_type: string
          owner_user_id: string
          preferred_industries: string[] | null
          preferred_states: string[] | null
          referral_offer_type: string | null
          referral_offer_value: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          elo_max?: number | null
          elo_min?: number | null
          estimated_value?: number | null
          id?: string
          lead_type?: string
          owner_user_id: string
          preferred_industries?: string[] | null
          preferred_states?: string[] | null
          referral_offer_type?: string | null
          referral_offer_value?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          elo_max?: number | null
          elo_min?: number | null
          estimated_value?: number | null
          id?: string
          lead_type?: string
          owner_user_id?: string
          preferred_industries?: string[] | null
          preferred_states?: string[] | null
          referral_offer_type?: string | null
          referral_offer_value?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lead_claim_id: string
          rated_user_id: string
          rater_user_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_claim_id: string
          rated_user_id: string
          rater_user_id: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_claim_id?: string
          rated_user_id?: string
          rater_user_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_ratings_lead_claim_id_fkey"
            columns: ["lead_claim_id"]
            isOneToOne: false
            referencedRelation: "lead_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          settings: Json | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          settings?: Json | null
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          settings?: Json | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          account_name: string
          business_type: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          estimated_renewal_date: string | null
          id: string
          lead_source: string | null
          line_type: string
          loss_reason: string | null
          owner_user_id: string
          phone: string | null
          presenting_details: Json | null
          stage: Database["public"]["Enums"]["lead_stage"]
          stage_changed_at: string | null
          state: string | null
          submission_id: string | null
          target_premium: number | null
          updated_at: string
          win_probability: number | null
          won_details: Json | null
        }
        Insert: {
          account_name: string
          business_type?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          estimated_renewal_date?: string | null
          id?: string
          lead_source?: string | null
          line_type?: string
          loss_reason?: string | null
          owner_user_id: string
          phone?: string | null
          presenting_details?: Json | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          stage_changed_at?: string | null
          state?: string | null
          submission_id?: string | null
          target_premium?: number | null
          updated_at?: string
          win_probability?: number | null
          won_details?: Json | null
        }
        Update: {
          account_name?: string
          business_type?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          estimated_renewal_date?: string | null
          id?: string
          lead_source?: string | null
          line_type?: string
          loss_reason?: string | null
          owner_user_id?: string
          phone?: string | null
          presenting_details?: Json | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          stage_changed_at?: string | null
          state?: string | null
          submission_id?: string | null
          target_premium?: number | null
          updated_at?: string
          win_probability?: number | null
          won_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_run_attachments: {
        Row: {
          attachment_type: string
          file_name: string
          file_url: string
          id: string
          loss_run_request_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          attachment_type?: string
          file_name: string
          file_url: string
          id?: string
          loss_run_request_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string
          file_name?: string
          file_url?: string
          id?: string
          loss_run_request_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "loss_run_attachments_loss_run_request_id_fkey"
            columns: ["loss_run_request_id"]
            isOneToOne: false
            referencedRelation: "loss_run_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_run_policy_items: {
        Row: {
          carrier_id: string | null
          carrier_name: string
          created_at: string
          effective_end: string
          effective_start: string
          fax_number: string | null
          id: string
          insured_name: string
          line_of_business: string | null
          loss_run_request_id: string
          policy_number: string
          policy_type: string | null
          request_email: string | null
          status: string | null
        }
        Insert: {
          carrier_id?: string | null
          carrier_name: string
          created_at?: string
          effective_end: string
          effective_start: string
          fax_number?: string | null
          id?: string
          insured_name: string
          line_of_business?: string | null
          loss_run_request_id: string
          policy_number: string
          policy_type?: string | null
          request_email?: string | null
          status?: string | null
        }
        Update: {
          carrier_id?: string | null
          carrier_name?: string
          created_at?: string
          effective_end?: string
          effective_start?: string
          fax_number?: string | null
          id?: string
          insured_name?: string
          line_of_business?: string | null
          loss_run_request_id?: string
          policy_number?: string
          policy_type?: string | null
          request_email?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_run_policy_items_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_run_policy_items_loss_run_request_id_fkey"
            columns: ["loss_run_request_id"]
            isOneToOne: false
            referencedRelation: "loss_run_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_run_requests: {
        Row: {
          aor_needed: boolean | null
          completed_at: string | null
          created_at: string
          days_before_renewal: number | null
          delivery_email: string | null
          fulfilled_at: string | null
          id: string
          insured_address: string | null
          insured_city: string | null
          insured_phone: string | null
          insured_state: string | null
          insured_zip: string | null
          lead_id: string
          named_insured: string | null
          notes: string | null
          producer_email: string | null
          producer_fax: string | null
          renewal_scheduled: boolean | null
          request_type: string
          requested_at: string | null
          requested_by: string
          returned_loss_run_url: string | null
          sent_at: string | null
          signature_token: string | null
          signed_at: string | null
          signed_pdf_url: string | null
          signer_email: string | null
          signer_name: string | null
          signer_title: string | null
          status: Database["public"]["Enums"]["loss_run_status"]
          submission_id: string | null
          updated_at: string
          user_id: string | null
          years_requested: number | null
        }
        Insert: {
          aor_needed?: boolean | null
          completed_at?: string | null
          created_at?: string
          days_before_renewal?: number | null
          delivery_email?: string | null
          fulfilled_at?: string | null
          id?: string
          insured_address?: string | null
          insured_city?: string | null
          insured_phone?: string | null
          insured_state?: string | null
          insured_zip?: string | null
          lead_id: string
          named_insured?: string | null
          notes?: string | null
          producer_email?: string | null
          producer_fax?: string | null
          renewal_scheduled?: boolean | null
          request_type?: string
          requested_at?: string | null
          requested_by: string
          returned_loss_run_url?: string | null
          sent_at?: string | null
          signature_token?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: Database["public"]["Enums"]["loss_run_status"]
          submission_id?: string | null
          updated_at?: string
          user_id?: string | null
          years_requested?: number | null
        }
        Update: {
          aor_needed?: boolean | null
          completed_at?: string | null
          created_at?: string
          days_before_renewal?: number | null
          delivery_email?: string | null
          fulfilled_at?: string | null
          id?: string
          insured_address?: string | null
          insured_city?: string | null
          insured_phone?: string | null
          insured_state?: string | null
          insured_zip?: string | null
          lead_id?: string
          named_insured?: string | null
          notes?: string | null
          producer_email?: string | null
          producer_fax?: string | null
          renewal_scheduled?: boolean | null
          request_type?: string
          requested_at?: string | null
          requested_by?: string
          returned_loss_run_url?: string | null
          sent_at?: string | null
          signature_token?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: Database["public"]["Enums"]["loss_run_status"]
          submission_id?: string | null
          updated_at?: string
          user_id?: string | null
          years_requested?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_run_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_run_requests_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "business_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_producer_assignments: {
        Row: {
          created_at: string
          id: string
          manager_user_id: string
          producer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_user_id: string
          producer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_user_id?: string
          producer_user_id?: string
        }
        Relationships: []
      }
      marketing_flyers: {
        Row: {
          brand_colors: Json
          brand_name: string
          bullets: Json
          calendar_event_id: string | null
          created_at: string
          cta: string
          date_time: string | null
          disclaimer: string | null
          evergreen: boolean
          id: string
          location: string | null
          logo_url: string | null
          raw_prompt: string
          result_image_url: string | null
          result_metadata: Json | null
          status: string
          structured_prompt: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_colors?: Json
          brand_name?: string
          bullets?: Json
          calendar_event_id?: string | null
          created_at?: string
          cta?: string
          date_time?: string | null
          disclaimer?: string | null
          evergreen?: boolean
          id?: string
          location?: string | null
          logo_url?: string | null
          raw_prompt?: string
          result_image_url?: string | null
          result_metadata?: Json | null
          status?: string
          structured_prompt?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_colors?: Json
          brand_name?: string
          bullets?: Json
          calendar_event_id?: string | null
          created_at?: string
          cta?: string
          date_time?: string | null
          disclaimer?: string | null
          evergreen?: boolean
          id?: string
          location?: string | null
          logo_url?: string | null
          raw_prompt?: string
          result_image_url?: string | null
          result_metadata?: Json | null
          status?: string
          structured_prompt?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flyers_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          leads_seeking: string
          referral_types: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          leads_seeking?: string
          referral_types?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          leads_seeking?: string
          referral_types?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_connections: {
        Row: {
          contact_count: number | null
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_count?: number | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          source: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_count?: number | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_contacts: {
        Row: {
          canonical_person_id: string | null
          classification_confidence: number | null
          classification_type: string | null
          company: string | null
          email: string | null
          external_id: string | null
          full_name: string | null
          id: string
          imported_at: string
          is_filtered: boolean | null
          linkedin_url: string | null
          location: string | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          source: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canonical_person_id?: string | null
          classification_confidence?: number | null
          classification_type?: string | null
          company?: string | null
          email?: string | null
          external_id?: string | null
          full_name?: string | null
          id?: string
          imported_at?: string
          is_filtered?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          source: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canonical_person_id?: string | null
          classification_confidence?: number | null
          classification_type?: string | null
          company?: string | null
          email?: string | null
          external_id?: string | null
          full_name?: string | null
          id?: string
          imported_at?: string
          is_filtered?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          source?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_contacts_canonical_person_id_fkey"
            columns: ["canonical_person_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_feedback: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          outreach_type: string | null
          target_company: string | null
          target_name: string | null
          touch_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          outreach_type?: string | null
          target_company?: string | null
          target_name?: string | null
          touch_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          outreach_type?: string | null
          target_company?: string | null
          target_name?: string | null
          touch_id?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      partner_tracker_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          partner_slug: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          partner_slug: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          partner_slug?: string
          token?: string
        }
        Relationships: []
      }
      personal_intake_submissions: {
        Row: {
          agent_id: string
          cc_producer: boolean
          client_email: string | null
          created_at: string
          delivery_emails: string[]
          expires_at: string
          form_data: Json
          id: string
          is_used: boolean
          status: string
          submitted_at: string | null
          token: string
        }
        Insert: {
          agent_id: string
          cc_producer?: boolean
          client_email?: string | null
          created_at?: string
          delivery_emails?: string[]
          expires_at?: string
          form_data?: Json
          id?: string
          is_used?: boolean
          status?: string
          submitted_at?: string | null
          token?: string
        }
        Update: {
          agent_id?: string
          cc_producer?: boolean
          client_email?: string | null
          created_at?: string
          delivery_emails?: string[]
          expires_at?: string
          form_data?: Json
          id?: string
          is_used?: boolean
          status?: string
          submitted_at?: string | null
          token?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          annual_premium: number
          approved_at: string | null
          approved_by_user_id: string | null
          carrier: string
          created_at: string
          effective_date: string
          expiration_date: string | null
          form_data_snapshot: Json | null
          id: string
          lead_id: string
          line_of_business: string
          locked: boolean
          policy_number: string
          policy_term: string
          producer_user_id: string
          rejected_at: string | null
          rejected_by_user_id: string | null
          rejection_reason: string | null
          revenue: number | null
          status: Database["public"]["Enums"]["policy_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          annual_premium: number
          approved_at?: string | null
          approved_by_user_id?: string | null
          carrier: string
          created_at?: string
          effective_date: string
          expiration_date?: string | null
          form_data_snapshot?: Json | null
          id?: string
          lead_id: string
          line_of_business: string
          locked?: boolean
          policy_number: string
          policy_term?: string
          producer_user_id: string
          rejected_at?: string | null
          rejected_by_user_id?: string | null
          rejection_reason?: string | null
          revenue?: number | null
          status?: Database["public"]["Enums"]["policy_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          annual_premium?: number
          approved_at?: string | null
          approved_by_user_id?: string | null
          carrier?: string
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          form_data_snapshot?: Json | null
          id?: string
          lead_id?: string
          line_of_business?: string
          locked?: boolean
          policy_number?: string
          policy_term?: string
          producer_user_id?: string
          rejected_at?: string | null
          rejected_by_user_id?: string | null
          rejection_reason?: string | null
          revenue?: number | null
          status?: Database["public"]["Enums"]["policy_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string | null
          file_url: string
          id: string
          policy_id: string
          uploaded_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string | null
          file_url: string
          id?: string
          policy_id: string
          uploaded_at?: string
          uploaded_by_user_id: string
        }
        Update: {
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string | null
          file_url?: string
          id?: string
          policy_id?: string
          uploaded_at?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_documents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          request_type: string
          requested_at: string
          response_data: Json | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          request_type: string
          requested_at?: string
          response_data?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          request_type?: string
          requested_at?: string
          response_data?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      producer_goals: {
        Row: {
          annual_premium_goal: number
          annual_revenue_goal: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_premium_goal?: number
          annual_revenue_goal?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          annual_premium_goal?: number
          annual_revenue_goal?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          ai_provider: string
          approval_status: string
          branch: string | null
          connect_vertical: string | null
          created_at: string
          dark_mode: boolean
          form_defaults: Json | null
          from_email: string | null
          full_name: string | null
          id: string
          industry: string | null
          intake_email_alias: string | null
          onboarding_completed: boolean | null
          openai_api_key_encrypted: string | null
          phone: string | null
          specializations: string[] | null
          states_of_operation: string[] | null
          theme_preference: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          agency_name?: string | null
          ai_provider?: string
          approval_status?: string
          branch?: string | null
          connect_vertical?: string | null
          created_at?: string
          dark_mode?: boolean
          form_defaults?: Json | null
          from_email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          intake_email_alias?: string | null
          onboarding_completed?: boolean | null
          openai_api_key_encrypted?: string | null
          phone?: string | null
          specializations?: string[] | null
          states_of_operation?: string[] | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          agency_name?: string | null
          ai_provider?: string
          approval_status?: string
          branch?: string | null
          connect_vertical?: string | null
          created_at?: string
          dark_mode?: boolean
          form_defaults?: Json | null
          from_email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          intake_email_alias?: string | null
          onboarding_completed?: boolean | null
          openai_api_key_encrypted?: string | null
          phone?: string | null
          specializations?: string[] | null
          states_of_operation?: string[] | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_partner_links: {
        Row: {
          created_at: string
          id: string
          linked_advisor_user_id: string
          partner_slug: string
          property_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_advisor_user_id: string
          partner_slug: string
          property_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_advisor_user_id?: string
          partner_slug?: string
          property_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospect_profiles: {
        Row: {
          age_range_max: number | null
          age_range_min: number | null
          connection_depth: number | null
          created_at: string | null
          exclude_existing_contacts: boolean | null
          id: string
          income_bracket: string | null
          industry_preferences: string[] | null
          is_default: boolean | null
          life_event_triggers: Json | null
          location_radius_miles: number | null
          name: string
          producer_id: string
          updated_at: string | null
        }
        Insert: {
          age_range_max?: number | null
          age_range_min?: number | null
          connection_depth?: number | null
          created_at?: string | null
          exclude_existing_contacts?: boolean | null
          id?: string
          income_bracket?: string | null
          industry_preferences?: string[] | null
          is_default?: boolean | null
          life_event_triggers?: Json | null
          location_radius_miles?: number | null
          name?: string
          producer_id: string
          updated_at?: string | null
        }
        Update: {
          age_range_max?: number | null
          age_range_min?: number | null
          connection_depth?: number | null
          created_at?: string | null
          exclude_existing_contacts?: boolean | null
          id?: string
          income_bracket?: string | null
          industry_preferences?: string[] | null
          is_default?: boolean | null
          life_event_triggers?: Json | null
          location_radius_miles?: number | null
          name?: string
          producer_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchased_leads: {
        Row: {
          batch_id: string | null
          company: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          engine_lead_id: string | null
          est_premium: number | null
          id: string
          industry: string | null
          phone: string | null
          purchased_at: string
          score: number | null
          signal: string | null
          source: string | null
          source_url: string | null
          specializations: string[] | null
          state: string | null
          user_id: string
          vertical: string | null
        }
        Insert: {
          batch_id?: string | null
          company?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          engine_lead_id?: string | null
          est_premium?: number | null
          id?: string
          industry?: string | null
          phone?: string | null
          purchased_at?: string
          score?: number | null
          signal?: string | null
          source?: string | null
          source_url?: string | null
          specializations?: string[] | null
          state?: string | null
          user_id: string
          vertical?: string | null
        }
        Update: {
          batch_id?: string | null
          company?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          engine_lead_id?: string | null
          est_premium?: number | null
          id?: string
          industry?: string | null
          phone?: string | null
          purchased_at?: string
          score?: number | null
          signal?: string | null
          source?: string | null
          source_url?: string | null
          specializations?: string[] | null
          state?: string | null
          user_id?: string
          vertical?: string | null
        }
        Relationships: []
      }
      quote_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          quote_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          quote_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          quote_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          agent_id: string
          annual_revenue: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          coverage_limits: string | null
          coverage_type: string
          created_at: string
          current_carrier: string | null
          current_premium: string | null
          deductible: string | null
          effective_date: string | null
          employee_count: string | null
          expiration_date: string | null
          id: string
          industry: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          annual_revenue?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          coverage_limits?: string | null
          coverage_type: string
          created_at?: string
          current_carrier?: string | null
          current_premium?: string | null
          deductible?: string | null
          effective_date?: string | null
          employee_count?: string | null
          expiration_date?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          annual_revenue?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          coverage_limits?: string | null
          coverage_type?: string
          created_at?: string
          current_carrier?: string | null
          current_premium?: string | null
          deductible?: string | null
          effective_date?: string | null
          employee_count?: string | null
          expiration_date?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationship_edges: {
        Row: {
          calendar_score: number | null
          call_score: number | null
          created_at: string
          email_score: number | null
          id: string
          interaction_count: number | null
          last_touch: string | null
          metadata: Json | null
          overall_strength: number | null
          owner_user_id: string
          person_a_id: string
          person_b_id: string
          relationship_type: string | null
          social_score: number | null
          updated_at: string
        }
        Insert: {
          calendar_score?: number | null
          call_score?: number | null
          created_at?: string
          email_score?: number | null
          id?: string
          interaction_count?: number | null
          last_touch?: string | null
          metadata?: Json | null
          overall_strength?: number | null
          owner_user_id: string
          person_a_id: string
          person_b_id: string
          relationship_type?: string | null
          social_score?: number | null
          updated_at?: string
        }
        Update: {
          calendar_score?: number | null
          call_score?: number | null
          created_at?: string
          email_score?: number | null
          id?: string
          interaction_count?: number | null
          last_touch?: string | null
          metadata?: Json | null
          overall_strength?: number | null
          owner_user_id?: string
          person_a_id?: string
          person_b_id?: string
          relationship_type?: string | null
          social_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_edges_person_a_id_fkey"
            columns: ["person_a_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_edges_person_b_id_fkey"
            columns: ["person_b_id"]
            isOneToOne: false
            referencedRelation: "canonical_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_health_checks: {
        Row: {
          checked_at: string
          contact_company: string | null
          contact_name: string
          health_score: number
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          checked_at?: string
          contact_company?: string | null
          contact_name: string
          health_score: number
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          checked_at?: string
          contact_company?: string | null
          contact_name?: string
          health_score?: number
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sage_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          estimated_delivery: string | null
          id: string
          priority: string
          request_type: string
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          priority?: string
          request_type?: string
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          priority?: string
          request_type?: string
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_emails: {
        Row: {
          body_html: string | null
          body_preview: string | null
          cc_addresses: string[] | null
          client_id: string | null
          client_link_source: string | null
          connection_id: string
          external_id: string
          from_address: string
          from_name: string | null
          has_attachments: boolean | null
          id: string
          is_read: boolean
          received_at: string
          subject: string
          synced_at: string
          tags: string[] | null
          to_addresses: string[]
          user_id: string
        }
        Insert: {
          body_html?: string | null
          body_preview?: string | null
          cc_addresses?: string[] | null
          client_id?: string | null
          client_link_source?: string | null
          connection_id: string
          external_id: string
          from_address: string
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean
          received_at: string
          subject?: string
          synced_at?: string
          tags?: string[] | null
          to_addresses?: string[]
          user_id: string
        }
        Update: {
          body_html?: string | null
          body_preview?: string | null
          cc_addresses?: string[] | null
          client_id?: string | null
          client_link_source?: string | null
          connection_id?: string
          external_id?: string
          from_address?: string
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean
          received_at?: string
          subject?: string
          synced_at?: string
          tags?: string[] | null
          to_addresses?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_emails_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "email_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      touch_cadence_contacts: {
        Row: {
          anniversary: string | null
          birthday: string | null
          cadence_days: number
          contact_company: string | null
          contact_email: string | null
          contact_name: string
          created_at: string
          gift_preferences: string | null
          id: string
          is_active: boolean
          last_gift_at: string | null
          last_touched_at: string | null
          milestone_date: string | null
          milestone_label: string | null
          next_touch_at: string | null
          notes: string | null
          relationship_tier: string | null
          touch_count: number
          touch_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anniversary?: string | null
          birthday?: string | null
          cadence_days?: number
          contact_company?: string | null
          contact_email?: string | null
          contact_name: string
          created_at?: string
          gift_preferences?: string | null
          id?: string
          is_active?: boolean
          last_gift_at?: string | null
          last_touched_at?: string | null
          milestone_date?: string | null
          milestone_label?: string | null
          next_touch_at?: string | null
          notes?: string | null
          relationship_tier?: string | null
          touch_count?: number
          touch_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anniversary?: string | null
          birthday?: string | null
          cadence_days?: number
          contact_company?: string | null
          contact_email?: string | null
          contact_name?: string
          created_at?: string
          gift_preferences?: string | null
          id?: string
          is_active?: boolean
          last_gift_at?: string | null
          last_touched_at?: string | null
          milestone_date?: string | null
          milestone_label?: string | null
          next_touch_at?: string | null
          notes?: string | null
          relationship_tier?: string | null
          touch_count?: number
          touch_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      touch_history: {
        Row: {
          cadence_contact_id: string
          calendar_event_id: string | null
          created_at: string
          id: string
          note: string | null
          touch_type: string
          user_id: string
        }
        Insert: {
          cadence_contact_id: string
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          touch_type?: string
          user_id: string
        }
        Update: {
          cadence_contact_id?: string
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          touch_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touch_history_cadence_contact_id_fkey"
            columns: ["cadence_contact_id"]
            isOneToOne: false
            referencedRelation: "touch_cadence_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touch_history_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_hash: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_hash: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_hash?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          failed_attempts: number
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          failed_attempts?: number
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          failed_attempts?: number
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      unreached_leads: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          company: string
          contact_name: string | null
          created_at: string
          email: string | null
          engine_lead_id: string | null
          est_premium: number | null
          expires_at: string
          expiry_notified: boolean
          id: string
          industry: string | null
          original_batch_id: string | null
          original_owner_id: string
          phone: string | null
          score: number | null
          signal: string | null
          source: string | null
          source_url: string | null
          specializations: string[] | null
          state: string | null
          status: string | null
          updated_at: string
          vertical: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          company: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          engine_lead_id?: string | null
          est_premium?: number | null
          expires_at?: string
          expiry_notified?: boolean
          id?: string
          industry?: string | null
          original_batch_id?: string | null
          original_owner_id: string
          phone?: string | null
          score?: number | null
          signal?: string | null
          source?: string | null
          source_url?: string | null
          specializations?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          engine_lead_id?: string | null
          est_premium?: number | null
          expires_at?: string
          expiry_notified?: boolean
          id?: string
          industry?: string | null
          original_batch_id?: string | null
          original_owner_id?: string
          phone?: string | null
          score?: number | null
          signal?: string | null
          source?: string | null
          source_url?: string | null
          specializations?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unreached_leads_engine_lead_id_fkey"
            columns: ["engine_lead_id"]
            isOneToOne: false
            referencedRelation: "engine_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consent_records: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          consent_type: string
          consent_version: string
          consent_version_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted: boolean
          accepted_at?: string | null
          consent_type: string
          consent_version?: string
          consent_version_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          consent_type?: string
          consent_version?: string
          consent_version_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consent_records_consent_version_id_fkey"
            columns: ["consent_version_id"]
            isOneToOne: false
            referencedRelation: "consent_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_elo: {
        Row: {
          created_at: string
          deals_completed: number
          elo_rating: number
          negative_ratings: number
          positive_ratings: number
          reliability_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deals_completed?: number
          elo_rating?: number
          negative_ratings?: number
          positive_ratings?: number
          reliability_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deals_completed?: number
          elo_rating?: number
          negative_ratings?: number
          positive_ratings?: number
          reliability_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_features: {
        Row: {
          feature: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          feature: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          feature?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_log_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
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
      get_accessible_lead_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_2fa_failed_attempts: {
        Args: { row_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "advisor"
        | "manager"
        | "client_services"
        | "property"
      calendar_event_status: "scheduled" | "completed" | "cancelled" | "no_show"
      calendar_event_type:
        | "presentation"
        | "coverage_review"
        | "renewal_review"
        | "claim_review"
        | "follow_up"
        | "other"
      contact_classification_type:
        | "person_business"
        | "person_personal"
        | "company"
        | "spam_or_system"
        | "unknown"
      document_type: "binder" | "dec" | "invoice" | "other"
      lead_stage: "prospect" | "quoting" | "presenting" | "lost" | "bound"
      loss_run_status:
        | "not_requested"
        | "requested"
        | "sent"
        | "partial_received"
        | "complete_received"
        | "not_needed"
        | "draft"
        | "awaiting_signature"
        | "fulfilled"
        | "cancelled"
      policy_status: "pending" | "approved" | "rejected"
      sharing_level: "private" | "mutual_only" | "shared"
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
      app_role: [
        "admin",
        "user",
        "advisor",
        "manager",
        "client_services",
        "property",
      ],
      calendar_event_status: ["scheduled", "completed", "cancelled", "no_show"],
      calendar_event_type: [
        "presentation",
        "coverage_review",
        "renewal_review",
        "claim_review",
        "follow_up",
        "other",
      ],
      contact_classification_type: [
        "person_business",
        "person_personal",
        "company",
        "spam_or_system",
        "unknown",
      ],
      document_type: ["binder", "dec", "invoice", "other"],
      lead_stage: ["prospect", "quoting", "presenting", "lost", "bound"],
      loss_run_status: [
        "not_requested",
        "requested",
        "sent",
        "partial_received",
        "complete_received",
        "not_needed",
        "draft",
        "awaiting_signature",
        "fulfilled",
        "cancelled",
      ],
      policy_status: ["pending", "approved", "rejected"],
      sharing_level: ["private", "mutual_only", "shared"],
    },
  },
} as const
