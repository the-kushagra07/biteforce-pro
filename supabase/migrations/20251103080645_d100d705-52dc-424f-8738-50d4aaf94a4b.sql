-- Add DELETE policy for measurements table
CREATE POLICY "Doctors can delete measurements of their patients"
ON public.measurements
FOR DELETE
USING (
  has_role(auth.uid(), 'doctor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = measurements.patient_id 
    AND patients.doctor_id = auth.uid()
  )
);

-- Create storage bucket for doctor licenses
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-licenses', 'doctor-licenses', false);

-- Storage policies for doctor licenses
CREATE POLICY "Doctors can upload their own license"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Doctors can view their own license"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'doctor-licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create doctor_verifications table
CREATE TABLE public.doctor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_name text,
  license_number text,
  license_image_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.doctor_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for doctor_verifications
CREATE POLICY "Doctors can view their own verification"
ON public.doctor_verifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Doctors can insert their own verification"
ON public.doctor_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can update their own pending verification"
ON public.doctor_verifications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_doctor_verifications_updated_at
  BEFORE UPDATE ON public.doctor_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();