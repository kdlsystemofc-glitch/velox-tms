-- ============================================================
-- VELOX TMS — Transferências (Tr-1): estorno + sincronização de frota
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- 1) cancel_transfer: estorna a transferência (devolve cada pedido ao status
--    anterior) e libera o caminhão — tudo numa transação só.
-- 2) receive_transfer: além de receber, agora LIBERA o caminhão (available).

-- ── Estornar transferência (atômico) ──────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_transfer(
  p_transfer_id UUID,
  p_order_status JSONB,   -- [{id, status}] status para o qual cada pedido volta
  p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr transfers%ROWTYPE; row JSONB; v_oid UUID; v_st TEXT;
BEGIN
  SELECT * INTO tr FROM transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência % não encontrada', p_transfer_id; END IF;
  IF tr.status = 'received' THEN RAISE EXCEPTION 'Transferência já recebida não pode ser estornada'; END IF;
  IF tr.status = 'cancelled' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;

  UPDATE transfers SET status='cancelled',
    events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','cancelled',
      'description','Transferência estornada','timestamp',now(),'user',p_user)
  WHERE id = p_transfer_id;

  -- Devolve cada pedido ao status anterior informado pelo app
  FOR row IN SELECT * FROM jsonb_array_elements(COALESCE(p_order_status,'[]'::jsonb)) LOOP
    v_oid := (row->>'id')::uuid;
    v_st  := COALESCE(NULLIF(row->>'status',''), 'confirmed');
    UPDATE orders SET status = v_st,
      status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
        'status', v_st,'timestamp',now(),'user',p_user,'note','Transferência estornada — pedido devolvido')
    WHERE id = v_oid AND status = 'in_transfer';
  END LOOP;

  -- Libera o caminhão da transferência
  IF tr.truck_id IS NOT NULL THEN
    UPDATE trucks SET status='available' WHERE id = tr.truck_id AND status='on_route';
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── Receber no destino (agora também libera o caminhão) ────────
CREATE OR REPLACE FUNCTION public.receive_transfer(
  p_transfer_id UUID, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr transfers%ROWTYPE; b branches%ROWTYPE;
BEGIN
  SELECT * INTO tr FROM transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência % não encontrada', p_transfer_id; END IF;
  SELECT * INTO b FROM branches WHERE id = tr.to_branch_id;

  UPDATE transfers SET status='received', arrival_date=now(),
    events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','received',
      'description','Recebido em '||COALESCE(b.name,'destino'),'timestamp',now(),'user',p_user)
  WHERE id = p_transfer_id;

  UPDATE orders o SET
    current_branch_id = tr.to_branch_id, status='confirmed',
    trip_id = NULL, scheduled_truck_id = NULL, scheduled_date = NULL,
    origin = CASE WHEN b.address IS NOT NULL AND b.address <> '{}'::jsonb THEN b.address ELSE o.origin END,
    status_history = COALESCE(o.status_history,'[]'::jsonb) || jsonb_build_object(
      'status','confirmed','timestamp',now(),'user',p_user,
      'note','Recebido em '||COALESCE(b.name,'destino')||' — disponível para nova rota (cross-docking)')
  WHERE o.id::text IN (SELECT jsonb_array_elements_text(tr.order_ids));

  -- Tr-1: libera o caminhão ao receber
  IF tr.truck_id IS NOT NULL THEN
    UPDATE trucks SET status='available' WHERE id = tr.truck_id AND status='on_route';
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.cancel_transfer(UUID,JSONB,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_transfer(UUID,TEXT) TO authenticated;

SELECT 'Transferências Tr-1: estorno + sincronização de frota prontos.' AS resultado;
