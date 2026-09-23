DROP POLICY IF EXISTS "Qualquer um pode remover perfis" ON public.modelos;
DROP POLICY IF EXISTS "Qualquer um pode editar perfis" ON public.modelos;
DROP POLICY IF EXISTS "Qualquer um pode criar perfis" ON public.modelos;
DROP POLICY IF EXISTS "Perfis visiveis para todos" ON public.modelos;

CREATE POLICY "Perfis ativos visiveis para todos"
ON public.modelos
FOR SELECT
TO anon, authenticated
USING (ativo = true OR public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins criam perfis"
ON public.modelos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins editam perfis"
ON public.modelos
FOR UPDATE
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins removem perfis"
ON public.modelos
FOR DELETE
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "modelos_read" ON storage.objects;
DROP POLICY IF EXISTS "modelos_insert" ON storage.objects;
DROP POLICY IF EXISTS "modelos_update" ON storage.objects;
DROP POLICY IF EXISTS "modelos_delete" ON storage.objects;

CREATE POLICY "Arquivos publicados de modelos podem ser lidos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'modelos'
  AND (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.modelos m
      WHERE m.ativo = true
        AND (
          m.foto = 'storage:' || storage.objects.name
          OR m.foto_fundo_chat = 'storage:' || storage.objects.name
          OR m.video_chamada_url = 'storage:' || storage.objects.name
        )
    )
  )
);

CREATE POLICY "Admins enviam arquivos de modelos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'modelos'
  AND public.has_role((SELECT auth.uid()), 'admin')
  AND owner_id = (SELECT auth.uid()::text)
);

CREATE POLICY "Admins substituem seus arquivos de modelos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'modelos'
  AND public.has_role((SELECT auth.uid()), 'admin')
  AND owner_id = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'modelos'
  AND public.has_role((SELECT auth.uid()), 'admin')
  AND owner_id = (SELECT auth.uid()::text)
);

CREATE POLICY "Admins apagam seus arquivos de modelos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'modelos'
  AND public.has_role((SELECT auth.uid()), 'admin')
  AND owner_id = (SELECT auth.uid()::text)
);