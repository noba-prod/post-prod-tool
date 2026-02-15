-- Migration 034: Multi-URL arrays, step notes conversations, late-step columns
--
-- 1. Convert existing URL columns (TEXT) → JSONB arrays (preserving existing data)
-- 2. Add step notes conversation columns (JSONB arrays)
-- 3. Add new URL + timestamp columns for steps 7-9
-- 4. Drop obsolete columns (_url02, scattered notes)

-- =============================================================================
-- STEP 1: Convert URL columns from TEXT to JSONB arrays
-- Handles: column doesn't exist yet (ADD), column is TEXT (ALTER), column is already JSONB (skip)
-- =============================================================================

DO $$
DECLARE
  _col_type TEXT;
BEGIN
  -- lowres_selection_url
  SELECT data_type INTO _col_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='collections' AND column_name='lowres_selection_url';
  IF _col_type IS NULL THEN
    -- Column doesn't exist: create as JSONB
    ALTER TABLE public.collections ADD COLUMN lowres_selection_url JSONB NOT NULL DEFAULT '[]'::jsonb;
  ELSIF _col_type <> 'jsonb' THEN
    -- Column exists as TEXT: convert to JSONB
    ALTER TABLE public.collections
      ALTER COLUMN lowres_selection_url TYPE JSONB
      USING CASE WHEN lowres_selection_url IS NOT NULL THEN jsonb_build_array(lowres_selection_url) ELSE '[]'::jsonb END;
    ALTER TABLE public.collections ALTER COLUMN lowres_selection_url SET DEFAULT '[]'::jsonb;
  END IF;

  -- photographer_selection_url
  SELECT data_type INTO _col_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='collections' AND column_name='photographer_selection_url';
  IF _col_type IS NULL THEN
    ALTER TABLE public.collections ADD COLUMN photographer_selection_url JSONB NOT NULL DEFAULT '[]'::jsonb;
  ELSIF _col_type <> 'jsonb' THEN
    ALTER TABLE public.collections
      ALTER COLUMN photographer_selection_url TYPE JSONB
      USING CASE WHEN photographer_selection_url IS NOT NULL THEN jsonb_build_array(photographer_selection_url) ELSE '[]'::jsonb END;
    ALTER TABLE public.collections ALTER COLUMN photographer_selection_url SET DEFAULT '[]'::jsonb;
  END IF;

  -- client_selection_url
  SELECT data_type INTO _col_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='collections' AND column_name='client_selection_url';
  IF _col_type IS NULL THEN
    ALTER TABLE public.collections ADD COLUMN client_selection_url JSONB NOT NULL DEFAULT '[]'::jsonb;
  ELSIF _col_type <> 'jsonb' THEN
    ALTER TABLE public.collections
      ALTER COLUMN client_selection_url TYPE JSONB
      USING CASE WHEN client_selection_url IS NOT NULL THEN jsonb_build_array(client_selection_url) ELSE '[]'::jsonb END;
    ALTER TABLE public.collections ALTER COLUMN client_selection_url SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Add step notes conversation columns (JSONB arrays)
-- Each stores: [{ "from": "role", "text": "...", "at": "ISO" }, ...]
-- =============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_low_res JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_photographer_selection JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_client_selection JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_photographer_review JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_high_res JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_edition_request JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_final_edits JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_photographer_last_check JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_notes_client_confirmation JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- STEP 3: Add new URL + timestamp columns for steps 7-9
-- =============================================================================

-- Step 7: High-res selection
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS highres_selection_url JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS highres_selection_uploaded_at TIMESTAMPTZ;

-- Step 8: Edition instructions
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS edition_instructions_url JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS edition_instructions_uploaded_at TIMESTAMPTZ;

-- Step 9: Finals selection
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS finals_selection_url JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS finals_selection_uploaded_at TIMESTAMPTZ;

-- =============================================================================
-- STEP 4: Migrate existing notes into step_notes conversation arrays
-- Uses dynamic SQL so that missing columns (from unapplied earlier migrations)
-- are gracefully skipped instead of causing an error.
-- =============================================================================

DO $$
DECLARE
  _has_lowres_uploaded_at BOOLEAN;
  _has_lowres_uploaded_at02 BOOLEAN;
  _has_photographer_uploaded_at BOOLEAN;
  _has_client_uploaded_at BOOLEAN;
  _has_lowres_lab_notes BOOLEAN;
  _has_lowres_lab_notes02 BOOLEAN;
  _has_photographer_notes01 BOOLEAN;
  _has_photographer_missingphotos BOOLEAN;
  _has_photographer_request_notes BOOLEAN;
  _has_client_notes01 BOOLEAN;
  _has_lowres_url02 BOOLEAN;
