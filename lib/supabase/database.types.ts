/**
 * Supabase Database Types
 * Auto-generated types for the post-production tool database schema
 */

// ============================================================================
// Enums
// ============================================================================

export type OrganizationType =
  | 'client'
  | 'photography_agency'
  | 'self_photographer'
  | 'lab_low_res_scan'
  | 'edition_studio'
  | 'hand_print_lab'

export type UserRole = 'admin' | 'editor' | 'viewer'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export type CollectionMemberRole = 
  | 'manager'          // Client users who manage/approve the collection
  | 'photographer'     // Users from photography_agency or self_photographer
  | 'lab_technician'   // Users from lab_low_res_scan
  | 'editor'           // Users from edition_studio
  | 'print_technician' // Users from hand_print_lab

// ============================================================================
// Table Types
// ============================================================================

export interface Organization {
  id: string
  type: OrganizationType
  name: string
  email: string | null
  phone: string | null
  profile_picture_url: string | null
  notes: string | null
  street_address: string | null
  zip_code: string | null
  city: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationInsert {
  id?: string
  type: OrganizationType
  name: string
  email?: string | null
  phone?: string | null
  profile_picture_url?: string | null
  notes?: string | null
  street_address?: string | null
  zip_code?: string | null
  city?: string | null
  country?: string | null
  created_at?: string
  updated_at?: string
}

export interface OrganizationUpdate {
  id?: string
  type?: OrganizationType
  name?: string
  email?: string | null
  phone?: string | null
  profile_picture_url?: string | null
  notes?: string | null
  street_address?: string | null
  zip_code?: string | null
  city?: string | null
  country?: string | null
  updated_at?: string
}

export interface Profile {
  id: string
  organization_id: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  role: UserRole | null
  is_internal: boolean
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  organization_id?: string | null
  first_name?: string | null
  last_name?: string | null
  email: string
  phone?: string | null
  role?: UserRole | null
  is_internal?: boolean
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  organization_id?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string
  phone?: string | null
  role?: UserRole | null
  is_internal?: boolean
  updated_at?: string
}

export interface Collection {
  id: string
  // Basic Information
  client_id: string
  name: string
  reference: string | null
  project_deadline: string | null
  project_deadline_time: string | null
  // Configuration Options
  low_res_to_high_res_digital: boolean
  low_res_to_high_res_hand_print: boolean
  photographer_request_edition: boolean
  photographer_collaborates_with_agency: boolean
  handprint_different_from_original_lab: boolean
  // Entity Assignments
  photographer_id: string | null
  lab_low_res_id: string | null
  edition_studio_id: string | null
  hand_print_lab_id: string | null
  // Shooting Schedule
  shooting_start_date: string | null
  shooting_start_time: string | null
  shooting_end_date: string | null
  shooting_end_time: string | null
  shooting_street_address: string | null
  shooting_zip_code: string | null
  shooting_city: string | null
  shooting_country: string | null
  // Drop-off Shipping
  dropoff_shipping_origin_address: string | null
  dropoff_shipping_date: string | null
  dropoff_shipping_time: string | null
  dropoff_shipping_destination_address: string | null
  dropoff_delivery_date: string | null
  dropoff_delivery_time: string | null
  dropoff_managing_shipping: string | null
  dropoff_shipping_carrier: string | null
  dropoff_shipping_tracking: string | null
  // Low-Res Workflow
  lowres_deadline_date: string | null
  lowres_deadline_time: string | null
  lowres_shipping_origin_address: string | null
  lowres_shipping_date: string | null
  lowres_shipping_time: string | null
  lowres_shipping_destination_address: string | null
  lowres_delivery_date: string | null
  lowres_delivery_time: string | null
  lowres_managing_shipping: string | null
  lowres_shipping_carrier: string | null
  lowres_shipping_tracking: string | null
  // Photo Selection
  photo_selection_photographer_preselection_date: string | null
  photo_selection_photographer_preselection_time: string | null
  photo_selection_client_selection_date: string | null
  photo_selection_client_selection_time: string | null
  // Low to High
  low_to_high_date: string | null
  low_to_high_time: string | null
  // Pre-Check Phase
  precheck_photographer_comments_date: string | null
  precheck_photographer_comments_time: string | null
  precheck_studio_final_edits_date: string | null
  precheck_studio_final_edits_time: string | null
  // Check Finals Phase
  check_finals_photographer_check_date: string | null
  check_finals_photographer_check_time: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CollectionInsert {
  id?: string
  client_id: string
  name: string
  reference?: string | null
  project_deadline?: string | null
  project_deadline_time?: string | null
  low_res_to_high_res_digital?: boolean
  low_res_to_high_res_hand_print?: boolean
  photographer_request_edition?: boolean
  photographer_collaborates_with_agency?: boolean
  handprint_different_from_original_lab?: boolean
  photographer_id?: string | null
  lab_low_res_id?: string | null
  edition_studio_id?: string | null
  hand_print_lab_id?: string | null
  shooting_start_date?: string | null
  shooting_start_time?: string | null
  shooting_end_date?: string | null
  shooting_end_time?: string | null
  shooting_street_address?: string | null
  shooting_zip_code?: string | null
  shooting_city?: string | null
  shooting_country?: string | null
  dropoff_shipping_origin_address?: string | null
  dropoff_shipping_date?: string | null
  dropoff_shipping_time?: string | null
  dropoff_shipping_destination_address?: string | null
  dropoff_delivery_date?: string | null
  dropoff_delivery_time?: string | null
  dropoff_managing_shipping?: string | null
  dropoff_shipping_carrier?: string | null
  dropoff_shipping_tracking?: string | null
  lowres_deadline_date?: string | null
  lowres_deadline_time?: string | null
  lowres_shipping_origin_address?: string | null
  lowres_shipping_date?: string | null
  lowres_shipping_time?: string | null
  lowres_shipping_destination_address?: string | null
  lowres_delivery_date?: string | null
  lowres_delivery_time?: string | null
  lowres_managing_shipping?: string | null
  lowres_shipping_carrier?: string | null
  lowres_shipping_tracking?: string | null
  photo_selection_photographer_preselection_date?: string | null
  photo_selection_photographer_preselection_time?: string | null
  photo_selection_client_selection_date?: string | null
  photo_selection_client_selection_time?: string | null
  low_to_high_date?: string | null
  low_to_high_time?: string | null
  precheck_photographer_comments_date?: string | null
  precheck_photographer_comments_time?: string | null
  precheck_studio_final_edits_date?: string | null
  precheck_studio_final_edits_time?: string | null
  check_finals_photographer_check_date?: string | null
  check_finals_photographer_check_time?: string | null
  created_at?: string
  updated_at?: string
}

export interface CollectionUpdate {
  client_id?: string
  name?: string
  reference?: string | null
  project_deadline?: string | null
  project_deadline_time?: string | null
  low_res_to_high_res_digital?: boolean
  low_res_to_high_res_hand_print?: boolean
  photographer_request_edition?: boolean
  photographer_collaborates_with_agency?: boolean
  handprint_different_from_original_lab?: boolean
  photographer_id?: string | null
  lab_low_res_id?: string | null
  edition_studio_id?: string | null
  hand_print_lab_id?: string | null
  shooting_start_date?: string | null
  shooting_start_time?: string | null
  shooting_end_date?: string | null
  shooting_end_time?: string | null
  shooting_street_address?: string | null
  shooting_zip_code?: string | null
  shooting_city?: string | null
  shooting_country?: string | null
  dropoff_shipping_origin_address?: string | null
  dropoff_shipping_date?: string | null
  dropoff_shipping_time?: string | null
  dropoff_shipping_destination_address?: string | null
  dropoff_delivery_date?: string | null
  dropoff_delivery_time?: string | null
  dropoff_managing_shipping?: string | null
  dropoff_shipping_carrier?: string | null
  dropoff_shipping_tracking?: string | null
  lowres_deadline_date?: string | null
  lowres_deadline_time?: string | null
  lowres_shipping_origin_address?: string | null
  lowres_shipping_date?: string | null
  lowres_shipping_time?: string | null
  lowres_shipping_destination_address?: string | null
  lowres_delivery_date?: string | null
  lowres_delivery_time?: string | null
  lowres_managing_shipping?: string | null
  lowres_shipping_carrier?: string | null
  lowres_shipping_tracking?: string | null
  photo_selection_photographer_preselection_date?: string | null
  photo_selection_photographer_preselection_time?: string | null
  photo_selection_client_selection_date?: string | null
  photo_selection_client_selection_time?: string | null
  low_to_high_date?: string | null
  low_to_high_time?: string | null
  precheck_photographer_comments_date?: string | null
  precheck_photographer_comments_time?: string | null
  precheck_studio_final_edits_date?: string | null
  precheck_studio_final_edits_time?: string | null
  check_finals_photographer_check_date?: string | null
  check_finals_photographer_check_time?: string | null
  updated_at?: string
}

export interface CollectionMember {
  id: string
  collection_id: string
  user_id: string
  role: CollectionMemberRole
  created_at: string
}

export interface CollectionMemberInsert {
  id?: string
  collection_id: string
  user_id: string
  role: CollectionMemberRole
  created_at?: string
}

export interface CollectionMemberUpdate {
  collection_id?: string
  user_id?: string
  role?: CollectionMemberRole
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  token: string
  role: UserRole
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  accepted_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface InvitationInsert {
  id?: string
  organization_id: string
  email: string
  token: string
  role?: UserRole
  status?: InvitationStatus
  expires_at: string
  accepted_at?: string | null
  accepted_by_user_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface InvitationUpdate {
  organization_id?: string
  email?: string
  token?: string
  role?: UserRole
  status?: InvitationStatus
  expires_at?: string
  accepted_at?: string | null
  accepted_by_user_id?: string | null
  updated_at?: string
}

// ============================================================================
// Database Schema Type
// ============================================================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      collections: {
        Row: Collection
        Insert: CollectionInsert
        Update: CollectionUpdate
      }
      collection_members: {
        Row: CollectionMember
        Insert: CollectionMemberInsert
        Update: CollectionMemberUpdate
      }
      invitations: {
        Row: Invitation
        Insert: InvitationInsert
        Update: InvitationUpdate
      }
    }
    Enums: {
      organization_type: OrganizationType
      user_role: UserRole
      collection_member_role: CollectionMemberRole
    }
    Functions: {
      is_internal_user: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_user_organization_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      is_org_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { org_id: string }
        Returns: boolean
      }
      check_email_precheck: {
        Args: { check_email: string }
        Returns: { allowed: boolean; reason: string }[]
      }
    }
  }
}

