REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE ALL ON FUNCTION public.tocar_atualizado_em() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tocar_atualizado_em() FROM anon;
REVOKE ALL ON FUNCTION public.tocar_atualizado_em() FROM authenticated;