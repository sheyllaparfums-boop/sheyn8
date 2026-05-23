CREATE TABLE public.content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'reel',
  platform TEXT NOT NULL DEFAULT 'instagram',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  notes TEXT,
  color TEXT DEFAULT '#8b5cf6',
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content calendar"
ON public.content_calendar FOR SELECT
USING (true);

CREATE POLICY "Public insert content calendar"
ON public.content_calendar FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update content calendar"
ON public.content_calendar FOR UPDATE
USING (true);

CREATE POLICY "Public delete content calendar"
ON public.content_calendar FOR DELETE
USING (true);

CREATE INDEX idx_content_calendar_scheduled ON public.content_calendar(scheduled_at);
CREATE INDEX idx_content_calendar_status ON public.content_calendar(status);

CREATE TRIGGER update_content_calendar_updated_at
BEFORE UPDATE ON public.content_calendar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();