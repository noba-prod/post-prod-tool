-- Migration 091: Event types for step link edit/delete notifications

ALTER TYPE public.collection_event_type ADD VALUE IF NOT EXISTS 'link_edited';
ALTER TYPE public.collection_event_type ADD VALUE IF NOT EXISTS 'link_deleted';
