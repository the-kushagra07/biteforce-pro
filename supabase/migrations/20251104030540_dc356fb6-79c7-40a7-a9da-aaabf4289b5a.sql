-- Allow patients to link their account to a patient record
-- Only if the record has no user_id yet and they provide matching patient_id and name
CREATE POLICY "Patients can link their account"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  user_id IS NULL 
  AND has_role(auth.uid(), 'patient'::app_role)
)
WITH CHECK (
  user_id = auth.uid()
  AND has_role(auth.uid(), 'patient'::app_role)
);