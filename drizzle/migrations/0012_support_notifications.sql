CREATE TABLE public.support_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_name text NOT NULL,
  missed_days integer NOT NULL,
  support_token uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz
);
CREATE INDEX support_notifications_recipient_idx ON public.support_notifications (recipient_id, created_at DESC);
GRANT SELECT ON public.support_notifications TO authenticated;
GRANT UPDATE (read_at, dismissed_at) ON public.support_notifications TO authenticated;
GRANT ALL ON public.support_notifications TO service_role;
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.support_notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "own notifications mark" ON public.support_notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_notifications;