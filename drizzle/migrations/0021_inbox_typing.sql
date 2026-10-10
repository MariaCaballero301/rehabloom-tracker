CREATE TABLE public.inbox_typing (
  sender_id uuid PRIMARY KEY,
  recipient_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
GRANT SELECT ON public.inbox_typing TO authenticated;
GRANT ALL ON public.inbox_typing TO service_role;
ALTER TABLE public.inbox_typing ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.can_read_inbox_typing(p_sender uuid, p_recipient uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = p_recipient AND public.network_are_connected(p_sender, p_recipient);
$$;
REVOKE ALL ON FUNCTION public.can_read_inbox_typing(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_inbox_typing(uuid, uuid) TO authenticated;
CREATE POLICY "recipient sees connected typing" ON public.inbox_typing FOR SELECT TO authenticated
USING (public.can_read_inbox_typing(sender_id, recipient_id));
CREATE FUNCTION public.set_inbox_typing(p_to uuid, p_typing boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  IF p_to IS NULL OR p_to = me OR NOT public.network_are_connected(me, p_to) THEN RETURN; END IF;
  IF NOT p_typing THEN
    UPDATE public.inbox_typing SET expires_at = now() WHERE sender_id = me AND recipient_id = p_to;
    RETURN;
  END IF;
  INSERT INTO public.inbox_typing(sender_id, recipient_id, expires_at)
  VALUES (me, p_to, now() + interval '6 seconds')
  ON CONFLICT(sender_id) DO UPDATE SET recipient_id = EXCLUDED.recipient_id, expires_at = EXCLUDED.expires_at;
END $$;
REVOKE ALL ON FUNCTION public.set_inbox_typing(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_inbox_typing(uuid, boolean) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_typing;