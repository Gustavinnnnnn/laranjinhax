import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCheck, Send, Video } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, useDb } from "@/lib/store";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { useImagem } from "@/lib/imagem-storage";
import { PagamentoPix } from "@/components/pagamento-pix";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/conversas/$id")({
  head: () => ({ meta: [{ title: "Conversa privada — Laranjinha" }, { name: "description", content: "Converse em tempo real e inicie uma chamada de vídeo." }, { property: "og:title", content: "Conversa privada — Laranjinha" }, { property: "og:description", content: "Converse em tempo real e inicie uma chamada de vídeo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Conversa,
});

function Conversa() {
  const { id } = Route.useParams();
  const { modelos, config, conversas, pensando, enviar } = useDb();
  const navigate = useNavigate();
  const perfil = modelos.find((m) => m.id === id);
  const [texto, setTexto] = useState("");
  const [pagamento, setPagamento] = useState(false);

  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  const mensagens = perfil ? (conversas[id] ?? []) : [];
  const duracoes = perfil?.duracoes.length ? perfil.duracoes : [5, 10, 15, 30];
  const [minutos, setMinutos] = useState(duracoes.includes(10) ? 10 : (duracoes[0] ?? 5));
  const valor = +((perfil?.precoPorMinuto ?? 0) * minutos).toFixed(2);
  const fotoSrc = useImagem(perfil?.foto ?? "");
  const fundoSrc = useImagem(perfil?.fotoFundoChat ?? "");

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length, pensando[id]]);

  useEffect(() => {
    if (!pagamento && !pensando[id]) campo.current?.focus();
  }, [id, pagamento, pensando]);

  if (!perfil) {
    return <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6 text-center"><div><p className="font-display text-2xl">Perfil não encontrado</p><Link to="/" className="mt-2 inline-block text-sm text-brand underline">Voltar</Link></div></main>;
  }

  const enviarMensagem = () => {
    const value = texto.trim();
    if (!value || pensando[id]) return;
    void enviar(id, value);
    setTexto("");
    window.setTimeout(() => campo.current?.focus(), 0);
  };

  const irParaChamada = () => navigate({ to: "/chamada/$id", params: { id }, search: { min: minutos } });


  return (
    <main className="relative mx-auto flex h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden bg-muted text-ink shadow-2xl">
      {fundoSrc ? (
        <img src={fundoSrc} alt="" className="pointer-events-none absolute inset-0 size-full object-cover object-center" />
      ) : fotoSrc ? (
        <img src={fotoSrc} alt="" className="pointer-events-none absolute inset-0 size-full object-cover object-center" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-background/45" />
      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border/60 bg-chat-surface px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <Link to="/" aria-label="Voltar" className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <img src={fotoSrc} alt={perfil.nome} className="size-10 rounded-full object-cover ring-2 ring-background shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold">{perfil.nome}</p>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {pensando[id] ? "digitando…" : perfil.online ? "online" : "vista hoje"}
          </p>
        </div>
        <Button onClick={() => setPagamento(true)} aria-label="Iniciar chamada de vídeo" title="Chamada de vídeo" size="icon" className="rounded-full bg-brand text-primary-foreground shadow-md hover:bg-brand/90">
          <Video className="size-[18px]" />
        </Button>
      </header>

      <Conversation className="relative z-[1] min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-[560px] gap-3 px-4 py-5">
          <div className="py-3 text-center">
            <span className="rounded-full bg-chat-surface px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground shadow-sm backdrop-blur-md">Hoje</span>
          </div>

          {mensagens.length === 0 && (
            <div className="mx-auto max-w-[290px] rounded-2xl bg-chat-surface p-4 text-center shadow-sm backdrop-blur-md">
              <p className="font-display text-sm font-semibold">Diga um oi para {perfil.nome}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Uma conversa boa pode começar com algo simples.</p>
            </div>
          )}

          {mensagens.map((m) => (
            <Message key={m.id} from={m.role} className="max-w-full gap-0">
              <MessageContent className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-ink px-3.5 py-2.5 text-background shadow-md" : "max-w-[85%] rounded-2xl rounded-tl-sm border border-border/70 bg-chat-surface-strong px-3.5 py-2.5 text-foreground shadow-sm backdrop-blur-md"}>
                <MessageResponse className="text-[14px] leading-relaxed">{m.texto || "…"}</MessageResponse>
                <p className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${m.role === "user" ? "text-background/65" : "text-muted-foreground"}`}>{m.hora}{m.role === "user" && <CheckCheck className="size-3 text-brand" />}</p>
              </MessageContent>
            </Message>
          ))}

          {pensando[id] && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-chat-surface-strong px-4 py-3 shadow-sm backdrop-blur-md">
                <p className="animate-pulse text-xs font-medium text-muted-foreground">digitando…</p>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-background/60 bg-chat-surface p-4 shadow-lg backdrop-blur-xl">
            <div><p className="font-display text-sm font-bold">Quer conversar olhando nos meus olhos?</p><p className="mt-0.5 text-[11px] text-muted-foreground">Chamada de vídeo por {formatBRL(perfil.precoPorMinuto)}/min</p></div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {duracoes.map((d) => <Button key={d} onClick={() => setMinutos(d)} variant={minutos === d ? "default" : "outline"} className={`h-9 rounded-lg px-1 text-xs font-bold ${minutos === d ? "bg-ink text-background hover:bg-ink/90" : "bg-background/70"}`}>{d} min</Button>)}
            </div>
            <Button onClick={() => setPagamento(true)} className="mt-3 h-12 w-full rounded-xl bg-brand text-sm font-bold text-primary-foreground shadow-lg shadow-brand/20 hover:bg-brand/90">Chamar agora · {formatBRL(valor)}</Button>
          </div>
          <div ref={fim} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="relative z-10 shrink-0 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2">
        <PromptInput onSubmit={() => enviarMensagem()} className="rounded-2xl border border-background/70 bg-chat-surface-strong p-1.5 shadow-xl backdrop-blur-2xl">
          <PromptInputTextarea ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Sua mensagem..." className="min-h-11 resize-none bg-transparent py-3 pl-3 text-[14px]" />
          <PromptInputFooter className="justify-end pr-0">
            <PromptInputSubmit status={pensando[id] ? "submitted" : "ready"} disabled={!texto.trim() || pensando[id]} aria-label="Enviar mensagem" className="size-10 rounded-xl bg-brand text-primary-foreground shadow-md hover:bg-brand/90"><Send className="size-[17px]" /></PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>

      {pagamento && (
        <PagamentoPix
          modeloId={perfil.id}
          modeloNome={perfil.nome}
          minutos={minutos}
          valor={valor}
          clienteRotulo={config.nomeSite || "Cliente"}
          onFechar={() => setPagamento(false)}
          onPago={() => {
            setPagamento(false);
            toast.success("Pagamento confirmado");
            irParaChamada();
          }}
        />
      )}

    </main>
  );
}
