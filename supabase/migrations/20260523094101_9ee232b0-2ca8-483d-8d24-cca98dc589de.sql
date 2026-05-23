
-- ============== PROJECTS TABLE ==============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#8b5cf6',
  icon text NOT NULL DEFAULT 'Layers',
  emoji text,
  status text NOT NULL DEFAULT 'active', -- active | paused | completed | archived
  tags text[] NOT NULL DEFAULT '{}',
  progress integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  deadline_at timestamptz,
  is_favorite boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  public_slug text UNIQUE,
  template_id text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_public_slug ON public.projects(public_slug);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read projects" ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner insert projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update projects" ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Owner delete projects" ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'CEO'::app_role));
CREATE POLICY "Public read shared projects" ON public.projects FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== LINK project_id TO CONTENT TABLES ==============
ALTER TABLE public.carousels ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.content_calendar ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.viral_hooks ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.reel_transcriptions ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.competitor_analyses ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.profile_analyses ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX idx_carousels_project ON public.carousels(project_id);
CREATE INDEX idx_calendar_project ON public.content_calendar(project_id);
CREATE INDEX idx_hooks_project ON public.viral_hooks(project_id);
CREATE INDEX idx_transcriptions_project ON public.reel_transcriptions(project_id);
CREATE INDEX idx_competitors_project ON public.competitor_analyses(project_id);
CREATE INDEX idx_analyses_project ON public.profile_analyses(project_id);

-- ============== PROJECT TEMPLATES ==============
CREATE TABLE public.project_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  color text NOT NULL DEFAULT '#8b5cf6',
  default_tags text[] NOT NULL DEFAULT '{}',
  duration_days integer,
  suggested_content jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read project templates" ON public.project_templates FOR SELECT TO public USING (is_active = true);
CREATE POLICY "CEO manage project templates" ON public.project_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'CEO'::app_role)) WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

INSERT INTO public.project_templates (id, name, description, icon, color, default_tags, duration_days, suggested_content) VALUES
('launch-7d', 'Lançamento 7 Dias', 'Sequência completa de pré-lançamento, abertura e fechamento de carrinho.', 'Rocket', '#ec4899', ARRAY['lancamento','vendas'], 7,
  '[{"type":"hook","count":10},{"type":"carousel","count":3},{"type":"calendar","count":7}]'::jsonb),
('black-friday', 'Black Friday', 'Campanha de ofertas com escassez, prova social e CTA agressivo.', 'Flame', '#f97316', ARRAY['promocao','urgencia'], 14,
  '[{"type":"hook","count":15},{"type":"carousel","count":5},{"type":"calendar","count":14}]'::jsonb),
('evergreen', 'Evergreen', 'Conteúdo permanente para autoridade e crescimento orgânico contínuo.', 'TreePine', '#10b981', ARRAY['autoridade','organico'], NULL,
  '[{"type":"hook","count":20},{"type":"carousel","count":10},{"type":"calendar","count":30}]'::jsonb),
('client', 'Cliente / Agência', 'Projeto para gerenciar conteúdo de um cliente específico.', 'Briefcase', '#3b82f6', ARRAY['cliente','agencia'], 30,
  '[{"type":"hook","count":10},{"type":"carousel","count":4},{"type":"calendar","count":20}]'::jsonb),
('content-week', 'Semana de Conteúdo', 'Bateria de gravação semanal: 7 reels + 3 carrosséis prontos.', 'Calendar', '#8b5cf6', ARRAY['rotina','producao'], 7,
  '[{"type":"hook","count":7},{"type":"carousel","count":3},{"type":"calendar","count":7}]'::jsonb);

-- ============== STATS FUNCTION ==============
CREATE OR REPLACE FUNCTION public.get_project_stats(_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'carousels', (SELECT count(*) FROM carousels WHERE project_id = _project_id),
    'hooks', (SELECT count(*) FROM viral_hooks WHERE project_id = _project_id),
    'calendar', (SELECT count(*) FROM content_calendar WHERE project_id = _project_id),
    'transcriptions', (SELECT count(*) FROM reel_transcriptions WHERE project_id = _project_id),
    'competitors', (SELECT count(*) FROM competitor_analyses WHERE project_id = _project_id),
    'analyses', (SELECT count(*) FROM profile_analyses WHERE project_id = _project_id),
    'last_activity', (
      SELECT max(t) FROM (
        SELECT max(updated_at) AS t FROM carousels WHERE project_id = _project_id
        UNION ALL SELECT max(updated_at) FROM viral_hooks WHERE project_id = _project_id
        UNION ALL SELECT max(updated_at) FROM content_calendar WHERE project_id = _project_id
        UNION ALL SELECT max(updated_at) FROM reel_transcriptions WHERE project_id = _project_id
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ============== SLUGIFY ==============
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(lower(trim(_input)), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
$$;

-- ============== AUTO-CREATE FIRST PROJECT ON SIGNUP ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  IF lower(NEW.email) IN ('sheylla.parfums@gmail.com', 'sheyllaparfum@gmail.com') THEN
    _role := 'CEO';
  ELSE
    _role := 'USER';
  END IF;

  INSERT INTO public.profiles (user_id, email, name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN _role = 'CEO' THEN 'CEO' ELSE 'TRIAL' END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  -- Default project
  INSERT INTO public.projects (user_id, name, description, color, icon, status, tags)
  VALUES (NEW.id, 'Meu Primeiro Projeto', 'Comece organizando seus conteúdos aqui.', '#8b5cf6', 'Sparkles', 'active', ARRAY['inicio']);

  RETURN NEW;
END;
$$;
