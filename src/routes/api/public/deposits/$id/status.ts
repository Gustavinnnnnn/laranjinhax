import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { statusDoDeposito } from "@/lib/pagamentos.server";

export const Route = createFileRoute("/api/public/deposits/$id/status")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = z.string().uuid().safeParse(params.id);
        if (!id.success) return Response.json({ error: "Depósito inválido." }, { status: 422 });

        const situacao = await statusDoDeposito(id.data);
        if (!situacao) return Response.json({ error: "Depósito não encontrado." }, { status: 404 });

        return Response.json(situacao, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
