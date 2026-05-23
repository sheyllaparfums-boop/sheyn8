# Plano: Auth Supabase real + correção de todas as falhas de segurança

## Escopo
Substituir o "auth" local (zustand) por autenticação Supabase real, criar tabela `profiles` + sistema de roles, apagar dados existentes, e aplicar RLS scoped por `auth.uid()` em todas as tabelas. Login: email/senha + Google.

## 1. Migração de banco (uma migration)
- Criar enum `app_role` ('CEO', 'USER')
- Criar tabela `profiles` (user_id FK auth.users, name, handle, niche, goal, avatar, plan, trial_ends_at, onboarding_completed)
- Criar tabela `user_roles` (user_id, role) + função `has_role(_user_id, _role)` SECURITY DEFINER
- Trigger `handle_new_user` em auth.users: cria profile + atribui role CEO se email = Sheyllaparfum@gmail.com (case-insensitive), senão USER + plan TRIAL
- Adicionar coluna `user_id uuid NOT NULL` em: carousels, content_calendar, competitor_analyses, reel_transcriptions, viral_hooks, activity_logs
- **Apagar todos os registros** dessas 6 tabelas
- Remover TODAS as policies "public *" existentes
- Criar policies novas (SELECT/INSERT/UPDATE/DELETE) com `auth.uid() = user_id` + bypass CEO via `has_role`
- `custom_pages`: trocar policy admin para `has_role(auth.uid(), 'CEO')`
- `api_credentials`: adicionar policy ALL apenas para CEO
- `mentorship_videos`: mantém read público (conteúdo curado)
- Corrigir `update_updated_at_column` com `SET search_path = public`
- Adicionar trigger `updated_at` nas tabelas que faltam

## 2. Configurar Google OAuth
- Chamar `configure_social_auth` com `providers: ["google"]`

## 3. Refatorar auth no app
- `src/lib/auth-store.ts`: remover login/logout fake, virar cache do user Supabase + profile carregado
- `src/integrations/supabase/auth-attacher.ts` já existe — garantir registrado em `src/start.ts`
- `src/routes/login.tsx`: form email/senha (signup + login) + botão Google via `lovable.auth.signInWithOAuth`
- Listener `onAuthStateChange` no `__root.tsx` para hidratar/limpar user + invalidar queries
- Criar rota layout `src/routes/_authenticated.tsx` com `beforeLoad` redirecionando para `/login`
- Mover rotas protegidas para sob `_authenticated/` (carrossel, calendário, concorrente, transcrição, ganchos, execucoes, projetos, user, configuracoes, admin, etc.)
- `admin` exige role CEO via `has_role`

## 4. Atualizar server functions
- Trocar todas as inserts/updates em `*.functions.ts` que usam `supabase` direto:
  - Usar middleware `requireSupabaseAuth` 
  - Setar `user_id: context.userId` em inserts
  - Remover/ignorar campos `user_email`/`user_name` legados (ou preencher a partir do profile)
- Arquivos afetados: carousel, calendar, competitor, reel-transcription, viral-generators, alerts/historico, activity-logger

## 5. Atualizar componentes que leem o user
- Onboarding salva em `profiles` (não mais em zustand persisted)
- ProfileCard, Header, OnboardingTour: ler de hook que retorna user Supabase + profile

## 6. Limpar findings
- Marcar findings RLS como fixed
- Manter aviso sobre `extension_in_public` (pgmq/pg_trgm são esperados) — ignorar com nota
- Atualizar security memory

## Riscos
- App vai exigir login a partir de agora — qualquer usuário antigo (zustand local) precisa criar conta nova
- Todos os dados de carrosséis/calendário/transcrições serão **apagados**
- Vou tentar não quebrar nada visual, mas o fluxo de entrada muda

## Detalhes técnicos
- Triggers usam `SECURITY DEFINER SET search_path = public`
- Roles armazenadas em tabela separada (nunca em profiles) — padrão Lovable
- Google OAuth via broker `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- `redirect_uri` no signup com `emailRedirectTo: window.location.origin`

Aprova pra eu executar?
