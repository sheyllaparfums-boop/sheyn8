
CREATE TABLE public.competitor_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_handle TEXT NOT NULL,
  base_handle TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_insights JSONB,
  followers INTEGER DEFAULT 0,
  engagement_rate NUMERIC(6,2) DEFAULT 0,
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read competitor analyses" ON public.competitor_analyses FOR SELECT USING (true);
CREATE POLICY "Public insert competitor analyses" ON public.competitor_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete competitor analyses" ON public.competitor_analyses FOR DELETE USING (true);

CREATE TRIGGER update_competitor_analyses_updated_at
BEFORE UPDATE ON public.competitor_analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_competitor_analyses_handle ON public.competitor_analyses(competitor_handle);
CREATE INDEX idx_competitor_analyses_created_at ON public.competitor_analyses(created_at DESC);