// ============================================================================
// Helper Types for Relationships
// ============================================================================

export interface OrganizationWithProfiles extends Organization {
  profiles: Profile[]
}

export interface CollectionWithRelations extends Collection {
  client: Organization
  photographer: Organization | null
  lab_low_res: Organization | null
  edition_studio: Organization | null
  hand_print_lab: Organization | null
  members: (CollectionMember & { profile: Profile })[]
}

// Helper type to get members by role
export interface CollectionMemberWithProfile extends CollectionMember {
  profile: Profile
}

export interface ProfileWithOrganization extends Profile {
  organization: Organization | null
}

// ============================================================================
// Form Types (for UI)
// ============================================================================

export interface CreateClientForm {
  name: string
  email?: string
  phone?: string
  profile_picture?: File
  notes?: string
}

export interface CreatePhotographyAgencyForm {
  name: string
  email?: string
  phone?: string
  profile_picture?: File
  notes?: string
}

export interface CreateSelfPhotographerForm {
  first_name: string
  last_name: string
  email: string
  phone?: string
}

export interface CreateLabForm {
  name: string
  street_address: string
  zip_code: string
  city: string
  country: string
  email?: string
  phone?: string
  profile_picture?: File
  notes?: string
}

export interface CreateEditionStudioForm {
  name: string
  street_address: string
  zip_code: string
  city: string
  country: string
  email?: string
  phone?: string
  profile_picture?: File
  notes?: string
}

export interface CreateHandPrintLabForm {
  name: string
  street_address: string
  zip_code: string
  city: string
  country: string
  email?: string
  phone?: string
  profile_picture?: File
  notes?: string
}

export interface CreateUserForm {
  first_name: string
  last_name: string
  email: string
  phone?: string
  role: UserRole
}

export interface CreateCollectionForm {
  client_id: string
  name: string
  manager_ids: string[]
  reference?: string
  project_deadline?: string
  project_deadline_time?: string
  low_res_to_high_res_digital: boolean
  low_res_to_high_res_hand_print: boolean
  photographer_request_edition: boolean
  photographer_collaborates_with_agency: boolean
  handprint_different_from_original_lab: boolean
}

