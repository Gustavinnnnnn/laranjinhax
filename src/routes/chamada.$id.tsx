import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, SwitchCamera, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/lib/store";
import { resolverVideo } from "@/lib/video-storage";

export const Route = createFileRoute("/chamada/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    min: Number(search["min"]) > 0 ? Number(search["min"]) : 10,
  }),
  head: () => ({ meta: [{ title: "Chamada — Laranjinha" }, { name: "description", content: "Chamada de vídeo privada na Laranjinha." }, { property: "og:title", content: "Chamada — Laranjinha" }, { property: "og:description", content: "Chamada de vídeo privada na Laranjinha." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Chamada,
});

const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function Chamada() {
  const { id } = Route.useParams();
  const { min } = Route.useSearch();
  const { modelos } = useDb();
  const perfil = modelos.find((m) => m.id === id);
  const navigate = useNavigate();

  const [conectada, setConectada] = useState(false);
  const [decorrido, setDecorrido] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [somOn, setSomOn] = useState(true);
  const [frontal, setFrontal] = useState(true);
  const [semCamera, setSemCamera] = useState(false);
  const [videoFundo, setVideoFundo] = useState("");

  const localRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let ativo = true;
    const ref = perfil?.videoChamadaUrl ?? "";
    if (!ref) {
      setVideoFundo("");
      return;
    }
    void resolverVideo(ref)
      .then((url) => {
        if (ativo) setVideoFundo(url);
      })
      .catch(() => setVideoFundo(""));
    return () => {
      ativo = false;
    };
  }, [perfil?.videoChamadaUrl]);

  const total = Math.max(min * 60, 60);
  const restante = Math.max(total - decorrido, 0);

  const limpar = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const encerrar = useCallback((automatico = false) => {
    limpar();
    if (automatico) toast.info("O tempo da chamada terminou");
    navigate({ to: "/conversas/$id", params: { id } });
  }, [id, limpar, navigate]);

  const iniciarMidia = useCallback(async (modoFrontal: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSemCamera(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: modoFrontal ? "user" : "environment" },
        audio: true,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setSemCamera(false);
      if (localRef.current) localRef.current.srcObject = stream;
      setMicOn(stream.getAudioTracks()[0]?.enabled ?? true);
      setCamOn(stream.getVideoTracks()[0]?.enabled ?? true);
    } catch {
      setSemCamera(true);
      toast.error("Câmera/microfone indisponíveis", {
        description: "A chamada continua em modo visual. Você pode permitir o acesso nas configurações do navegador.",
      });
    }
  }, []);

  useEffect(() => {
    void iniciarMidia(true);
    const connectTimer = window.setTimeout(() => setConectada(true), 900);
    return () => {
      window.clearTimeout(connectTimer);
      limpar();
    };
  }, [iniciarMidia, limpar]);

  useEffect(() => {
    if (!conectada) return;
    const timer = window.setInterval(() => {
      setDecorrido((value) => {
        if (value + 1 >= total) {
          window.clearInterval(timer);
          encerrar(true);
          return total;
        }
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [conectada, total, encerrar]);

  if (!perfil) {
    return <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6 text-center"><div><p className="font-display text-2xl">Perfil não encontrado</p><Link to="/" className="mt-2 inline-block text-sm text-brand underline">Voltar</Link></div></main>;
  }

  const alternarMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const alternarCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const trocarCamera = async () => {
    await iniciarMidia(!frontal);
    setFrontal((value) => !value);
  };

  return (
    <main className="relative mx-auto h-[100dvh] w-full max-w-[560px] overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden bg-slate-950">
        {videoFundo && (
          <video
            key={videoFundo}
            src={videoFundo}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-transparent to-slate-950/90" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-950/95 to-transparent" />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="rounded-full bg-black/30 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md">
          {conectada ? "● chamada conectada" : "Chamando…"}
        </div>
        <p className="mt-3 text-xl font-bold">{perfil.nome}</p>
        <p className="text-xs text-white/65">{conectada ? mmss(decorrido) : `conectando · ${min} min`}</p>
      </div>

      <div className="absolute right-4 top-24 z-20 h-36 w-28 overflow-hidden rounded-2xl bg-slate-800 shadow-2xl ring-2 ring-white/20">
        <video ref={localRef} autoPlay playsInline muted className={`size-full object-cover ${camOn ? "" : "opacity-0"}`} />
        {(!camOn || semCamera) && (
          <div className="absolute inset-0 grid place-items-center bg-slate-800 text-center text-[10px] text-white/60">
            {semCamera ? "Câmera indisponível" : "Câmera desligada"}
          </div>
        )}
        <span className="absolute bottom-1.5 left-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] text-white/80">Você</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-center gap-2 text-[11px] text-white/55">
          <span>{semCamera ? "Modo visual" : "Câmera e microfone ativos"}</span>
          <span>•</span>
          <span>{mmss(restante)} restantes</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={alternarMic} aria-label="Microfone" className="grid size-13 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md">
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button onClick={alternarCam} aria-label="Câmera" className="grid size-13 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md">
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button onClick={() => void trocarCamera()} aria-label="Trocar câmera" className="grid size-13 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md">
            <SwitchCamera className="size-5" />
          </button>
          <button onClick={() => setSomOn((value) => !value)} aria-label="Som" className="grid size-13 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md">
            {somOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
          <button onClick={() => encerrar()} aria-label="Encerrar" className="grid size-13 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30">
            <PhoneOff className="size-5" />
          </button>
        </div>
      </div>
    </main>
  );
}
