import { createFileRoute } from "@tanstack/react-router";
import { aplicarStatus, pagamentoPorIdentificador } from "@/lib/pagamentos.server";
import { consultarTransacao } from "@/lib/syncpay.server";

function acharIdentificador(payload: unknown): string | null {
  const visto = new Set<unknown>();
  const chaves = ["identifier", "reference_id", "transaction_id", "idTransaction", "id"];
  const percorrer = (valor: unknown): string | null => {
    if (!valor || typeof valor !== "object" || visto.has(valor)) return null;
    visto.add(valor);
    const obj = valor as Record<string, unknown>;
    for (const chave of chaves) {
      const bruto = obj[chave];
      if (typeof bruto === "string" && bruto.length >= 8) return bruto;
    }
    for (const item of Object.values(obj)) {
      const achado = percorrer(item);
      if (achado) return achado;
    }
    return null;
  };
  return percorrer(payload);
}

export const Route = createFileRoute("/api/public/syncpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json().catch(() => null);
        const identificador = acharIdentificador(payload);
        console.info("[webhook] recebido", identificador ?? "sem identificador");
        if (!identificador) return Response.json({ ok: true, ignorado: true });

        const pagamento = await pagamentoPorIdentificador(identificador);
        if (!pagamento) {
          console.warn("[webhook] depósito não encontrado", identificador);
          return Response.json({ ok: true, ignorado: true });
        }

        // Idempotência: nada a fazer se o crédito já foi liberado.
        if (pagamento.saldo_creditado) {
          console.info("[webhook] já processado", pagamento.id);
          return Response.json({ ok: true, jaProcessado: true });
        }

        // Nunca confiar apenas no corpo do webhook: confirmar na SyncPay.
        try {
          const transacao = await consultarTransacao(identificador);
          await aplicarStatus(pagamento.id, transacao.status);
          console.info("[webhook] status aplicado", pagamento.id, transacao.status);
        } catch (erro) {
          console.error("[webhook] confirmação falhou", (erro as Error).message);
          return Response.json({ ok: false }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
