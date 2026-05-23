
-- 1) DELETE policy on activity_logs (CEO only)
CREATE POLICY "CEO delete activity logs"
ON public.activity_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'CEO'::public.app_role));

-- 2) api_credential_logs: documented + explicit (already covered by CEO ALL policy; nothing else can insert)
COMMENT ON TABLE public.api_credential_logs IS
  'Writes are CEO-only via server functions using the service role. Regular users have no INSERT/UPDATE/DELETE access.';

-- 3) Lock down SECURITY DEFINER functions from direct API access.
-- They remain callable from within RLS policies / triggers because Postgres
-- still resolves them by owner; only direct PostgREST execution is blocked.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_project_stats(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
