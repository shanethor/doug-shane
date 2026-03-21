
-- Allow anyone to read agencies (needed for signup search)
CREATE POLICY "Anyone can read agencies" ON public.agencies FOR SELECT USING (true);

-- Allow authenticated admins to insert/update/delete agencies
CREATE POLICY "Admins can manage agencies" ON public.agencies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
