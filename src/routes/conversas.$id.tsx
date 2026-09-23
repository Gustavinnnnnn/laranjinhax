import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCheck, Send, Video } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, useDb } from "@/lib/store";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
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
    <main className="relative mx-auto flex h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden bg-ink text-background shadow-2xl">
      {fundoSrc ? (
        <img src={fundoSrc} alt="" className="pointer-events-none absolute inset-0 size-full object-cover object-center" />
      ) : fotoSrc ? (
        <img src={fotoSrc} alt="" className="pointer-events-none absolute inset-0 size-full object-cover object-center" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/75" />
      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-background/10 bg-ink/25 px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-2xl">
        <Link to="/" aria-label="Voltar" className="grid size-10 place-items-center rounded-full border border-background/10 bg-background/5 text-background transition-colors hover:bg-background/10">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="relative shrink-0">
          {fotoSrc ? <img src={fotoSrc} alt={perfil.nome} className="size-12 rounded-full object-cover p-0.5 ring-2 ring-brand/55" /> : <div className="size-12 rounded-full bg-background/10 p-0.5 ring-2 ring-brand/55" aria-hidden="true" />}
          <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-ink bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-background">{perfil.nome}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">Laranjinha</span>
            <span className="text-[11px] font-medium text-background/55">{pensando[id] ? "digitando…" : perfil.online ? "online agora" : "vista hoje"}</span>
          </div>
        </div>
        <Button onClick={() => setPagamento(true)} aria-label="Iniciar chamada de vídeo" title="Chamada de vídeo" size="icon" className="size-10 rounded-full border border-brand/40 bg-brand/20 text-brand shadow-lg backdrop-blur-xl hover:bg-brand hover:text-primary-foreground">
          <Video className="size-[18px]" />
        </Button>
      </header>

      <Conversation className="relative z-[1] min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-[560px] gap-3 px-4 py-5">
          <div className="py-3 text-center">
            <span className="rounded-full border border-background/10 bg-ink/25 px-3 py-1 text-[10px] font-bold uppercase text-background/55 backdrop-blur-xl">Hoje</span>
          </div>

          {mensagens.length === 0 && (
            <div className="mx-auto max-w-[290px] rounded-2xl border border-background/10 bg-background/10 p-4 text-center shadow-lg backdrop-blur-xl">
              <p className="font-display text-sm font-semibold text-background">Diga um oi para {perfil.nome}</p>
              <p className="mt-1 text-xs leading-relaxed text-background/60">Uma conversa boa pode começar com algo simples.</p>
            </div>
          )}

          {mensagens.map((m) => (
            <Message key={m.id} from={m.role} className="max-w-full gap-0">
              <MessageContent className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-primary-foreground shadow-lg shadow-brand/20" : "max-w-[85%] rounded-2xl rounded-bl-sm border border-background/10 bg-background/10 px-3.5 py-2.5 text-background shadow-lg backdrop-blur-xl"}>
                <MessageResponse className="text-[14px] leading-relaxed">{m.texto || "…"}</MessageResponse>
                <p className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${m.role === "user" ? "text-primary-foreground/70" : "text-background/50"}`}>{m.hora}{m.role === "user" && <CheckCheck className="size-3" />}</p>
              </MessageContent>
            </Message>
          ))}

          {pensando[id] && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-background/10 bg-background/10 px-4 py-3 shadow-lg backdrop-blur-xl">
                <p className="animate-pulse text-xs font-medium text-background/60">digitando…</p>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-brand/30 bg-ink/45 p-4 text-background shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-primary-foreground"><Video className="size-4" /></span><div><p className="font-display text-sm font-bold">Quer conversar olhando nos meus olhos?</p><p className="mt-0.5 text-[11px] text-background/60">Chamada de vídeo por {formatBRL(perfil.precoPorMinuto)}/min</p></div></div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {duracoes.map((d) => <Button key={d} onClick={() => setMinutos(d)} variant={minutos === d ? "default" : "outline"} className={`h-9 rounded-lg px-1 text-xs font-bold ${minutos === d ? "border-brand bg-brand text-primary-foreground hover:bg-brand/90" : "border-background/15 bg-background/5 text-background hover:bg-background/10 hover:text-background"}`}>{d} min</Button>)}
            </div>
            <Button onClick={() => setPagamento(true)} className="mt-3 h-12 w-full rounded-xl bg-brand text-sm font-bold text-primary-foreground shadow-lg shadow-brand/25 hover:bg-brand/90">Chamar agora · {formatBRL(valor)}</Button>
          </div>
          <div ref={fim} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="relative z-10 shrink-0 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2">
        <PromptInput onSubmit={() => enviarMensagem()} className="relative rounded-2xl border border-background/15 bg-background/10 p-1.5 shadow-2xl backdrop-blur-2xl">
          <PromptInputTextarea ref={campo} rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Diga algo especial..." className="min-h-12 resize-none bg-transparent py-3.5 pl-3 pr-14 text-[14px] font-medium text-background placeholder:text-background/40" />
          <PromptInputSubmit status={pensando[id] ? "submitted" : "ready"} disabled={!texto.trim() || pensando[id]} aria-label="Enviar mensagem" className="absolute bottom-2 right-2 size-10 rounded-xl bg-brand text-primary-foreground shadow-lg shadow-brand/30 transition-transform active:scale-90 hover:bg-brand/90"><Send className="size-[17px]" /></PromptInputSubmit>
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
