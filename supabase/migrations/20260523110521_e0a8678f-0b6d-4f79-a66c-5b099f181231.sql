
-- Validation/usage history per credential
CREATE TABLE IF NOT EXISTS public.api_credential_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  event_type text NOT NULL DEFAULT 'validation', -- validation | usage | rotation | health_check
  status text NOT NULL, -- valid | invalid | error | ok
  message text,
  latency_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_credential_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO manage credential logs"
ON public.api_credential_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

CREATE INDEX IF NOT EXISTS idx_credlogs_key_created ON public.api_credential_logs(key, created_at DESC);

-- Per-credential metadata
ALTER TABLE public.api_credentials
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'prod',
  ADD COLUMN IF NOT EXISTS monthly_cost_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_limit integer,
  ADD COLUMN IF NOT EXISTS auto_health_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_on_failure boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS webhook_url text;
