ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_until timestamptz,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reminder_minutes integer,
  ADD COLUMN IF NOT EXISTS hook text,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_at
  ON public.content_calendar (scheduled_at);