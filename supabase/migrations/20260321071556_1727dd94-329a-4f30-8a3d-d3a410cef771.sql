INSERT INTO storage.buckets (id, name, public) VALUES ('agency-assets', 'agency-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view agency assets" ON storage.objects FOR SELECT USING (bucket_id = 'agency-assets');
CREATE POLICY "Authenticated users upload agency assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agency-assets');
CREATE POLICY "Authenticated users update agency assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'agency-assets');
