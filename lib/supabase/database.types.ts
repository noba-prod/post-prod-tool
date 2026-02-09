/**
 * Supabase Database Types
 * Auto-generated types for the post-production tool database schema
 */

// ============================================================================
// Enums
// ============================================================================

export type OrganizationType =
  | 'noba'
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
  | 'producer'         // Noba* (producer) users who own or collaborate on the collection
  | 'photographer'     // Users from photography_agency or self_photographer
  | 'lab_technician'   // Users from lab_low_res_scan
  | 'editor'           // Users from edition_studio
  | 'print_technician' // Users from hand_print_lab

// Notifications (migration 016)
export type NotificationTriggerType = 'before' | 'after' | 'on' | 'if' | 'first_time'
export type NotificationStatus = 'pending' | 'sent' | 'read' | 'failed'
export type NotificationChannel = 'email' | 'in_app'
export type NotificationRecipientType =
  | 'producer'
  | 'lab'
  | 'photographer'
  | 'client'
  | 'hand_print_lab'
  | 'edition_studio'
export type CollectionEventType =
  | 'shooting_started'
  | 'shooting_ended'
  | 'negatives_pickup_marked'
  | 'dropoff_confirmed'
  | 'dropoff_deadline_missed'
  | 'scanning_started'
  | 'scanning_completed'
  | 'scanning_deadline_missed'
  | 'photographer_selection_uploaded'
  | 'photographer_selection_shared'
  | 'photographer_selection_deadline_missed'
  | 'photographer_requested_additional_photos'
  | 'client_selection_started'
  | 'client_selection_confirmed'
  | 'client_selection_deadline_missed'
  | 'highres_started'
  | 'highres_ready'
  | 'highres_deadline_missed'
  | 'edition_request_submitted'
  | 'edition_request_deadline_missed'
  | 'final_edits_started'
  | 'final_edits_completed'
  | 'final_edits_deadline_missed'
  | 'photographer_review_started'
  | 'photographer_edits_approved'
  | 'photographer_review_deadline_missed'
  | 'collection_completed'
  | 'collection_cancelled'

// ============================================================================
// Table Types
// ============================================================================

export interface Organization {
  id: string
  type: OrganizationType
  name: string
  email: string | null
  phone: string | null
  prefix: string | null
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
  prefix?: string | null
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
  prefix?: string | null
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
  prefix: string | null
  role: UserRole | null
  is_internal: boolean
  image: string | null
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
  prefix?: string | null
  role?: UserRole | null
  is_internal?: boolean
  image?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  organization_id?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string
  phone?: string | null
  prefix?: string | null
  role?: UserRole | null
  is_internal?: boolean
  image?: string | null
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
  publishing_date: string | null
  publishing_time: string | null
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
  lowres_selection_url: string | null
  lowres_lab_notes: string | null
  lowres_selection_uploaded_at: string | null
  lowres_selection_url02: string | null
  lowres_lab_notes02: string | null
  lowres_selection_uploaded_at02: string | null
  photographer_selection_url: string | null
  photographer_missingphotos: string | null
  photographer_notes01: string | null
  photographer_selection_uploaded_at: string | null
  photographer_request_additional_notes: string | null
  client_selection_url: string | null
  client_notes01: string | null
  client_selection_uploaded_at: string | null
  // Photo Selection
  photo_selection_photographer_preselection_date: string | null
  photo_selection_photographer_preselection_time: string | null
  photo_selection_client_selection_date: string | null
  photo_selection_client_selection_time: string | null
  // Photographer check client selection (Hand print only)
  photographer_check_due_date: string | null
  photographer_check_due_time: string | null
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
  // Lifecycle (collections-logic §5.3, §6)
  status: string
  published_at: string | null
  // noba* internal users (owner + members)
  noba_user_ids: string[]
  noba_edit_permission_by_user_id: Record<string, boolean>
  // Edit permission by user id per participant role (Edit permission switch; optional until migration 012)
  participant_edit_permissions?: Record<string, Record<string, boolean>>
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
  publishing_date?: string | null
  publishing_time?: string | null
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
  lowres_selection_url?: string | null
  lowres_lab_notes?: string | null
  lowres_selection_uploaded_at?: string | null
  lowres_selection_url02?: string | null
  lowres_lab_notes02?: string | null
  lowres_selection_uploaded_at02?: string | null
  photographer_selection_url?: string | null
  photographer_missingphotos?: string | null
  photographer_notes01?: string | null
  photographer_selection_uploaded_at?: string | null
  photographer_request_additional_notes?: string | null
  client_selection_url?: string | null
  client_notes01?: string | null
  client_selection_uploaded_at?: string | null
  photo_selection_photographer_preselection_date?: string | null
  photo_selection_photographer_preselection_time?: string | null
  photo_selection_client_selection_date?: string | null
  photo_selection_client_selection_time?: string | null
  photographer_check_due_date?: string | null
  photographer_check_due_time?: string | null
  low_to_high_date?: string | null
  low_to_high_time?: string | null
  precheck_photographer_comments_date?: string | null
  precheck_photographer_comments_time?: string | null
  precheck_studio_final_edits_date?: string | null
  precheck_studio_final_edits_time?: string | null
  check_finals_photographer_check_date?: string | null
  check_finals_photographer_check_time?: string | null
  status?: string
  published_at?: string | null
    noba_user_ids?: string[]
  noba_edit_permission_by_user_id?: Record<string, boolean>
  participant_edit_permissions?: Record<string, Record<string, boolean>>
  created_at?: string
  updated_at?: string
}

