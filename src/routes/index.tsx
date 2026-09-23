import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Loader2, MessageCircle, ShieldCheck, Video } from "lucide-react";
import { useDb } from "@/lib/store";
import { useImagem } from "@/lib/imagem-storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Laranjinha — descubra e converse" }, { name: "description", content: "Conheça novos perfis, converse e faça chamadas de vídeo." }, { property: "og:title", content: "Laranjinha — descubra e converse" }, { property: "og:description", content: "Conheça novos perfis e comece uma conversa agora." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Descobrir,
});

function Descobrir() {
  const navigate = useNavigate();
  const { modelos, config, carregando } = useDb();
  const perfis = modelos.filter((m) => m.ativo);
  const [indice, setIndice] = useState(0);
  const [drag, setDrag] = useState(0);
  const [animando, setAnimando] = useState<null | "left" | "right">(null);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  if (carregando && !perfis.length) return (
    <main className="grid min-h-[100dvh] place-items-center bg-slate-950 p-6 text-center text-white">
      <div className="flex flex-col items-center gap-3"><Loader2 className="size-7 animate-spin text-brand" /><p className="text-sm text-white/70">Carregando perfis…</p></div>
    </main>
  );

  if (!perfis.length) return (
    <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6 text-center">
      <div><ShieldCheck className="mx-auto size-12 text-brand" /><h1 className="mt-4 font-display text-2xl">Ainda não há perfis</h1><p className="mt-2 text-sm text-slate-500">Cadastre e publique uma modelo no painel para começar.</p><a href="/admin/modelos" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white">Abrir painel</a></div>
    </main>
  );

  const currentIndex = ((indice % perfis.length) + perfis.length) % perfis.length;
  const perfil = perfis[currentIndex];
  if (!perfil) return null;
  const abrirChat = () => navigate({ to: "/conversas/$id", params: { id: perfil.id } });
  const avancar = (direction: "left" | "right") => {
    if (animando) return;
    setAnimando(direction);
    window.setTimeout(() => { setIndice((v) => v + 1); setDrag(0); setAnimando(null); }, 260);
  };
  const down = (e: React.PointerEvent) => { startX.current = e.clientX; moved.current = false; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (startX.current === null || animando) return; const d = e.clientX - startX.current; if (Math.abs(d) > 8) moved.current = true; setDrag(d); };
  const up = () => {
    if (startX.current === null) return;
    const d = drag; startX.current = null;
    if (Math.abs(d) > 90) avancar(d > 0 ? "right" : "left"); else { setDrag(0); if (!moved.current) abrirChat(); }
  };
  const offset = animando ? (animando === "right" ? 700 : -700) : drag;

  return (
    <main className="h-[100dvh] overflow-hidden bg-ink text-background">
      <div className="relative mx-auto flex h-full w-full max-w-[680px] flex-col overflow-hidden bg-ink shadow-2xl">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-background/10 bg-ink/20 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-background backdrop-blur-xl">
          <div>
            <p className="font-display text-xl font-bold">{config.nomeSite}</p>
            <p className="mt-0.5 text-[11px] font-medium text-background/65">Conexões que começam com um oi</p>
          </div>
          <span className="rounded-full border border-background/15 bg-background/10 px-3 py-1 text-[11px] font-semibold text-background/80 backdrop-blur-xl">{currentIndex + 1} de {perfis.length}</span>
        </header>

        <section className="relative min-h-0 flex-1">
          <article
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            className="absolute inset-0 overflow-hidden bg-ink touch-pan-y select-none"
            style={{ transform: `translateX(${offset}px)`, transition: startX.current === null ? "transform 260ms cubic-bezier(.22,.8,.25,1)" : "none", opacity: animando ? 0 : 1 }}
          >
            <FotoPerfil referencia={perfil.foto} nome={perfil.nome} />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-transparent to-ink" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-background/15 bg-background/10 px-2.5 py-1 text-[10px] font-bold uppercase text-background backdrop-blur-xl">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Disponível agora
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand/15 px-2.5 py-1 text-[10px] font-bold text-brand backdrop-blur-xl">
                  <Video className="size-3" /> Chamada ao vivo
                </span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-4xl font-bold leading-none text-background">{perfil.nome}, {perfil.idade}</h1>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-background/75">{perfil.descricao}</p>
                </div>
                {perfil.online && <span className="mb-2 size-3 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />}
              </div>
              <div className="my-4 h-px bg-background/10" />
              <Button onClick={(e) => { e.stopPropagation(); abrirChat(); }} className="h-14 w-full rounded-2xl bg-brand text-sm font-bold text-primary-foreground shadow-xl shadow-brand/25 transition-transform active:scale-[0.98] hover:bg-brand/90">
                <MessageCircle className="size-5" /> Conversar com {perfil.nome}
              </Button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function FotoPerfil({ referencia, nome }: { referencia: string; nome: string }) {
  const src = useImagem(referencia);
  if (!src) return <div className="absolute inset-0 animate-pulse bg-ink" />;
  return <img src={src} alt={nome} draggable={false} className="absolute inset-0 size-full object-cover" />;
}