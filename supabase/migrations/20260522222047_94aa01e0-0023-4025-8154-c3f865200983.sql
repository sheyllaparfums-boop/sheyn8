
-- ============= ROLES =============
CREATE TYPE public.app_role AS ENUM ('CEO', 'USER');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (SECURITY DEFINER avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

CREATE POLICY "CEO can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (public.has_role(auth.uid(), 'CEO'));

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  handle text,
  niche text,
  goal text,
  avatar_url text,
  plan text NOT NULL DEFAULT 'TRIAL',
  trial_ends_at timestamptz DEFAULT (now() + interval '7 days'),
  onboarding_completed boolean NOT NULL DEFAULT false,
  validated_profile jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile or CEO views all"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "CEO can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'CEO'));

-- ============= TIMESTAMP TRIGGER (fix search_path) =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= AUTO PROFILE + ROLE ON SIGNUP =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  IF lower(NEW.email) = 'sheyllaparfum@gmail.com' THEN
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= ADD user_id TO EXISTING TABLES + CLEAR DATA =============
TRUNCATE public.carousels, public.content_calendar, public.competitor_analyses,
         public.reel_transcriptions, public.viral_hooks, public.activity_logs RESTART IDENTITY;

ALTER TABLE public.carousels ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.content_calendar ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.competitor_analyses ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reel_transcriptions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.viral_hooks ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============= REPLACE PUBLIC POLICIES =============

-- carousels
DROP POLICY IF EXISTS "Public read carousels" ON public.carousels;
DROP POLICY IF EXISTS "Public insert carousels" ON public.carousels;
DROP POLICY IF EXISTS "Public update carousels" ON public.carousels;
DROP POLICY IF EXISTS "Public delete carousels" ON public.carousels;
CREATE POLICY "Owner or CEO read carousels" ON public.carousels FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner insert carousels" ON public.carousels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update carousels" ON public.carousels FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner delete carousels" ON public.carousels FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

-- content_calendar
DROP POLICY IF EXISTS "Public read content calendar" ON public.content_calendar;
DROP POLICY IF EXISTS "Public insert content calendar" ON public.content_calendar;
DROP POLICY IF EXISTS "Public update content calendar" ON public.content_calendar;
DROP POLICY IF EXISTS "Public delete content calendar" ON public.content_calendar;
CREATE POLICY "Owner read calendar" ON public.content_calendar FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner insert calendar" ON public.content_calendar FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update calendar" ON public.content_calendar FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner delete calendar" ON public.content_calendar FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

-- competitor_analyses
DROP POLICY IF EXISTS "Public read competitor analyses" ON public.competitor_analyses;
DROP POLICY IF EXISTS "Public insert competitor analyses" ON public.competitor_analyses;
DROP POLICY IF EXISTS "Public delete competitor analyses" ON public.competitor_analyses;
CREATE POLICY "Owner read competitors" ON public.competitor_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner insert competitors" ON public.competitor_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update competitors" ON public.competitor_analyses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner delete competitors" ON public.competitor_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

-- reel_transcriptions
DROP POLICY IF EXISTS "Public read reel transcriptions" ON public.reel_transcriptions;
DROP POLICY IF EXISTS "Public insert reel transcriptions" ON public.reel_transcriptions;
DROP POLICY IF EXISTS "Public update reel transcriptions" ON public.reel_transcriptions;
DROP POLICY IF EXISTS "Public delete reel transcriptions" ON public.reel_transcriptions;
CREATE POLICY "Owner read transcriptions" ON public.reel_transcriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner insert transcriptions" ON public.reel_transcriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update transcriptions" ON public.reel_transcriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner delete transcriptions" ON public.reel_transcriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

-- viral_hooks
DROP POLICY IF EXISTS "Public read viral hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Public insert viral hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Public update viral hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Public delete viral hooks" ON public.viral_hooks;
CREATE POLICY "Owner read hooks" ON public.viral_hooks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner insert hooks" ON public.viral_hooks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update hooks" ON public.viral_hooks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Owner delete hooks" ON public.viral_hooks FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'CEO'));

-- activity_logs (own logs + CEO sees all)
DROP POLICY IF EXISTS "Public read activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Public insert activity logs" ON public.activity_logs;
CREATE POLICY "Owner or CEO read logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id OR public.has_role(auth.uid(), 'CEO'));
CREATE POLICY "Authenticated insert own logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- custom_pages (CEO only manage)
DROP POLICY IF EXISTS "Admins can manage custom pages" ON public.custom_pages;
CREATE POLICY "CEO can manage custom pages" ON public.custom_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (public.has_role(auth.uid(), 'CEO'));

-- api_credentials (CEO only)
CREATE POLICY "CEO manage api credentials" ON public.api_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'CEO'))
  WITH CHECK (public.has_role(auth.uid(), 'CEO'));
