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
      client_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          lead_id: string | null
          submission_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          lead_id?: string | null
          submission_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          lead_id?: string | null
          submission_id?: string | null
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
          carrier_name: string
          created_at: string
          effective_end: string
          effective_start: string
          id: string
          insured_name: string
          line_of_business: string | null
          loss_run_request_id: string
          policy_number: string
          request_email: string | null
        }
        Insert: {
          carrier_name: string
          created_at?: string
          effective_end: string
          effective_start: string
          id?: string
          insured_name: string
          line_of_business?: string | null
          loss_run_request_id: string
          policy_number: string
          request_email?: string | null
        }
        Update: {
          carrier_name?: string
          created_at?: string
          effective_end?: string
          effective_start?: string
          id?: string
          insured_name?: string
          line_of_business?: string | null
          loss_run_request_id?: string
          policy_number?: string
          request_email?: string | null
        }
        Relationships: [
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
          completed_at: string | null
          created_at: string
          delivery_email: string | null
          id: string
          lead_id: string
          notes: string | null
          request_type: string
          requested_at: string | null
          requested_by: string
          sent_at: string | null
          status: Database["public"]["Enums"]["loss_run_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          delivery_email?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          request_type?: string
          requested_at?: string | null
          requested_by: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["loss_run_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          delivery_email?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          request_type?: string
          requested_at?: string | null
          requested_by?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["loss_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loss_run_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
          form_data_snapshot: Json | null
          id: string
          lead_id: string
          line_of_business: string
          locked: boolean
          policy_number: string
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
          form_data_snapshot?: Json | null
          id?: string
          lead_id: string
          line_of_business: string
          locked?: boolean
          policy_number: string
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
          form_data_snapshot?: Json | null
          id?: string
          lead_id?: string
          line_of_business?: string
          locked?: boolean
          policy_number?: string
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
      profiles: {
        Row: {
          agency_name: string | null
          created_at: string
          form_defaults: Json | null
          from_email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_name?: string | null
          created_at?: string
          form_defaults?: Json | null
          from_email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_name?: string | null
          created_at?: string
          form_defaults?: Json | null
          from_email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
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
      app_role: "admin" | "user"
      document_type: "binder" | "dec" | "invoice" | "other"
      lead_stage: "prospect" | "quoting" | "presenting" | "lost"
      loss_run_status:
        | "not_requested"
        | "requested"
        | "sent"
        | "partial_received"
        | "complete_received"
        | "not_needed"
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
      app_role: ["admin", "user"],
      document_type: ["binder", "dec", "invoice", "other"],
      lead_stage: ["prospect", "quoting", "presenting", "lost"],
      loss_run_status: [
        "not_requested",
        "requested",
        "sent",
        "partial_received",
        "complete_received",
        "not_needed",
      ],
      policy_status: ["pending", "approved", "rejected"],
    },
  },
} as const
