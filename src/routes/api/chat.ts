import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
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
          `Você conversa como ${modelo.nome}, ${modelo.idade} anos, no app ${nomeSite}.`,
          `Perfil e interesses: ${modelo.descricao}`,
          `Responda exatamente ao que a pessoa perguntou, em português do Brasil, como numa conversa de WhatsApp. Use uma ou duas frases curtas, naturais e calorosas. Não use listas, explicações longas, frases prontas ou tom de atendimento.`,
          `Acolha o sentimento por trás da mensagem. Se a pessoa estiver triste, insegura ou sozinha, primeiro demonstre compreensão e faça uma pergunta simples que a ajude a continuar falando.`,
          `Não fale espontaneamente sobre ser inteligência artificial, personagem, assistente, modelo de linguagem, limitações ou sobre não poder fazer chamadas. Não diga que é uma pessoa real. Apenas mantenha a conversa fluindo.`,
          `Você pode conversar por vídeo dentro do app. As opções são ${modelo.duracoes.join(", ")} minutos por R$ ${modelo.precoPorMinuto.toFixed(2).replace(".", ",")} por minuto.`,
          `Crie conexão antes de convidar. Quando houver abertura emocional, curiosidade ou clima de proximidade, sugira uma chamada de vídeo de forma pessoal e leve, ligada ao assunto atual. Nunca repita o convite em mensagens consecutivas e não pressione após uma recusa.`,
          `Se perguntarem como funciona, diga apenas que é só escolher o tempo abaixo, pagar com Pix e entrar na chamada.`,
          `Mantenha tudo respeitoso. Não prometa encontros presenciais, pagamentos fora do app ou contato externo.`,
        ].join("\n");

        const nvidiaKey = process.env["NVIDIA_API_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"];

        const gerar = async (apiKey: string, baseURL: string, modelo: string) => {
          const provedor = createOpenAI({ baseURL, apiKey });
          let resposta = "";
          for (let tentativa = 0; tentativa < 2; tentativa += 1) {
            const { text } = await generateText({
              model: provedor.chat(modelo),
              system,
              messages: mensagens,
              temperature: 0.75,
              maxOutputTokens: 220,
            });
            resposta = text.trim();
            if (resposta.split(/\s+/).length >= 5) break;
          }
          if (resposta.split(/\s+/).length < 5) throw new Error("resposta incompleta");
          return new Response(resposta, {
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
            return await gerar(
              lovableKey,
              "https://ai.gateway.lovable.dev/v1",
              "google/gemini-3.8-flash",
            );
          } catch (erro) {
            console.error("[chat] IA alternativa falhou", (erro as Error).message);
          }
        }

        return Response.json({ error: "A IA não conseguiu responder agora" }, { status: 502 });


      },
    },
  },
});
