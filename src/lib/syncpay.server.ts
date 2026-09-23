// Comunicação server-side com a SyncPay. Nunca importar em código de navegador.
const BASE_URL = "https://api.syncpayments.com.br";
const API = `${BASE_URL}/api/partner/v1`;

export type StatusSyncPay = "pending" | "completed" | "failed" | "refunded" | "med";

type TokenCache = { token: string; exp: number };
let cache: TokenCache | null = null;

const mascarar = (valor: string) => (valor.length > 8 ? `${valor.slice(0, 4)}…${valor.slice(-2)}` : "***");

export class ErroSyncPay extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
    this.name = "ErroSyncPay";
  }
}

/** Reaproveita o token enquanto válido; só pede outro quando necessário. */
export async function getSyncPayAccessToken(forcar = false): Promise<string> {
  if (!forcar && cache && cache.exp > Date.now()) return cache.token;

  const clientId = process.env["SYNCPAY_CLIENT_ID"];
  const clientSecret = process.env["SYNCPAY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new ErroSyncPay(500, "SyncPay não configurado");

  const res = await fetch(`${API}/auth-token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[syncpay] auth-token falhou", res.status);
    throw new ErroSyncPay(res.status, "Não foi possível autenticar na SyncPay");
  }
  const token =
    (body["access_token"] as string | undefined) ??
    (body["token"] as string | undefined) ??
    ((body["data"] as Record<string, unknown> | undefined)?.["access_token"] as string | undefined);
  if (!token) throw new ErroSyncPay(502, "Resposta de autenticação inesperada da SyncPay");

  const expiresIn = Number(body["expires_in"] ?? 3600);
  cache = { token, exp: Date.now() + (expiresIn > 120 ? expiresIn - 120 : 240) * 1000 };
  console.info("[syncpay] token obtido", mascarar(token));
  return token;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chama a API cuidando de token expirado (401) e rate limit (429). */
async function chamar(
  caminho: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<Record<string, unknown>> {
  let tentativa = 0;
  let forcarToken = false;

  for (;;) {
    tentativa += 1;
    const token = await getSyncPayAccessToken(forcarToken);
    const res = await fetch(`${API}${caminho}`, {
      method: init.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

    if (res.status === 401 && tentativa === 1) {
      forcarToken = true;
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && tentativa <= 3) {
      await esperar(tentativa * 800);
      continue;
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      console.error("[syncpay] erro HTTP", caminho, res.status);
      const mensagem =
        res.status === 422
          ? "Dados do pagamento inválidos. Confira nome, CPF, e-mail e telefone."
          : res.status === 429
            ? "Muitas tentativas agora. Aguarde alguns segundos e tente novamente."
            : "A cobrança não pôde ser gerada agora. Tente novamente em instantes.";
      throw new ErroSyncPay(res.status, mensagem);
    }
    return body;
  }
}

export type CobrancaPix = { pixCode: string; identificador: string };

export async function criarCobrancaPix(input: {
  valor: number;
  descricao: string;
  webhookUrl: string;
  cliente: { nome: string; cpf: string; email: string; telefone: string };
}): Promise<CobrancaPix> {
  const body = await chamar("/cash-in", {
    method: "POST",
    body: {
      amount: Number(input.valor.toFixed(2)),
      description: input.descricao,
      webhook_url: input.webhookUrl,
      client: {
        name: input.cliente.nome,
        cpf: input.cliente.cpf.replace(/\D/g, ""),
        email: input.cliente.email,
        phone: input.cliente.telefone.replace(/\D/g, ""),
      },
      // Estrutura pronta para split futuro: "split": [{ percentage, user_id }]
    },
  });

  const pixCode = (body["pix_code"] ?? body["pixCode"]) as string | undefined;
  const identificador = (body["identifier"] ?? body["reference_id"] ?? body["id"]) as string | undefined;
  if (!pixCode || !identificador) {
    console.error("[syncpay] cash-in sem pix_code/identifier");
    throw new ErroSyncPay(502, "A SyncPay não devolveu o código PIX.");
  }
  console.info("[syncpay] cash-in criado", identificador, input.valor);
  return { pixCode, identificador };
}

export type TransacaoSyncPay = { status: StatusSyncPay; valor: number | null };

export async function consultarTransacao(identificador: string): Promise<TransacaoSyncPay> {
  const body = await chamar(`/transaction/${encodeURIComponent(identificador)}`, { method: "GET" });
  const dados = ((body["data"] as Record<string, unknown> | undefined) ?? body) as Record<string, unknown>;
  const bruto = String(dados["status"] ?? "pending").toLowerCase();
  const status: StatusSyncPay = (
    ["pending", "completed", "failed", "refunded", "med"].includes(bruto) ? bruto : "pending"
  ) as StatusSyncPay;
  const valor = dados["amount"] == null ? null : Number(dados["amount"]);
  console.info("[syncpay] transação consultada", identificador, status);
  return { status, valor };
}
