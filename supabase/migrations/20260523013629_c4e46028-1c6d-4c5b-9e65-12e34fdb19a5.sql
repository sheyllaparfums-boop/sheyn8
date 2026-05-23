
CREATE TABLE IF NOT EXISTS public.mentorship_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  video_id text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  is_watched boolean NOT NULL DEFAULT false,
  progress_seconds integer NOT NULL DEFAULT 0,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  view_count integer NOT NULL DEFAULT 0,
  last_watched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.mentorship_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read state" ON public.mentorship_user_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner insert state" ON public.mentorship_user_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update state" ON public.mentorship_user_state
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete state" ON public.mentorship_user_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER mentorship_user_state_updated_at
  BEFORE UPDATE ON public.mentorship_user_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_mentorship_user_state_user ON public.mentorship_user_state(user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_user_state_video ON public.mentorship_user_state(video_id);

CREATE TABLE IF NOT EXISTS public.mentorship_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#8b5cf6',
  video_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read playlists" ON public.mentorship_playlists
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner insert playlists" ON public.mentorship_playlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update playlists" ON public.mentorship_playlists
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete playlists" ON public.mentorship_playlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER mentorship_playlists_updated_at
  BEFORE UPDATE ON public.mentorship_playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
