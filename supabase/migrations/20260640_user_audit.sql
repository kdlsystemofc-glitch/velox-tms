-- ============================================================
-- VELOX TMS — Usuários (Usr-3): log de auditoria das ações de admin
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_email TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_audit" ON user_audit_log;
CREATE POLICY "admins_read_audit" ON user_audit_log FOR SELECT TO authenticated USING (public.is_admin());

-- Registra uma ação (carimba o autor a partir do auth.uid). Só admins.
CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_action TEXT, p_target_email TEXT, p_detail TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.user_audit_log (actor_id, actor_email, action, target_email, detail)
  VALUES (auth.uid(), v_email, p_action, NULLIF(p_target_email,''), NULLIF(p_detail,''));
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_log_action(TEXT,TEXT,TEXT) TO authenticated;

SELECT 'Usuários Usr-3: log de auditoria pronto.' AS resultado;
