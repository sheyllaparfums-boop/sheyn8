CREATE TABLE public.reel_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_url text NOT NULL,
  shortcode text,
  author_handle text,
  caption text,
  thumbnail_url text,
  video_url text,
  duration_seconds numeric,
  language text,
  transcript text,
  words jsonb DEFAULT '[]'::jsonb,
  audio_events jsonb DEFAULT '[]'::jsonb,
  ai_repurpose jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  user_name text,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reel_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reel transcriptions" ON public.reel_transcriptions FOR SELECT USING (true);
CREATE POLICY "Public insert reel transcriptions" ON public.reel_transcriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update reel transcriptions" ON public.reel_transcriptions FOR UPDATE USING (true);
CREATE POLICY "Public delete reel transcriptions" ON public.reel_transcriptions FOR DELETE USING (true);

CREATE TRIGGER trg_reel_transcriptions_updated_at
BEFORE UPDATE ON public.reel_transcriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reel_transcriptions_created_at ON public.reel_transcriptions(created_at DESC);