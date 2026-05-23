CREATE TABLE public.carousels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT 'geral',
  tone TEXT NOT NULL DEFAULT 'didatico',
  audience TEXT,
  hook TEXT,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  cta TEXT,
  slide_count INTEGER NOT NULL DEFAULT 7,
  format TEXT NOT NULL DEFAULT 'instagram',
  theme TEXT NOT NULL DEFAULT 'dark-purple',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read carousels" ON public.carousels FOR SELECT USING (true);
CREATE POLICY "Public insert carousels" ON public.carousels FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update carousels" ON public.carousels FOR UPDATE USING (true);
CREATE POLICY "Public delete carousels" ON public.carousels FOR DELETE USING (true);

CREATE TRIGGER update_carousels_updated_at
BEFORE UPDATE ON public.carousels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();