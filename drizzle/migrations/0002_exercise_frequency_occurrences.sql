ALTER TABLE public.exercises
  ADD COLUMN frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily','weekly')),
  ADD COLUMN occurrences integer NOT NULL DEFAULT 1 CHECK (occurrences BETWEEN 1 AND 10),
  ADD COLUMN cooldown_minutes integer NOT NULL DEFAULT 0 CHECK (cooldown_minutes >= 0),
  ADD COLUMN gap_days integer NOT NULL DEFAULT 0 CHECK (gap_days >= 0);
ALTER TABLE public.completions ADD COLUMN occurrence integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX completions_exercise_day_occurrence_key ON public.completions (exercise_id, day, occurrence);
ALTER TABLE public.completions ADD CONSTRAINT completions_exercise_day_occurrence_uniq UNIQUE USING INDEX completions_exercise_day_occurrence_key;
ALTER TABLE public.completions DROP CONSTRAINT IF EXISTS completions_exercise_id_day_key;