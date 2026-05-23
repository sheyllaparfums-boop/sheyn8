
-- Histórico de análises de perfil
CREATE TABLE public.profile_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  handle text NOT NULL,
  followers integer NOT NULL DEFAULT 0,
  following integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  avg_likes integer NOT NULL DEFAULT 0,
  avg_comments integer NOT NULL DEFAULT 0,
  engagement_rate numeric NOT NULL DEFAULT 0,
  niche text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_insights jsonb,
  is_public boolean NOT NULL DEFAULT false,
  public_slug text UNIQUE,
  schedule_enabled boolean NOT NULL DEFAULT false,
  schedule_cron text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_analyses_user ON public.profile_analyses(user_id, created_at DESC);
CREATE INDEX idx_profile_analyses_handle ON public.profile_analyses(user_id, handle, created_at DESC);
CREATE INDEX idx_profile_analyses_public_slug ON public.profile_analyses(public_slug) WHERE is_public = true;

ALTER TABLE public.profile_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read analyses" ON public.profile_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Public read shared analyses" ON public.profile_analyses FOR SELECT TO anon, authenticated
  USING (is_public = true);
CREATE POLICY "Owner insert analyses" ON public.profile_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update analyses" ON public.profile_analyses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete analyses" ON public.profile_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));

CREATE TRIGGER trg_profile_analyses_updated_at
  BEFORE UPDATE ON public.profile_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
