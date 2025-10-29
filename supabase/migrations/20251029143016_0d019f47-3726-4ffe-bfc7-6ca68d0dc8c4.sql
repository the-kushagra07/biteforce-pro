-- Fix RLS so users can set their role once
DROP POLICY IF EXISTS "Only system can manage roles" ON public.user_roles;

CREATE POLICY "Users can set their own role once"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
);
