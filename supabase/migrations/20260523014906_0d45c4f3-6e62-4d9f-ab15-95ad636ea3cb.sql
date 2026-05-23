-- USER WORKFLOWS
CREATE TABLE public.user_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'Novo fluxo',
  description text,
  snapshot jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  template_id text,
  schedule_cron text,
  schedule_enabled boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  last_run_status text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read workflows" ON public.user_workflows FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner insert workflows" ON public.user_workflows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update workflows" ON public.user_workflows FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner delete workflows" ON public.user_workflows FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));

CREATE TRIGGER trg_user_workflows_updated
  BEFORE UPDATE ON public.user_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_workflows_user ON public.user_workflows(user_id);
CREATE INDEX idx_user_workflows_schedule ON public.user_workflows(schedule_enabled) WHERE schedule_enabled = true;

-- WORKFLOW RUNS
CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.user_workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  node_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  trigger_source text NOT NULL DEFAULT 'manual',
  error text
);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read runs" ON public.workflow_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner insert runs" ON public.workflow_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update runs" ON public.workflow_runs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner delete runs" ON public.workflow_runs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));

CREATE INDEX idx_workflow_runs_workflow ON public.workflow_runs(workflow_id, started_at DESC);

-- WORKFLOW TEMPLATES (public catalog)
CREATE TABLE public.workflow_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  icon text,
  snapshot jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read templates" ON public.workflow_templates FOR SELECT TO public
  USING (is_active = true);
CREATE POLICY "CEO manage templates" ON public.workflow_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'CEO'::app_role))
  WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

INSERT INTO public.workflow_templates (id, name, description, category, icon, estimated_cost_usd) VALUES
  ('daily-profile-analysis', 'Análise diária do perfil', 'Roda análise completa do seu @ todo dia e gera relatório de evolução.', 'analise', 'TrendingUp', 0.02),
  ('weekly-carousel', 'Carrossel semanal automático', 'Gera 1 carrossel toda segunda baseado no nicho e nos hooks favoritos.', 'conteudo', 'LayoutGrid', 0.05),
  ('trend-hunter', 'Caçador de tendências', 'Varre concorrentes 2x ao dia e alerta quando aparece um novo padrão viral.', 'inteligencia', 'Radar', 0.03),
  ('hook-generator', 'Gerador de ganchos diário', 'Cria 5 ganchos novos por dia no seu nicho e salva na biblioteca.', 'conteudo', 'Zap', 0.01),
  ('competitor-watch', 'Monitor de concorrente', 'Acompanha 3 concorrentes e dispara alerta quando passam de X% de engajamento.', 'inteligencia', 'Eye', 0.02);