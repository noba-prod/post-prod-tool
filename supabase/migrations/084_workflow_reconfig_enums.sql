-- ============================================================================
-- Migration 084: Workflow reconfiguration — enum extensions
-- Description: Adds the event and recipient enum values used by the
--              `workflow_reconfiguration_announcement` in-app notification
--              (see plan §17).
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run in the same transaction as the
-- DDL/DML that uses it; that is why the template seed lives in migration 085.
-- ============================================================================

-- 1) Add recipient bucket for users with `collection_members.role = 'agency'`.
--    Without this, agencies would not be reachable as a *direct* recipient
--    bucket — they currently only piggyback on "photographer" when
--    `photographer_collaborates_with_agency=true` (see recipient-resolver.ts).
ALTER TYPE public.notification_recipient_type
  ADD VALUE IF NOT EXISTS 'agency';

-- 2) Add the workflow event the service emits at the end of
--    `applyStructuralWorkflowChange()` (see CollectionsService).
ALTER TYPE public.collection_event_type
  ADD VALUE IF NOT EXISTS 'collection_workflow_reconfigured';
