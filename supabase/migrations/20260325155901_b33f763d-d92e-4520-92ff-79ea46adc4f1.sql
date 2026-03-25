
-- Allow admins to read all booked meetings
CREATE POLICY "Admins can view all booked meetings"
ON public.booked_meetings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