export interface CollectionUpdate {
  client_id?: string
  name?: string
  reference?: string | null
  project_deadline?: string | null
  project_deadline_time?: string | null
  publishing_date?: string | null
  publishing_time?: string | null
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
  lowres_selection_url?: string | null
  lowres_lab_notes?: string | null
  lowres_selection_uploaded_at?: string | null
  lowres_selection_url02?: string | null
  lowres_lab_notes02?: string | null
  lowres_selection_uploaded_at02?: string | null
  photographer_selection_url?: string | null
  photographer_missingphotos?: string | null
  photographer_notes01?: string | null
  photographer_selection_uploaded_at?: string | null
  photographer_request_additional_notes?: string | null
  client_selection_url?: string | null
  client_notes01?: string | null
  client_selection_uploaded_at?: string | null
  photo_selection_photographer_preselection_date?: string | null
  photo_selection_photographer_preselection_time?: string | null
  photo_selection_client_selection_date?: string | null
  photo_selection_client_selection_time?: string | null
  photographer_check_due_date?: string | null
  photographer_check_due_time?: string | null
  low_to_high_date?: string | null
  low_to_high_time?: string | null
  precheck_photographer_comments_date?: string | null
  precheck_photographer_comments_time?: string | null
  precheck_studio_final_edits_date?: string | null
  precheck_studio_final_edits_time?: string | null
  check_finals_photographer_check_date?: string | null
  check_finals_photographer_check_time?: string | null
  status?: string
  published_at?: string | null
  noba_user_ids?: string[]
  noba_edit_permission_by_user_id?: Record<string, boolean>
  participant_edit_permissions?: Record<string, Record<string, boolean>>
  updated_at?: string
}

export interface CollectionMember {
  id: string
  collection_id: string
  user_id: string
  role: CollectionMemberRole
  is_owner: boolean
  can_edit: boolean
  created_at: string
}

export interface CollectionMemberInsert {
  id?: string
  collection_id: string
  user_id: string
  role: CollectionMemberRole
  is_owner?: boolean
  can_edit?: boolean
  created_at?: string
}

export interface CollectionMemberUpdate {
  collection_id?: string
  user_id?: string
  role?: CollectionMemberRole
  is_owner?: boolean
  can_edit?: boolean
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
  collection_id: string | null
  invited_collection_role: CollectionMemberRole | null
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
  collection_id?: string | null
  invited_collection_role?: CollectionMemberRole | null
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
  collection_id?: string | null
  invited_collection_role?: CollectionMemberRole | null
}

