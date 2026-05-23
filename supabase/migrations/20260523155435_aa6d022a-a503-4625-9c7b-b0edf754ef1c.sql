GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_project_stats(uuid) TO authenticated;