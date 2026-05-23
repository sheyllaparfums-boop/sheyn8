CREATE TABLE public.mentorship_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Estratégia',
  thumbnail_url text,
  channel_title text,
  published_at timestamptz,
  duration text,
  search_query text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read mentorship videos"
ON public.mentorship_videos FOR SELECT
USING (is_active = true);

CREATE INDEX idx_mentorship_videos_published ON public.mentorship_videos(published_at DESC);
CREATE INDEX idx_mentorship_videos_category ON public.mentorship_videos(category);

CREATE TRIGGER trg_mentorship_videos_updated_at
BEFORE UPDATE ON public.mentorship_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();