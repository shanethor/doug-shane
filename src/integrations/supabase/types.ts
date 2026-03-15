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
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
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
      email_drafts: {
        Row: {
          body_html: string
          created_at: string
          id: string
          lead_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_addresses: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_addresses?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_addresses?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          company: string
          contact_name: string | null
          created_at: string
          detected_at: string
          email: string | null
          est_premium: number | null
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
          updated_at: string
        }
        Insert: {
          action?: string | null
          assigned_to?: string | null
          company: string
          contact_name?: string | null
          created_at?: string
          detected_at?: string
          email?: string | null
          est_premium?: number | null
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
          updated_at?: string
        }
        Update: {
          action?: string | null
          assigned_to?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string
          detected_at?: string
          email?: string | null
          est_premium?: number | null
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
          state: string | null
          submission_id: string | null
          target_premium: number | null
          updated_at: string
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
          state?: string | null
          submission_id?: string | null
          target_premium?: number | null
          updated_at?: string
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
          state?: string | null
          submission_id?: string | null
          target_premium?: number | null
          updated_at?: string
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
          created_at: string
          dark_mode: boolean
          form_defaults: Json | null
          from_email: string | null
          full_name: string | null
          id: string
          intake_email_alias: string | null
          openai_api_key_encrypted: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          agency_name?: string | null
          ai_provider?: string
          approval_status?: string
          created_at?: string
          dark_mode?: boolean
          form_defaults?: Json | null
          from_email?: string | null
          full_name?: string | null
          id?: string
          intake_email_alias?: string | null
          openai_api_key_encrypted?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          agency_name?: string | null
          ai_provider?: string
          approval_status?: string
          created_at?: string
          dark_mode?: boolean
          form_defaults?: Json | null
          from_email?: string | null
          full_name?: string | null
          id?: string
          intake_email_alias?: string | null
          openai_api_key_encrypted?: string | null
          phone?: string | null
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
      synced_emails: {
        Row: {
          body_html: string | null
          body_preview: string | null
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
      app_role: "admin" | "user" | "advisor" | "manager" | "client_services"
      calendar_event_status: "scheduled" | "completed" | "cancelled" | "no_show"
      calendar_event_type:
        | "presentation"
        | "coverage_review"
        | "renewal_review"
        | "claim_review"
        | "follow_up"
        | "other"
      document_type: "binder" | "dec" | "invoice" | "other"
      lead_stage: "prospect" | "quoting" | "presenting" | "lost"
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
      app_role: ["admin", "user", "advisor", "manager", "client_services"],
      calendar_event_status: ["scheduled", "completed", "cancelled", "no_show"],
      calendar_event_type: [
        "presentation",
        "coverage_review",
        "renewal_review",
        "claim_review",
        "follow_up",
        "other",
      ],
      document_type: ["binder", "dec", "invoice", "other"],
      lead_stage: ["prospect", "quoting", "presenting", "lost"],
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
    },
  },
} as const
