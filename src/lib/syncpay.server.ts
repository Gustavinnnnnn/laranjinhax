const BASE_URL = "https://api.syncpayments.com.br";

type TokenCache = { token: string; exp: number };
let cache: TokenCache | null = null;

async function obterToken(force = false): Promise<string> {
  if (!force && cache && cache.exp > Date.now()) return cache.token;
  const clientId = process.env["SYNCPAY_CLIENT_ID"];
  const clientSecret = process.env["SYNCPAY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("SyncPay não configurado");

  const res = await fetch(`${BASE_URL}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`auth-token ${res.status}: ${JSON.stringify(body)}`);
  const token =
    (body["access_token"] as string | undefined) ??
    (body["token"] as string | undefined) ??
    ((body["data"] as Record<string, unknown> | undefined)?.["access_token"] as string | undefined);
  if (!token) throw new Error(`auth-token sem token: ${JSON.stringify(body)}`);
  const expiresIn = Number(body["expires_in"] ?? 0);
  cache = { token, exp: Date.now() + (expiresIn > 60 ? expiresIn - 60 : 240) * 1000 };
  return token;
}

export type CobrancaPix = { pixCode: string; identificador: string };

export async function criarCobrancaPix(input: {
  valor: number;
  descricao: string;
  webhookUrl: string;
  cliente: { nome: string; cpf: string; email: string; telefone: string };
}): Promise<CobrancaPix> {
  const corpo = {
    amount: Number(input.valor.toFixed(2)),
    description: input.descricao,
    webhook_url: input.webhookUrl,
    client: {
      name: input.cliente.nome,
      cpf: input.cliente.cpf.replace(/\D/g, ""),
      email: input.cliente.email,
      phone: input.cliente.telefone.replace(/\D/g, ""),
    },
  };

  const chamar = async (token: string) =>
    fetch(`${BASE_URL}/api/partner/v1/cash-in`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(corpo),
    });

  let res = await chamar(await obterToken());
  if (res.status === 401) res = await chamar(await obterToken(true));

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`cash-in ${res.status}: ${JSON.stringify(body)}`);

  const pixCode = (body["pix_code"] ?? body["pixCode"] ?? body["qr_code"]) as string | undefined;
  const identificador = (body["identifier"] ?? body["id"] ?? body["reference_id"]) as string | undefined;
  if (!pixCode || !identificador) throw new Error(`cash-in inesperado: ${JSON.stringify(body)}`);
  return { pixCode, identificador };
}
