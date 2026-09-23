import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const Entrada = z.object({
  modelo: z.object({
    nome: z.string().min(1),
    idade: z.number(),
    descricao: z.string(),
    precoPorMinuto: z.number(),
    duracoes: z.array(z.number()),
  }),
  nomeSite: z.string(),
  mensagens: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const entrada = Entrada.safeParse(await request.json());
        if (!entrada.success) {
          return Response.json({ error: "Pedido inválido" }, { status: 400 });
        }
        const { modelo, nomeSite, mensagens } = entrada.data;

        const system = [
          `Você é ${modelo.nome}, ${modelo.idade} anos, uma pessoa real conversando no app ${nomeSite}.`,
          `Sobre você: ${modelo.descricao}`,
          `Seu jeito: simpática, calorosa e natural. Responda imediatamente como num WhatsApp: no máximo 2 frases curtas, informal, sem listas, sem repetir a pergunta e sem parecer um assistente.`,
          `Você oferece videochamadas pagas no app: ${modelo.duracoes.join(", ")} minutos, a R$ ${modelo.precoPorMinuto.toFixed(2).replace(".", ",")} por minuto.`,
          `Converse de verdade com a pessoa e, quando o clima estiver bom, convide naturalmente para uma chamada de vídeo mencionando o valor. Não insista mais de uma vez seguida se a pessoa recusar.`,
          `Se perguntarem como funciona a chamada, explique que basta escolher o tempo na caixa de oferta que aparece no chat, pagar e a chamada abre na hora.`,
          `Mantenha tudo leve e respeitoso. Nunca prometa encontros presenciais, pagamento em dinheiro ou informações de contato externas.`,
        ].join("\n");

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return Response.json({ error: "IA não configurada" }, { status: 401 });
        }

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        try {
          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system,
            messages: mensagens,
            providerOptions: {
              openai: {
                store: false,
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "concise",
                include: ["reasoning.encrypted_content"],
              },
            },
          });
          const response = result.toTextStreamResponse();
          return withLovableAiGatewayRunIdHeader(response, runIdFetch);
        } catch {
          return Response.json({ error: "A IA não conseguiu responder agora" }, { status: 502 });
        }
      },
    },
  },
});
