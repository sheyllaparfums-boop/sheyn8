CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_session_id ON public.activity_logs(session_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_event_type ON public.activity_logs(event_type);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read activity logs"
  ON public.activity_logs FOR SELECT
  USING (true);

CREATE POLICY "Public insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);