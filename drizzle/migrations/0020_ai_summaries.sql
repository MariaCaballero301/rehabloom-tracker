CREATE TABLE public.ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  month text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  model text NOT NULL,
  summary text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_summaries TO authenticated;
GRANT ALL ON public.ai_summaries TO service_role;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai summaries read" ON public.ai_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai summaries add" ON public.ai_summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai summaries remove" ON public.ai_summaries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ai_summaries_user_created ON public.ai_summaries (user_id, created_at DESC);