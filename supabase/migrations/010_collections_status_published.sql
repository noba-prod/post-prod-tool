-- ============================================================================
-- Migration 010: Collection status and published_at (collections-logic §5.3)
-- Description: Persist draft → upcoming/in_progress and publish timestamp
-- ============================================================================

-- status: draft | upcoming | in_progress (per collections-logic §5.3, §6)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'upcoming', 'in_progress'));

-- Set when status changes from draft to upcoming/in_progress (publish)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_published_at ON public.collections(published_at);

COMMENT ON COLUMN public.collections.status IS 'draft | upcoming | in_progress (collections-logic §5.3, §6)';
COMMENT ON COLUMN public.collections.published_at IS 'Set when collection is published (draft → upcoming/in_progress)';
