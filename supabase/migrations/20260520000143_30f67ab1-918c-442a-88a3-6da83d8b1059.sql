
CREATE TABLE public.viral_hooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hook TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT 'geral',
  format TEXT NOT NULL DEFAULT 'reel',
  tags TEXT[] NOT NULL DEFAULT '{}',
  performance TEXT NOT NULL DEFAULT 'medio',
  language TEXT NOT NULL DEFAULT 'pt-br',
  source TEXT,
  notes TEXT,
  uses INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.viral_hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read viral hooks" ON public.viral_hooks FOR SELECT USING (true);
CREATE POLICY "Public insert viral hooks" ON public.viral_hooks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update viral hooks" ON public.viral_hooks FOR UPDATE USING (true);
CREATE POLICY "Public delete viral hooks" ON public.viral_hooks FOR DELETE USING (true);

CREATE TRIGGER update_viral_hooks_updated_at
BEFORE UPDATE ON public.viral_hooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_viral_hooks_niche ON public.viral_hooks(niche);
CREATE INDEX idx_viral_hooks_format ON public.viral_hooks(format);
CREATE INDEX idx_viral_hooks_favorite ON public.viral_hooks(is_favorite);

-- Seed initial library of proven viral hooks
INSERT INTO public.viral_hooks (hook, niche, format, tags, performance, source) VALUES
('Você está fazendo isso errado e nem sabia', 'geral', 'reel', ARRAY['choque','curiosidade'], 'alto', 'biblioteca padrão'),
('Ninguém te conta isso sobre [TEMA]', 'geral', 'reel', ARRAY['segredo','curiosidade'], 'alto', 'biblioteca padrão'),
('3 erros que estão travando seu crescimento', 'marketing', 'reel', ARRAY['lista','dor'], 'alto', 'biblioteca padrão'),
('Eu testei por 30 dias e o resultado foi…', 'lifestyle', 'reel', ARRAY['prova','transformação'], 'alto', 'biblioteca padrão'),
('Se você tem menos de 1000 seguidores, faça isso', 'marketing', 'reel', ARRAY['nicho','tática'], 'alto', 'biblioteca padrão'),
('Pare de fazer [X] se você quer [Y]', 'geral', 'reel', ARRAY['choque','ordem'], 'alto', 'biblioteca padrão'),
('O segredo dos perfis que crescem rápido', 'marketing', 'reel', ARRAY['segredo'], 'medio', 'biblioteca padrão'),
('Como eu fui de 0 a 10k em [TEMPO]', 'marketing', 'carrossel', ARRAY['história','prova'], 'alto', 'biblioteca padrão'),
('Salve isso antes que o Instagram apague', 'geral', 'reel', ARRAY['urgência','salvamento'], 'alto', 'biblioteca padrão'),
('A verdade sobre [TEMA] que ninguém posta', 'geral', 'reel', ARRAY['verdade','polêmica'], 'alto', 'biblioteca padrão'),
('Faça isso por 7 dias e veja o que acontece', 'lifestyle', 'reel', ARRAY['desafio'], 'alto', 'biblioteca padrão'),
('POV: você descobriu o atalho para [META]', 'geral', 'reel', ARRAY['pov','atalho'], 'medio', 'biblioteca padrão'),
('Top 5 ferramentas grátis para [TEMA]', 'tecnologia', 'carrossel', ARRAY['lista','ferramentas'], 'alto', 'biblioteca padrão'),
('Eu economizei R$ [VALOR] usando isso', 'finanças', 'reel', ARRAY['economia','prova'], 'alto', 'biblioteca padrão'),
('Receita de [PRATO] em 3 ingredientes', 'gastronomia', 'reel', ARRAY['receita','rápido'], 'alto', 'biblioteca padrão'),
('Treino de 5 minutos que substitui 1 hora', 'fitness', 'reel', ARRAY['treino','rápido'], 'alto', 'biblioteca padrão'),
('Por que ninguém comenta nos seus posts', 'marketing', 'reel', ARRAY['dor','diagnóstico'], 'alto', 'biblioteca padrão'),
('A pergunta que mudou meu negócio', 'empreendedorismo', 'reel', ARRAY['história','reflexão'], 'medio', 'biblioteca padrão'),
('Isso aqui vale mais que um curso de R$ 2000', 'educação', 'carrossel', ARRAY['valor','choque'], 'alto', 'biblioteca padrão'),
('Antes de dormir, faça isso por 2 minutos', 'lifestyle', 'reel', ARRAY['hábito','rotina'], 'medio', 'biblioteca padrão');
