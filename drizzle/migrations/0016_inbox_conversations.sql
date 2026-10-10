ALTER TABLE public.connection_requests ADD COLUMN read_at timestamptz;
GRANT UPDATE (read_at) ON public.connection_requests TO authenticated;
CREATE POLICY "recipient reads connection request" ON public.connection_requests FOR UPDATE TO authenticated USING (auth.uid() = to_user) WITH CHECK (auth.uid() = to_user);
CREATE INDEX encouragements_conversation_history ON public.encouragements (from_user, to_user, created_at DESC);
CREATE FUNCTION public.inbox_channels() RETURNS TABLE(user_id uuid, name text, kind text, can_message boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH connections AS (
 SELECT c.connected_user_id AS other_id, c.kind FROM public.support_contacts c WHERE c.user_id = auth.uid() AND c.connected_user_id IS NOT NULL
 UNION SELECT c.user_id AS other_id, c.kind FROM public.support_contacts c WHERE c.connected_user_id = auth.uid()
 ), people AS (
 SELECT other_id FROM connections
 UNION SELECT CASE WHEN e.from_user = auth.uid() THEN e.to_user ELSE e.from_user END FROM public.encouragements e WHERE auth.uid() IN (e.from_user, e.to_user)
 )
 SELECT p.other_id, public.network_display_name(p.other_id), COALESCE((SELECT c.kind FROM connections c WHERE c.other_id = p.other_id LIMIT 1), 'friend'), EXISTS (SELECT 1 FROM connections c WHERE c.other_id = p.other_id)
 FROM people p WHERE auth.uid() IS NOT NULL AND NOT public.network_is_blocked(auth.uid(), p.other_id)
 ORDER BY lower(public.network_display_name(p.other_id));
$$;
REVOKE ALL ON FUNCTION public.inbox_channels() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inbox_channels() TO authenticated, service_role;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'encouragements') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.encouragements; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'connection_requests') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests; END IF;
END $$;