
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  reps text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  days int[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, day)
);
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  day date NOT NULL,
  pain int NOT NULL CHECK (pain BETWEEN 0 AND 10),
  motivation int NOT NULL CHECK (motivation BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'normal' CHECK (status IN ('normal','unable','rest')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
CREATE TABLE public.preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  partner_email text NOT NULL DEFAULT '',
  reminder_time time NOT NULL DEFAULT '09:00',
  reminders_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises, public.completions, public.checkins, public.preferences TO authenticated;
GRANT ALL ON public.exercises, public.completions, public.checkins, public.preferences TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercises" ON public.exercises FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own completions" ON public.completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checkins" ON public.checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own preferences" ON public.preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
