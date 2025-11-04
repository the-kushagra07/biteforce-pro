-- Create therapy plans table
CREATE TABLE public.therapy_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  goal_force text,
  reps_per_day integer,
  hold_time integer,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.therapy_plans ENABLE ROW LEVEL SECURITY;

-- Doctors can view therapy plans for their patients
CREATE POLICY "Doctors can view their patients' therapy plans"
ON public.therapy_plans
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'doctor'::app_role)
  AND doctor_id = auth.uid()
);

-- Doctors can create therapy plans for their patients
CREATE POLICY "Doctors can create therapy plans"
ON public.therapy_plans
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'doctor'::app_role)
  AND doctor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = therapy_plans.patient_id
    AND patients.doctor_id = auth.uid()
  )
);

-- Doctors can update therapy plans for their patients
CREATE POLICY "Doctors can update their patients' therapy plans"
ON public.therapy_plans
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'doctor'::app_role)
  AND doctor_id = auth.uid()
);

-- Patients can view their own therapy plan
CREATE POLICY "Patients can view their therapy plan"
ON public.therapy_plans
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'patient'::app_role)
  AND EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = therapy_plans.patient_id
    AND patients.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_therapy_plans_updated_at
BEFORE UPDATE ON public.therapy_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();