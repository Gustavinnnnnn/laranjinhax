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

const MODELO_IA = "nvidia/llama-3.1-nemotron-70b-instruct";

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

        const nvidiaKey = process.env["NVIDIA_API_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"];

        const gerar = async (apiKey: string, baseURL: string, modelo: string) => {
          const provedor = createOpenAI({ baseURL, apiKey });
          const result = streamText({
            model: provedor.chat(modelo),
            system,
            messages: mensagens,
            temperature: 0.8,
            maxOutputTokens: 220,
          });
          // Aguarda o primeiro trecho para detectar falha antes de responder.
          const stream = result.textStream[Symbol.asyncIterator]();
          const primeiro = await stream.next();
          let inicioEnviado = false;
          const corpo = new ReadableStream<Uint8Array>({
            async pull(controller) {
              const cod = new TextEncoder();
              if (!inicioEnviado) {
                inicioEnviado = true;
                if (primeiro.done) {
                  controller.close();
                  return;
                }
                controller.enqueue(cod.encode(primeiro.value));
                return;
              }
              const proximo = await stream.next();
              if (proximo.done) controller.close();
              else controller.enqueue(cod.encode(proximo.value));
            },
          });

          return new Response(corpo, {
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        };

        if (nvidiaKey) {
          try {
            return await gerar(nvidiaKey, "https://integrate.api.nvidia.com/v1", MODELO_IA);
          } catch (erro) {
            console.error("[chat] NVIDIA indisponível", (erro as Error).message);
          }
        }

        if (lovableKey) {
          try {
            return await gerar(lovableKey, "https://ai.gateway.lovable.dev/v1", "google/gemini-3.8-flash");
          } catch (erro) {
            console.error("[chat] IA alternativa falhou", (erro as Error).message);
          }
        }

        return Response.json({ error: "A IA não conseguiu responder agora" }, { status: 502 });

      },
    },
  },
});
