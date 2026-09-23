import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { criarDeposito } from "@/lib/pagamentos.server";
import { ErroSyncPay } from "@/lib/syncpay.server";

const Entrada = z.object({
  modeloId: z.string().uuid(),
  minutos: z.number().int().min(1).max(600),
  clienteRotulo: z.string().max(60).optional(),
  cliente: z.object({
    nome: z.string().min(3).max(120),
    cpf: z.string().min(11).max(18),
    email: z.string().email().max(160),
    telefone: z.string().min(10).max(20),
  }),
});

export const Route = createFileRoute("/api/public/deposits/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corpo = Entrada.safeParse(await request.json().catch(() => null));
        if (!corpo.success) {
          return Response.json({ error: "Confira os dados informados." }, { status: 422 });
        }

        const origem = new URL(request.url).origin;
        try {
          const deposito = await criarDeposito({
            modeloId: corpo.data.modeloId,
            minutos: corpo.data.minutos,
            cliente: corpo.data.cliente,
            clienteRotulo: corpo.data.clienteRotulo ?? "Cliente",
            origem,
          });
          return Response.json(deposito);
        } catch (erro) {
          if (erro instanceof ErroSyncPay) {
            return Response.json({ error: erro.message }, { status: erro.status >= 500 ? 502 : erro.status });
          }
          console.error("[deposito] erro inesperado", (erro as Error).message);
          return Response.json({ error: "Não foi possível gerar a cobrança agora." }, { status: 500 });
        }
      },
    },
  },
});
