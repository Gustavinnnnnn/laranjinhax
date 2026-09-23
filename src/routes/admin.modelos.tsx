import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, Pencil, Plus, Trash2, X, Video } from "lucide-react";
import { toast } from "sonner";
import { DURACOES_PADRAO, formatBRL, useDb, type Modelo } from "@/lib/store";
import { removerVideo, resolverVideo, salvarVideo } from "@/lib/video-storage";
import { removerImagem, salvarImagem, useImagem } from "@/lib/imagem-storage";

export const Route = createFileRoute("/admin/modelos")({
  component: Modelos,
});

const vazio = (id: string): Modelo => ({
  id,
  nome: "",
  idade: 25,
  online: true,
  ativo: true,
  descricao: "",
  foto: "",
  precoPorMinuto: 4.9,
  duracoes: [...DURACOES_PADRAO],
  videoChamadaUrl: "",
  fotoFundoChat: "",
});

// Envia a imagem escolhida para a nuvem e devolve a referência salva no perfil
const lerFoto = async (file: File, modeloId: string, tipo: "foto" | "fundo", cb: (ref: string) => void) => {
  if (!file.type.startsWith("image/")) {
    toast.error("Escolha um arquivo de imagem.");
    return;
  }
  const aviso = toast.loading("Enviando imagem…");
  try {
    const ref = await salvarImagem(modeloId, tipo, file);
    toast.success("Imagem enviada", { id: aviso });
    cb(ref);
  } catch {
    toast.error("Não foi possível enviar a imagem.", { id: aviso });
  }
};

function Foto({ referencia, alt, className }: { referencia: string; alt: string; className: string }) {
  const src = useImagem(referencia);
  if (!src) return <div className={`${className} animate-pulse bg-muted`} />;
  return <img src={src} alt={alt} className={className} />;
}

const lerVideo = async (file: File, modeloId: string, cb: (ref: string) => void) => {
  if (!file.type.startsWith("video/")) {
    toast.error("Escolha um arquivo de vídeo.");
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    toast.error("Vídeo muito grande", { description: "O limite é de 50 MB." });
    return;
  }
  const aviso = toast.loading("Enviando vídeo…");
  try {
    const ref = await salvarVideo(modeloId, file);
    toast.success("Vídeo enviado", { id: aviso });
    cb(ref);
  } catch {
    toast.error("Não foi possível enviar o vídeo.", { id: aviso });
  }
};

