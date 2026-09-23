CREATE TABLE public.pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id uuid NOT NULL,
  modelo_nome text NOT NULL DEFAULT '',
  minutos integer NOT NULL,
  valor numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  provedor text NOT NULL DEFAULT 'syncpay',
  identificador text,
  pix_code text NOT NULL DEFAULT '',
  cliente_nome text NOT NULL DEFAULT '',
  cliente_email text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz
);

CREATE INDEX pagamentos_identificador_idx ON public.pagamentos (identificador);
CREATE INDEX pagamentos_criado_em_idx ON public.pagamentos (criado_em DESC);

GRANT SELECT ON public.pagamentos TO anon;
GRANT SELECT ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pagamentos podem ser consultados" ON public.pagamentos FOR SELECT TO anon, authenticated USING (true);