BEGIN
  -- Check which optional columns exist
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='lowres_selection_uploaded_at') INTO _has_lowres_uploaded_at;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='lowres_selection_uploaded_at02') INTO _has_lowres_uploaded_at02;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='photographer_selection_uploaded_at') INTO _has_photographer_uploaded_at;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='client_selection_uploaded_at') INTO _has_client_uploaded_at;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='lowres_lab_notes') INTO _has_lowres_lab_notes;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='lowres_lab_notes02') INTO _has_lowres_lab_notes02;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='photographer_notes01') INTO _has_photographer_notes01;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='photographer_missingphotos') INTO _has_photographer_missingphotos;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='photographer_request_additional_notes') INTO _has_photographer_request_notes;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='client_notes01') INTO _has_client_notes01;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='lowres_selection_url02') INTO _has_lowres_url02;

  -- Migrate lowres_lab_notes → step_notes_low_res
  IF _has_lowres_lab_notes THEN
    IF _has_lowres_uploaded_at THEN
      EXECUTE 'UPDATE public.collections SET step_notes_low_res = jsonb_build_array(jsonb_build_object(''from'', ''lab'', ''text'', lowres_lab_notes, ''at'', COALESCE(lowres_selection_uploaded_at::text, created_at::text))) WHERE lowres_lab_notes IS NOT NULL AND lowres_lab_notes != ''''';
    ELSE
      EXECUTE 'UPDATE public.collections SET step_notes_low_res = jsonb_build_array(jsonb_build_object(''from'', ''lab'', ''text'', lowres_lab_notes, ''at'', created_at::text)) WHERE lowres_lab_notes IS NOT NULL AND lowres_lab_notes != ''''';
    END IF;
  END IF;

  -- Migrate lowres_lab_notes02 (re-upload notes) → append to step_notes_low_res
  IF _has_lowres_lab_notes02 THEN
    IF _has_lowres_uploaded_at02 THEN
      EXECUTE 'UPDATE public.collections SET step_notes_low_res = step_notes_low_res || jsonb_build_array(jsonb_build_object(''from'', ''lab'', ''text'', lowres_lab_notes02, ''at'', COALESCE(lowres_selection_uploaded_at02::text, created_at::text))) WHERE lowres_lab_notes02 IS NOT NULL AND lowres_lab_notes02 != ''''';
    ELSE
      EXECUTE 'UPDATE public.collections SET step_notes_low_res = step_notes_low_res || jsonb_build_array(jsonb_build_object(''from'', ''lab'', ''text'', lowres_lab_notes02, ''at'', created_at::text)) WHERE lowres_lab_notes02 IS NOT NULL AND lowres_lab_notes02 != ''''';
    END IF;
  END IF;

  -- Migrate photographer_notes01 → step_notes_photographer_selection
  IF _has_photographer_notes01 THEN
    IF _has_photographer_uploaded_at THEN
      EXECUTE 'UPDATE public.collections SET step_notes_photographer_selection = jsonb_build_array(jsonb_build_object(''from'', ''photographer'', ''text'', photographer_notes01, ''at'', COALESCE(photographer_selection_uploaded_at::text, created_at::text))) WHERE photographer_notes01 IS NOT NULL AND photographer_notes01 != ''''';
    ELSE
      EXECUTE 'UPDATE public.collections SET step_notes_photographer_selection = jsonb_build_array(jsonb_build_object(''from'', ''photographer'', ''text'', photographer_notes01, ''at'', created_at::text)) WHERE photographer_notes01 IS NOT NULL AND photographer_notes01 != ''''';
    END IF;
  END IF;

  -- Migrate photographer_missingphotos → append to step_notes_photographer_selection
  IF _has_photographer_missingphotos THEN
    EXECUTE 'UPDATE public.collections SET step_notes_photographer_selection = step_notes_photographer_selection || jsonb_build_array(jsonb_build_object(''from'', ''photographer'', ''text'', photographer_missingphotos, ''at'', created_at::text)) WHERE photographer_missingphotos IS NOT NULL AND photographer_missingphotos != ''''';
  END IF;

  -- Migrate photographer_request_additional_notes → append to step_notes_low_res
  IF _has_photographer_request_notes THEN
    EXECUTE 'UPDATE public.collections SET step_notes_low_res = step_notes_low_res || jsonb_build_array(jsonb_build_object(''from'', ''photographer'', ''text'', photographer_request_additional_notes, ''at'', created_at::text)) WHERE photographer_request_additional_notes IS NOT NULL AND photographer_request_additional_notes != ''''';
  END IF;

  -- Migrate client_notes01 → step_notes_client_selection
  IF _has_client_notes01 THEN
    IF _has_client_uploaded_at THEN
      EXECUTE 'UPDATE public.collections SET step_notes_client_selection = jsonb_build_array(jsonb_build_object(''from'', ''client'', ''text'', client_notes01, ''at'', COALESCE(client_selection_uploaded_at::text, created_at::text))) WHERE client_notes01 IS NOT NULL AND client_notes01 != ''''';
    ELSE
      EXECUTE 'UPDATE public.collections SET step_notes_client_selection = jsonb_build_array(jsonb_build_object(''from'', ''client'', ''text'', client_notes01, ''at'', created_at::text)) WHERE client_notes01 IS NOT NULL AND client_notes01 != ''''';
    END IF;
  END IF;

  -- Migrate lowres_selection_url02 into the lowres_selection_url array
  IF _has_lowres_url02 THEN
    EXECUTE 'UPDATE public.collections SET lowres_selection_url = lowres_selection_url || jsonb_build_array(lowres_selection_url02::text) WHERE lowres_selection_url02 IS NOT NULL AND lowres_selection_url02 != ''''';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Drop obsolete columns (IF EXISTS — safe if never created)
-- =============================================================================

ALTER TABLE public.collections DROP COLUMN IF EXISTS lowres_selection_url02;
ALTER TABLE public.collections DROP COLUMN IF EXISTS lowres_lab_notes02;
ALTER TABLE public.collections DROP COLUMN IF EXISTS lowres_selection_uploaded_at02;
ALTER TABLE public.collections DROP COLUMN IF EXISTS lowres_lab_notes;
ALTER TABLE public.collections DROP COLUMN IF EXISTS photographer_notes01;
ALTER TABLE public.collections DROP COLUMN IF EXISTS photographer_missingphotos;
ALTER TABLE public.collections DROP COLUMN IF EXISTS photographer_request_additional_notes;
ALTER TABLE public.collections DROP COLUMN IF EXISTS client_notes01;
