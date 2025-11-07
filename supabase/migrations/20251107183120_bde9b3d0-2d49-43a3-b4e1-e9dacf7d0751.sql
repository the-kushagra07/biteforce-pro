-- Update therapy_plans table to match exact specification
ALTER TABLE public.therapy_plans 
  DROP COLUMN IF EXISTS reps_per_day,
  DROP COLUMN IF EXISTS hold_time;

ALTER TABLE public.therapy_plans
  ADD COLUMN reps_per_session integer,
  ADD COLUMN sessions_per_day integer;