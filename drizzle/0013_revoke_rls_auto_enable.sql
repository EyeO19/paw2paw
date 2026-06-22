-- Supabase platform helper; not intended for client RPC calls.
REVOKE EXECUTE ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "public"."rls_auto_enable"() FROM anon;
REVOKE EXECUTE ON FUNCTION "public"."rls_auto_enable"() FROM authenticated;
