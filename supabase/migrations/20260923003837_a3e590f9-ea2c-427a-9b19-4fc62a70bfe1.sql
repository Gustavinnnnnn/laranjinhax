CREATE POLICY "modelos_read" ON storage.objects FOR SELECT USING (bucket_id = 'modelos');
CREATE POLICY "modelos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'modelos');
CREATE POLICY "modelos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'modelos') WITH CHECK (bucket_id = 'modelos');
CREATE POLICY "modelos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'modelos');