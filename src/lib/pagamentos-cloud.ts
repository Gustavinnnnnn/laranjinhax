import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PagamentoLinha = {
  id: string;
  modelo_id: string;
  modelo_nome: string;
  minutos: number;
  valor: number | string;
  status: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_rotulo: string;
  criado_em: string;
  pago_em: string | null;
};

export type Pagamento = {
  id: string;
  modeloId: string;
  modeloNome: string;
  minutos: number;
  valor: number;
  status: string;
  pago: boolean;
  cliente: string;
  clienteEmail: string;
  criadoEm: string;
  pagoEm: string | null;
};

const paraPagamento = (r: PagamentoLinha): Pagamento => ({
  id: r.id,
  modeloId: r.modelo_id,
  modeloNome: r.modelo_nome,
  minutos: r.minutos,
  valor: Number(r.valor),
  status: r.status,
  pago: r.status === "completed",
  cliente: r.cliente_nome || r.cliente_rotulo || "Cliente",
  clienteEmail: r.cliente_email,
  criadoEm: r.criado_em,
  pagoEm: r.pago_em,
});

export async function listarPagamentos(): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select(
      "id, modelo_id, modelo_nome, minutos, valor, status, cliente_nome, cliente_email, cliente_rotulo, criado_em, pago_em",
    )
    .order("criado_em", { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as PagamentoLinha[]).map(paraPagamento);
}

/** Carrega os pagamentos reais para as telas do painel. */
export function usePagamentos() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    const buscar = () =>
      listarPagamentos()
        .then((lista) => {
          if (ativo) setPagamentos(lista);
        })
        .catch(() => {})
        .finally(() => {
          if (ativo) setCarregando(false);
        });
    void buscar();
    const intervalo = window.setInterval(() => void buscar(), 20000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  return { pagamentos, carregando };
}
