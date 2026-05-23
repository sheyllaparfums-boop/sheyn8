
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO manage broadcasts" ON public.broadcasts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'CEO'::app_role))
  WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

CREATE POLICY "Authenticated read active broadcasts" ON public.broadcasts
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE TRIGGER broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.broadcast_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);

ALTER TABLE public.broadcast_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read own reads" ON public.broadcast_reads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));

CREATE POLICY "Owner insert own reads" ON public.broadcast_reads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
