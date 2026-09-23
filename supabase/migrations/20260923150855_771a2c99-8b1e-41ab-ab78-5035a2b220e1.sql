CREATE TABLE public.modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  idade integer NOT NULL DEFAULT 18,
  online boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  descricao text NOT NULL DEFAULT '',
  foto text NOT NULL DEFAULT '',
  preco_por_minuto numeric NOT NULL DEFAULT 0,
  duracoes integer[] NOT NULL DEFAULT '{5,10,15,30}',
  video_chamada_url text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos TO authenticated;
GRANT ALL ON public.modelos TO service_role;

ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis visiveis para todos" ON public.modelos FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode criar perfis" ON public.modelos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer um pode editar perfis" ON public.modelos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Qualquer um pode remover perfis" ON public.modelos FOR DELETE USING (true);

ALTER TABLE public.modelos ADD COLUMN IF NOT EXISTS foto_fundo_chat text NOT NULL DEFAULT '';