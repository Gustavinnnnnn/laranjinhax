// Regras de depósito PIX: criação, consulta e liberação única do crédito.
import { consultarTransacao, criarCobrancaPix, ErroSyncPay, type StatusSyncPay } from "@/lib/syncpay.server";

export type StatusInterno = StatusSyncPay;

export type Pagamento = {
  id: string;
  modelo_id: string;
  modelo_nome: string;
  minutos: number;
  valor: number;
  status: string;
  status_provedor: string;
  identificador: string | null;
  pix_code: string;
  saldo_creditado: boolean;
  pago_em: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const soDigitos = (v: string) => v.replace(/\D/g, "");

export function validarCliente(cliente: { nome: string; cpf: string; email: string; telefone: string }) {
  const nome = cliente.nome.trim();
  const cpf = soDigitos(cliente.cpf);
  const email = cliente.email.trim().toLowerCase();
  const telefone = soDigitos(cliente.telefone);

  if (nome.length < 3) return { erro: "Informe seu nome completo." } as const;
  if (cpf.length !== 11) return { erro: "O CPF precisa ter 11 dígitos." } as const;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { erro: "Informe um e-mail válido." } as const;
  if (telefone.length < 10 || telefone.length > 11) return { erro: "Informe um telefone com DDD." } as const;
  return { cliente: { nome, cpf, email, telefone } } as const;
}

export async function criarDeposito(input: {
  modeloId: string;
  minutos: number;
  cliente: { nome: string; cpf: string; email: string; telefone: string };
  clienteRotulo: string;
  origem: string;
}) {
  const db = await admin();

  const { data: modelo, error: erroModelo } = await db
    .from("modelos")
    .select("id, nome, preco_por_minuto, duracoes")
    .eq("id", input.modeloId)
    .maybeSingle();
  if (erroModelo || !modelo) throw new ErroSyncPay(404, "Perfil não encontrado.");

  const duracoes = (modelo.duracoes as number[] | null) ?? [];
  const minutos = Math.round(input.minutos);
  if (!Number.isFinite(minutos) || minutos <= 0 || (duracoes.length > 0 && !duracoes.includes(minutos))) {
    throw new ErroSyncPay(422, "Duração inválida.");
  }

  // O valor é sempre calculado no servidor, nunca aceito do navegador.
  const valor = Number((Number(modelo.preco_por_minuto) * minutos).toFixed(2));
  if (!Number.isFinite(valor) || valor < 1) throw new ErroSyncPay(422, "O valor mínimo é R$ 1,00.");

  const validado = validarCliente(input.cliente);
  if ("erro" in validado) throw new ErroSyncPay(422, validado.erro);

  const descricao = `Chamada de ${minutos} min com ${modelo.nome}`;
  const cobranca = await criarCobrancaPix({
    valor,
    descricao,
    webhookUrl: `${input.origem.replace(/\/$/, "")}/api/public/syncpay/webhook`,
    cliente: validado.cliente,
  });

  const { data: pagamento, error } = await db
    .from("pagamentos")
    .insert({
      modelo_id: modelo.id,
      modelo_nome: modelo.nome,
      minutos,
      valor,
      status: "pending",
      status_provedor: "pending",
      provedor: "syncpay",
      identificador: cobranca.identificador,
      pix_code: cobranca.pixCode,
      cliente_nome: validado.cliente.nome,
      cliente_email: validado.cliente.email,
      cliente_telefone: validado.cliente.telefone,
      cliente_rotulo: input.clienteRotulo.slice(0, 60),
      descricao,
    })
    .select("id, valor, status, pix_code, identificador, minutos")
    .single();
  if (error || !pagamento) {
    console.error("[deposito] falha ao salvar", error?.message);
    throw new ErroSyncPay(500, "Não foi possível registrar o depósito.");
  }

  console.info("[deposito] criado", pagamento.id, cobranca.identificador, valor);
  return {
    depositId: pagamento.id as string,
    identifier: cobranca.identificador,
    amount: valor,
    pixCode: cobranca.pixCode,
    status: "pending" as StatusInterno,
    minutos,
  };
}

/** Aplica o status da SyncPay no depósito, creditando no máximo uma vez. */
export async function aplicarStatus(pagamentoId: string, status: StatusSyncPay) {
  const db = await admin();
  const { data: atual } = await db
    .from("pagamentos")
    .select("id, status, saldo_creditado, valor, pago_em")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!atual) return null;

  if (status === "completed") {
    if (atual.saldo_creditado) {
      console.info("[deposito] já creditado, ignorando", pagamentoId);
      return atual;
    }
    // Atualização condicional: só o primeiro processamento credita.
    const { data: creditado } = await db
      .from("pagamentos")
      .update({
        status: "completed",
        status_provedor: status,
        saldo_creditado: true,
        pago_em: new Date().toISOString(),
      })
      .eq("id", pagamentoId)
      .eq("saldo_creditado", false)
      .select("id, status, saldo_creditado, valor, pago_em")
      .maybeSingle();
    if (creditado) console.info("[deposito] crédito liberado", pagamentoId, creditado.valor);
    return creditado ?? atual;
  }

  const { data } = await db
    .from("pagamentos")
    .update({ status, status_provedor: status })
    .eq("id", pagamentoId)
    .eq("saldo_creditado", false)
    .select("id, status, saldo_creditado, valor, pago_em")
    .maybeSingle();
  return data ?? atual;
}

export async function statusDoDeposito(pagamentoId: string) {
  const db = await admin();
  const { data } = await db
    .from("pagamentos")
    .select("id, valor, minutos, status, saldo_creditado, identificador, pago_em")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!data) return null;

  let atual = data;
  // Rede de segurança: enquanto pendente, confirma direto na SyncPay.
  if (atual.status === "pending" && atual.identificador) {
    try {
      const transacao = await consultarTransacao(atual.identificador);
      if (transacao.status !== "pending") {
        const aplicado = await aplicarStatus(atual.id, transacao.status);
        if (aplicado) atual = { ...atual, ...aplicado };
      }
    } catch (erro) {
      console.error("[deposito] consulta de status falhou", (erro as Error).message);
    }
  }

  return {
    depositId: atual.id as string,
    amount: Number(atual.valor),
    minutos: atual.minutos as number,
    status: atual.status as StatusInterno,
    creditado: Boolean(atual.saldo_creditado),
    paidAt: atual.pago_em as string | null,
  };
}

export async function pagamentoPorIdentificador(identificador: string) {
  const db = await admin();
  const { data } = await db
    .from("pagamentos")
    .select("id, status, saldo_creditado, identificador")
    .eq("provedor", "syncpay")
    .eq("identificador", identificador)
    .maybeSingle();
  return data;
}
