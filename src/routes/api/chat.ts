import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

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

const MODELO_IA = "meta/llama-3.3-70b-instruct";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const entrada = Entrada.safeParse(await request.json().catch(() => null));
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
          `Se perguntarem como funciona a chamada, explique que basta escolher o tempo na caixa de oferta que aparece no chat, pagar com Pix e a chamada abre na hora.`,
          `Mantenha tudo leve e respeitoso. Nunca prometa encontros presenciais, pagamento em dinheiro ou informações de contato externas.`,
          `Escreva sempre em português do Brasil.`,
        ].join("\n");

        const key = process.env["NVIDIA_API_KEY"];
        if (!key) {
          return Response.json({ error: "IA não configurada" }, { status: 401 });
        }

        const nvidia = createOpenAI({
          baseURL: "https://integrate.api.nvidia.com/v1",
          apiKey: key,
        });

        try {
          const result = streamText({
            model: nvidia.chat(MODELO_IA),
            system,
            messages: mensagens,
            temperature: 0.8,
            maxOutputTokens: 220,
          });
          return result.toTextStreamResponse();
        } catch (erro) {
          console.error("[chat] falha na IA", (erro as Error).message);
          return Response.json({ error: "A IA não conseguiu responder agora" }, { status: 502 });
        }
      },
    },
  },
});
