CREATE TABLE public.pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id uuid NOT NULL,
  modelo_nome text NOT NULL DEFAULT '',
  minutos integer NOT NULL,
  valor numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_provedor text NOT NULL DEFAULT '',
  provedor text NOT NULL DEFAULT 'syncpay',
  identificador text,
  pix_code text NOT NULL DEFAULT '',
  cliente_nome text NOT NULL DEFAULT '',
  cliente_email text NOT NULL DEFAULT '',
  cliente_telefone text NOT NULL DEFAULT '',
  cliente_rotulo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  saldo_creditado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz
);

CREATE UNIQUE INDEX pagamentos_provedor_identificador_key
  ON public.pagamentos (provedor, identificador)
  WHERE identificador IS NOT NULL;
CREATE INDEX pagamentos_criado_em_idx ON public.pagamentos (criado_em DESC);

GRANT SELECT ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Cada um ve suas permissoes" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins veem pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pagamentos_atualizado_em
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();