// Notifications (migration 016)
export interface NotificationTemplate {
  id: string
  code: string
  step: number
  step_name: string
  title: string
  description: string
  cta_text: string | null
  cta_url_template: string | null
  trigger_type: NotificationTriggerType
  trigger_event: string
  trigger_offset_minutes: number
  trigger_condition: string | null
  email_recipients: NotificationRecipientType[]
  inapp_recipients: NotificationRecipientType[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationTemplateInsert {
  id?: string
  code: string
  step: number
  step_name: string
  title: string
  description: string
  cta_text?: string | null
  cta_url_template?: string | null
  trigger_type: NotificationTriggerType
  trigger_event: string
  trigger_offset_minutes?: number
  trigger_condition?: string | null
  email_recipients?: NotificationRecipientType[]
  inapp_recipients?: NotificationRecipientType[]
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface NotificationTemplateUpdate {
  code?: string
  step?: number
  step_name?: string
  title?: string
  description?: string
  cta_text?: string | null
  cta_url_template?: string | null
  trigger_type?: NotificationTriggerType
  trigger_event?: string
  trigger_offset_minutes?: number
  trigger_condition?: string | null
  email_recipients?: NotificationRecipientType[]
  inapp_recipients?: NotificationRecipientType[]
  is_active?: boolean
  updated_at?: string
}

export interface Notification {
  id: string
  collection_id: string
  template_id: string | null
  user_id: string
  channel: NotificationChannel
  status: NotificationStatus
  title: string
  body: string
  cta_text: string | null
  cta_url: string | null
  scheduled_for: string | null
  sent_at: string | null
  read_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
}

export interface NotificationInsert {
  id?: string
  collection_id: string
  template_id?: string | null
  user_id: string
  channel: NotificationChannel
  status?: NotificationStatus
  title: string
  body: string
  cta_text?: string | null
  cta_url?: string | null
  scheduled_for?: string | null
  sent_at?: string | null
  read_at?: string | null
  error_message?: string | null
  retry_count?: number
  created_at?: string
}

export interface NotificationUpdate {
  collection_id?: string
  template_id?: string | null
  user_id?: string
  channel?: NotificationChannel
  status?: NotificationStatus
  title?: string
  body?: string
  cta_text?: string | null
  cta_url?: string | null
  scheduled_for?: string | null
  sent_at?: string | null
  read_at?: string | null
  error_message?: string | null
  retry_count?: number
}

export interface CollectionEvent {
  id: string
  collection_id: string
  triggered_by_user_id: string | null
  event_type: CollectionEventType
  metadata: Record<string, unknown>
  notifications_processed: boolean
  processed_at: string | null
  created_at: string
}

export interface CollectionEventInsert {
  id?: string
  collection_id: string
  triggered_by_user_id?: string | null
  event_type: CollectionEventType
  metadata?: Record<string, unknown>
  notifications_processed?: boolean
  processed_at?: string | null
  created_at?: string
}

export interface CollectionEventUpdate {
  collection_id?: string
  triggered_by_user_id?: string | null
  event_type?: CollectionEventType
  metadata?: Record<string, unknown>
  notifications_processed?: boolean
  processed_at?: string | null
}

export interface ScheduledNotificationTracking {
  id: string
  collection_id: string
  template_id: string
  deadline_value: string
  scheduled_for: string
  is_sent: boolean
  sent_at: string | null
  created_at: string
}

export interface ScheduledNotificationTrackingInsert {
  id?: string
  collection_id: string
  template_id: string
  deadline_value: string
  scheduled_for: string
  is_sent?: boolean
  sent_at?: string | null
  created_at?: string
}

export interface ScheduledNotificationTrackingUpdate {
  collection_id?: string
  template_id?: string
  deadline_value?: string
  scheduled_for?: string
  is_sent?: boolean
  sent_at?: string | null
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
      notification_templates: {
        Row: NotificationTemplate
        Insert: NotificationTemplateInsert
        Update: NotificationTemplateUpdate
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      collection_events: {
        Row: CollectionEvent
        Insert: CollectionEventInsert
        Update: CollectionEventUpdate
      }
      scheduled_notification_tracking: {
        Row: ScheduledNotificationTracking
        Insert: ScheduledNotificationTrackingInsert
        Update: ScheduledNotificationTrackingUpdate
      }
    }
    Enums: {
      organization_type: OrganizationType
      user_role: UserRole
      collection_member_role: CollectionMemberRole
      notification_trigger_type: NotificationTriggerType
      notification_status: NotificationStatus
      notification_channel: NotificationChannel
      notification_recipient_type: NotificationRecipientType
      collection_event_type: CollectionEventType
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

