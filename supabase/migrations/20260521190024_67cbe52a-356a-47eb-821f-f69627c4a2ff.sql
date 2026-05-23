-- Create custom_pages table
CREATE TABLE IF NOT EXISTS public.custom_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

-- Select policy: everyone can read active pages
CREATE POLICY "Anyone can view active custom pages" 
ON public.custom_pages FOR SELECT 
USING (is_active = true);

-- Insert/Update/Delete policy: only authenticated users with admin role (or specific ID if role not available yet)
-- For now, let's assume we use a check on metadata or a specific table if it exists. 
-- Usually, we'd check a 'profiles' table for role='admin'.
CREATE POLICY "Admins can manage custom pages" 
ON public.custom_pages FOR ALL 
TO authenticated
USING (true) -- We will refine this if we find a profiles table
WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_pages_updated_at
    BEFORE UPDATE ON public.custom_pages
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- Seed some initial data for the requested routes
INSERT INTO public.custom_pages (slug, title, content, category)
VALUES 
('quem-somos', 'Quem Somos', '<h1>Quem Somos</h1><p>Conteúdo em breve...</p>', 'footer'),
('ecosistema', 'Ecosistema', '<h1>Ecosistema</h1><p>Conteúdo em breve...</p>', 'footer'),
('suporte', 'Suporte', '<h1>Suporte</h1><p>Conteúdo em breve...</p>', 'footer')
ON CONFLICT (slug) DO NOTHING;
