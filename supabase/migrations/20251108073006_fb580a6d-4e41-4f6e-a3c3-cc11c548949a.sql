-- Update patients table to include email, dob, and phone fields for proper onboarding
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS phone text;

-- Add unique constraint on email to prevent duplicates
ALTER TABLE public.patients 
ADD CONSTRAINT unique_patient_email UNIQUE (email);

-- Update doctor_verifications table to include new mandatory fields
ALTER TABLE public.doctor_verifications
ADD COLUMN IF NOT EXISTS clinic_name text,
ADD COLUMN IF NOT EXISTS practice_address text,
ADD COLUMN IF NOT EXISTS issuing_board text;

-- Make sure the fields are properly structured
ALTER TABLE public.doctor_verifications
ALTER COLUMN doctor_name SET NOT NULL,
ALTER COLUMN license_number SET NOT NULL,
ALTER COLUMN license_image_url SET NOT NULL;