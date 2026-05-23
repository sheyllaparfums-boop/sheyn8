CREATE TABLE IF NOT EXISTS public.api_credentials (
  key TEXT PRIMARY KEY,
  value TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  message TEXT,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Sem políticas: somente service role (server-side) acessa.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_api_credentials_updated_at ON public.api_credentials;
CREATE TRIGGER update_api_credentials_updated_at
BEFORE UPDATE ON public.api_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();