function Modelos() {
  const { modelos, salvarModelo, removerModelo } = useDb();
  const [form, setForm] = useState<Modelo | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [previa, setPrevia] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fundoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    const ref = form?.videoChamadaUrl ?? "";
    if (!ref) {
      setPrevia("");
      return;
    }
    void resolverVideo(ref).then((url) => {
      if (ativo) setPrevia(url);
    });
    return () => {
      ativo = false;
    };
  }, [form?.videoChamadaUrl]);

  const abrirForm = (modelo: Modelo) => {
    setForm(modelo);
    setVideoUrl(modelo.videoChamadaUrl.startsWith("data:") ? "" : modelo.videoChamadaUrl);
  };

  const salvar = async () => {
    if (!form) return;
    if (!form.nome.trim()) {
      toast.error("Preencha o nome");
      return;
    }
    if (!form.foto) {
      toast.error("Escolha uma foto");
      return;
    }
    try {
      await salvarModelo({ ...form, nome: form.nome.trim(), videoChamadaUrl: form.videoChamadaUrl.trim() });
      toast.success("Modelo salva");
      setForm(null);
      setVideoUrl("");
    } catch {
      toast.error("Não foi possível salvar. Tente de novo.");
    }
  };

  const set = (p: Partial<Modelo>) => setForm((f) => (f ? { ...f, ...p } : f));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Modelos</h1>
        <button
          onClick={() => {
            setForm(vazio(crypto.randomUUID()));
            setVideoUrl("");
          }}
          className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" />
          Nova modelo
        </button>
      </div>

      {modelos.length === 0 && (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhuma modelo cadastrada. Clique em “Nova modelo” para criar o primeiro perfil —
          ele já aparece no site na hora.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {modelos.map((m) => (
          <div key={m.id} className="flex gap-3 rounded-xl border bg-card p-3.5">
            {m.foto ? (
              <Foto referencia={m.foto} alt={m.nome} className="size-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                ?
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{m.nome || "Sem nome"}</p>
                {!m.ativo && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    Oculta
                  </span>
                )}
                {m.online && m.ativo && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
                    Online
                  </span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                {m.descricao || "Sem descrição"}
              </p>
              <p className="mt-1 text-[12px] font-medium">
                {formatBRL(m.precoPorMinuto)}/min · {m.duracoes.join(", ")} min
              </p>
              {m.videoChamadaUrl && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-brand">
                  <Video className="size-3" /> Vídeo da chamada configurado
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                aria-label="Editar"
                onClick={() => abrirForm({ ...m })}
                className="grid size-9 place-items-center rounded-lg border"
              >
                <Pencil className="size-4" />
              </button>
              <button
                aria-label="Excluir"
                onClick={() => {
                  void removerVideo(m.videoChamadaUrl);
                  void removerImagem(m.foto);
                  void removerImagem(m.fotoFundoChat);
                  void removerModelo(m.id);
                  toast.info("Modelo removida");
                }}
                className="grid size-9 place-items-center rounded-lg border text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
          <div className="no-scrollbar max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl md:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg">
                {modelos.some((m) => m.id === form.id) ? "Editar modelo" : "Nova modelo"}
              </p>
              <button aria-label="Fechar" onClick={() => setForm(null)}>
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1.5 font-medium">Foto</p>
                <div className="flex items-center gap-3">
                  {form.foto ? (
                    <Foto referencia={form.foto} alt="" className="size-20 rounded-lg object-cover" />
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="grid size-20 place-items-center rounded-lg border border-dashed text-muted-foreground"
                    >
                      <Plus className="size-5" />
                    </button>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="rounded-full border px-4 py-2 text-xs font-semibold"
                  >
                    {form.foto ? "Trocar foto" : "Escolher foto"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void lerFoto(f, form.id, "foto", (ref) => set({ foto: ref }));
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_90px] gap-3">
                <label className="block">
                  <span className="mb-1.5 block font-medium">Nome</span>
                  <input
                    value={form.nome}
                    onChange={(e) => set({ nome: e.target.value })}
                    className="h-10 w-full rounded-lg border bg-background px-3 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-medium">Idade</span>
                  <input
                    type="number"
                    min={18}
                    value={form.idade}
                    onChange={(e) => set({ idade: Math.max(18, +e.target.value || 18) })}
                    className="h-10 w-full rounded-lg border bg-background px-3 outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block font-medium">Descrição</span>
                <textarea
                  value={form.descricao}
                  onChange={(e) => set({ descricao: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 outline-none"
                  placeholder="Aparece no site junto do nome"
                />
              </label>

              <div className="rounded-xl border bg-background p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <ImageIcon className="size-4 text-brand" />
                  <p className="font-semibold">Foto de fundo do chat</p>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Aparece atrás das mensagens desta modelo, como no WhatsApp.</p>
                {form.fotoFundoChat && <Foto referencia={form.fotoFundoChat} alt="Prévia do fundo" className="mb-3 h-40 w-full rounded-lg object-cover" />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => fundoRef.current?.click()} className="rounded-full border px-4 py-2 text-xs font-semibold">{form.fotoFundoChat ? "Trocar fundo" : "Escolher fundo"}</button>
                  {form.fotoFundoChat && <button type="button" onClick={() => { void removerImagem(form.fotoFundoChat); set({ fotoFundoChat: "" }); }} className="rounded-full border px-4 py-2 text-xs font-semibold text-destructive">Remover</button>}
                </div>
                <input ref={fundoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void lerFoto(f, form.id, "fundo", (ref) => set({ fotoFundoChat: ref })); e.target.value = ""; }} />
              </div>

              <div className="rounded-xl border bg-background p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <Video className="size-4 text-brand" />
                  <p className="font-semibold">Vídeo de fundo da chamada</p>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Este vídeo pertence somente a esta modelo. O arquivo pode ter até 50 MB e será usado como fundo quando o
                  cliente entrar na chamada com ela.
                </p>

                {form.videoChamadaUrl && previa && (
                  <div className="mb-3 overflow-hidden rounded-lg border bg-black">
                    <video
                      src={previa}
                      className="aspect-video w-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                      controls
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => videoRef.current?.click()}
                    className="rounded-full border px-4 py-2 text-xs font-semibold"
                  >
                    {form.videoChamadaUrl ? "Trocar vídeo" : "Enviar vídeo"}
                  </button>
                  {form.videoChamadaUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        void removerVideo(form.videoChamadaUrl);
                        set({ videoChamadaUrl: "" });
                        setVideoUrl("");
                      }}
                      className="rounded-full border px-4 py-2 text-xs font-semibold text-destructive"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <input
                  ref={videoRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) lerVideo(f, form.id, (dataUrl) => {
                      set({ videoChamadaUrl: dataUrl });
                      setVideoUrl("");
                    });
                    e.target.value = "";
                  }}
                />

                <div className="my-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">ou URL MP4</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex gap-2">
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://site.com/video.mp4"
                    className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!videoUrl.trim()) {
                        toast.error("Cole a URL do vídeo.");
                        return;
                      }
                      set({ videoChamadaUrl: videoUrl.trim() });
                      toast.success("Vídeo definido para esta modelo");
                    }}
                    className="rounded-lg bg-brand px-3 text-xs font-semibold text-primary-foreground"
                  >
                    Usar
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block font-medium">
                  Valor da chamada (por minuto, R$)
                </span>
                <input
                  type="number"
                  step="0.10"
                  min={0}
                  value={form.precoPorMinuto}
                  onChange={(e) => set({ precoPorMinuto: Math.max(0, +e.target.value || 0) })}
                  className="h-10 w-full rounded-lg border bg-background px-3 outline-none"
                />
              </label>

              <div>
                <p className="mb-1.5 font-medium">Opções de duração da chamada</p>
                <div className="flex gap-1.5">
                  {DURACOES_PADRAO.map((d) => {
                    const on = form.duracoes.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() =>
                          set({
                            duracoes: on
                              ? form.duracoes.filter((x) => x !== d)
                              : [...form.duracoes, d].sort((a, b) => a - b),
                          })
                        }
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                          on
                            ? "bg-brand text-primary-foreground"
                            : "border bg-background text-muted-foreground"
                        }`}
                      >
                        {d} min
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-5 pt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.online}
                    onChange={(e) => set({ online: e.target.checked })}
                    className="size-4 accent-[var(--brand)]"
                  />
                  <span>Online</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => set({ ativo: e.target.checked })}
                    className="size-4 accent-[var(--brand)]"
                  />
                  <span>Aparece no site</span>
                </label>
              </div>

              <button
                onClick={() => void salvar()}
                className="mt-2 w-full rounded-full bg-brand py-3 text-sm font-semibold text-primary-foreground"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
