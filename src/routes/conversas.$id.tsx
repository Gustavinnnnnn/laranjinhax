import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Video, Phone, X, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, useDb } from "@/lib/store";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { useImagem } from "@/lib/imagem-storage";

export const Route = createFileRoute("/conversas/$id")({
  head: () => ({ meta: [{ title: "Conversa privada — Vínculo" }, { name: "description", content: "Converse em tempo real e inicie uma chamada de vídeo." }, { property: "og:title", content: "Conversa privada — Vínculo" }, { property: "og:description", content: "Converse em tempo real e inicie uma chamada de vídeo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Conversa,
});

function Conversa() {
  const { id } = Route.useParams();
  const { modelos, config, conversas, pensando, enviar, registrarVenda, marcarPago } = useDb();
  const navigate = useNavigate();
  const perfil = modelos.find((m) => m.id === id);
  const [texto, setTexto] = useState("");
  const [pagamento, setPagamento] = useState(false);
  const [processando, setProcessando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const mensagens = perfil ? (conversas[id] ?? []) : [];
  const duracoes = perfil?.duracoes.length ? perfil.duracoes : [5, 10, 15, 30];
  const [minutos, setMinutos] = useState(duracoes.includes(10) ? 10 : duracoes[0]!);
  const valor = +((perfil?.precoPorMinuto ?? 0) * minutos).toFixed(2);
  const fotoSrc = useImagem(perfil?.foto ?? "");
  const fundoSrc = useImagem(perfil?.fotoFundoChat ?? "");

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length, pensando[id]]);

  if (!perfil) {
    return <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6 text-center"><div><p className="font-display text-2xl">Perfil não encontrado</p><Link to="/" className="mt-2 inline-block text-sm text-brand underline">Voltar</Link></div></main>;
  }

  const enviarMensagem = () => {
    const value = texto.trim();
    if (!value || pensando[id]) return;
    void enviar(id, value);
    setTexto("");
  };

  const irParaChamada = () => navigate({ to: "/chamada/$id", params: { id }, search: { min: minutos } });

  const finalizarPagamento = () => {
    const venda = registrarVenda({ modeloId: perfil.id, modeloNome: perfil.nome, minutos, valor });
    setProcessando(true);
    window.setTimeout(() => {
      marcarPago(venda);
      setProcessando(false);
      setPagamento(false);
      toast.success("Pagamento confirmado");
      irParaChamada();
    }, 900);
  };

  return (
    <main className="relative mx-auto flex h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden bg-[#efeae2] text-slate-900 shadow-2xl">
      {fundoSrc && <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${fundoSrc})` }} />}
      <div className="pointer-events-none absolute inset-0 bg-[#efeae2]/75" />
      <header className="relative z-10 flex shrink-0 items-center gap-3 bg-[#f7f8fa]/95 px-3 pb-2.5 pt-[max(.6rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-xl">
        <Link to="/" aria-label="Voltar" className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-700">
          <ArrowLeft className="size-4" />
        </Link>
        <img src={fotoSrc} alt={perfil.nome} className="size-11 rounded-full object-cover ring-2 ring-brand/15" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{perfil.nome}, {perfil.idade}</p>
          <p className="text-[11px] font-medium text-slate-500">{pensando[id] ? "digitando agora…" : perfil.online ? "online agora" : "visto por último hoje"}</p>
        </div>
        <button onClick={irParaChamada} aria-label="Vídeo" className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand"><Video className="size-[19px]" /></button>
        <button onClick={irParaChamada} aria-label="Áudio" className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700"><Phone className="size-[18px]" /></button>
      </header>

      <Conversation className="relative z-[1] min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-[560px] gap-2.5 px-3 py-4">
          <div className="py-3 text-center">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm ring-1 ring-slate-200">Hoje</span>
          </div>

          {mensagens.length === 0 && (
            <div className="mx-auto max-w-[290px] rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold">Comece a conversa 💗</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Mande uma mensagem para {perfil.nome}. Ela responde aqui.</p>
            </div>
          )}

          {mensagens.map((m) => (
            <Message key={m.id} from={m.role} className="max-w-full gap-0">
              <MessageContent className={m.role === "user" ? "max-w-[82%] rounded-xl rounded-br-sm bg-emerald-100 px-3.5 py-2 text-slate-900 shadow-sm" : "max-w-[82%] rounded-xl rounded-bl-sm bg-transparent px-3.5 py-2 text-slate-900 backdrop-blur-sm"}>
                <MessageResponse className="text-[14px] leading-relaxed">{m.texto || "…"}</MessageResponse>
                <p className="text-right text-[9px] text-slate-500">{m.hora}{m.role === "user" ? "  ✓✓" : ""}</p>
              </MessageContent>
            </Message>
          ))}

          {pensando[id] && (
            <div className="flex justify-start">
              <div className="rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                <div className="flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-brand/50" /><span className="size-1.5 animate-bounce rounded-full bg-brand/50 [animation-delay:120ms]" /><span className="size-1.5 animate-bounce rounded-full bg-brand/50 [animation-delay:240ms]" /></div>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-brand/10"><Sparkles className="size-4 text-brand" /></span>
              <div><p className="text-sm font-bold">Quer me ver ao vivo?</p><p className="text-[11px] text-slate-500">Chamada de vídeo por {formatBRL(perfil.precoPorMinuto)}/min</p></div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {duracoes.map((d) => <button key={d} onClick={() => setMinutos(d)} className={`rounded-xl py-2.5 text-xs font-bold ring-1 transition ${minutos === d ? "bg-brand text-white ring-brand" : "bg-slate-50 text-slate-600 ring-slate-200"}`}>{d} min</button>)}
            </div>
            <button onClick={() => setPagamento(true)} className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-brand/20">Pagar {formatBRL(valor)} e iniciar</button>
          </div>
          <div ref={fim} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="relative z-10 shrink-0 bg-muted/95 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <PromptInput onSubmit={() => enviarMensagem()} className="rounded-full border-0 bg-background shadow-sm">
          <PromptInputTextarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem" className="min-h-11 resize-none py-3 pl-4" />
          <PromptInputFooter className="justify-end pr-1">
            <PromptInputSubmit status={pensando[id] ? "submitted" : "ready"} disabled={!texto.trim() || pensando[id]} aria-label="Enviar" className="rounded-full bg-brand text-primary-foreground"><Send className="size-[18px]" /></PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>

      {pagamento && (
        <div className="fixed inset-0 z-30 flex items-end bg-slate-900/50 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between"><div><p className="font-display text-xl">Iniciar chamada</p><p className="text-xs text-slate-500">{perfil.nome} · {minutos} minutos</p></div><button onClick={() => !processando && setPagamento(false)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600"><X className="size-4" /></button></div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><strong>{formatBRL(valor)}</strong></div></div>
            {config.chavePix && <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase text-slate-400">Pix</p><p className="truncate text-xs">{config.chavePix}</p></div><button onClick={() => { void navigator.clipboard?.writeText(config.chavePix); toast.success("Pix copiado"); }} className="grid size-9 place-items-center rounded-xl bg-slate-100"><Copy className="size-4" /></button></div>}
            <button disabled={processando} onClick={finalizarPagamento} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white disabled:opacity-60">{processando && <Loader2 className="size-4 animate-spin" />}{processando ? "Confirmando…" : "Confirmar e entrar na chamada"}</button>
            <p className="mt-2 text-center text-[10px] text-slate-400">Modo de demonstração</p>
          </div>
        </div>
      )}
    </main>
  );
}
