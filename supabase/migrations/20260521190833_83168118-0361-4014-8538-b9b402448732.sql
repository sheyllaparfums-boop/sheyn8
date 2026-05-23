-- Add summary column
ALTER TABLE public.custom_pages ADD COLUMN summary TEXT;

-- Update 'Quem Somos' with a summary
UPDATE public.custom_pages 
SET summary = 'SHEY N8N é a maior plataforma de automação e inteligência para Instagram do Brasil, focada em transformar perfis comuns em máquinas de vendas e engajamento.'
WHERE slug = 'quem-somos';