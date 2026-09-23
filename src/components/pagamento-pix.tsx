import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/store";

type Etapa = "dados" | "gerando" | "pix" | "confirmado" | "falhou";

type Deposito = { depositId: string; amount: number; pixCode: string; minutos: number };

const soDigitos = (v: string) => v.replace(/\D/g, "");
const mascaraCpf = (v: string) =>
  soDigitos(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const mascaraTelefone = (v: string) =>
  soDigitos(v).slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");

const CHAVE_DADOS = "vinculo-cliente-dados-v1";

export function PagamentoPix({
  modeloId,
  modeloNome,
  minutos,
  valor,
  clienteRotulo,
  onFechar,
  onPago,
}: {
  modeloId: string;
  modeloNome: string;
  minutos: number;
  valor: number;
  clienteRotulo: string;
  onFechar: () => void;
  onPago: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [erro, setErro] = useState("");
  const [deposito, setDeposito] = useState<Deposito | null>(null);
  const [qr, setQr] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", telefone: "" });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_DADOS);
      if (salvo) setForm({ ...form, ...(JSON.parse(salvo) as typeof form) });
    } catch {
      /* sem dados salvos */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const gerar = async () => {
    setErro("");
    setEtapa("gerando");
    try {
      const res = await fetch("/api/public/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modeloId,
          minutos,
          clienteRotulo,
          cliente: { ...form, cpf: soDigitos(form.cpf), telefone: soDigitos(form.telefone) },
        }),
      });
      const dados = (await res.json().catch(() => ({}))) as Partial<Deposito> & { error?: string };
      if (!res.ok || !dados.pixCode || !dados.depositId) {
        setErro(dados.error ?? "Não foi possível gerar o Pix agora.");
        setEtapa("dados");
        return;
      }
      try {
        localStorage.setItem(CHAVE_DADOS, JSON.stringify(form));
      } catch {
        /* ignora */
      }
      const dep = {
        depositId: dados.depositId,
        amount: Number(dados.amount ?? valor),
        pixCode: dados.pixCode,
        minutos: Number(dados.minutos ?? minutos),
      };
      setDeposito(dep);
      setQr(await QRCode.toDataURL(dep.pixCode, { width: 520, margin: 1 }));
      setEtapa("pix");
      acompanhar(dep.depositId);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setEtapa("dados");
    }
  };

  const acompanhar = (depositId: string) => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/public/deposits/${depositId}/status`);
        if (!res.ok) return;
        const dados = (await res.json()) as { status: string };
        if (dados.status === "completed") {
          if (timer.current) window.clearInterval(timer.current);
          setEtapa("confirmado");
        } else if (dados.status === "failed" || dados.status === "refunded") {
          if (timer.current) window.clearInterval(timer.current);
          setEtapa("falhou");
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 5000);
  };

  const copiar = async () => {
    if (!deposito) return;
    try {
      await navigator.clipboard.writeText(deposito.pixCode);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = deposito.pixCode;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    toast.success("Código copiado!");
    window.setTimeout(() => setCopiado(false), 2500);
  };

  const podeGerar = form.nome.trim().length >= 3 && soDigitos(form.cpf).length === 11 && form.email.includes("@") && soDigitos(form.telefone).length >= 10;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-900/60 sm:items-center sm:justify-center">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-xl">Pagar com Pix</p>
            <p className="text-xs text-slate-500">
              {modeloNome} · {minutos} minutos
            </p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-4 text-center font-display text-3xl">{formatBRL(deposito?.amount ?? valor)}</p>

        {etapa === "dados" && (
          <div className="mt-4 space-y-2.5">
            <p className="text-center text-xs text-slate-500">Confirme seus dados para gerar o Pix.</p>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome completo"
              autoComplete="name"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: mascaraCpf(e.target.value) })}
              placeholder="CPF"
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="E-mail"
              inputMode="email"
              autoComplete="email"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
              placeholder="Telefone com DDD"
              inputMode="tel"
              autoComplete="tel"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            {erro && <p className="text-center text-xs font-medium text-red-600">{erro}</p>}
            <button
              onClick={() => void gerar()}
              disabled={!podeGerar}
              className="mt-1 h-12 w-full rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 disabled:opacity-50"
            >
              Gerar Pix
            </button>
          </div>
        )}

        {etapa === "gerando" && (
          <div className="mt-8 mb-6 flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="size-7 animate-spin text-brand" />
            <p className="text-sm">Gerando Pix…</p>
          </div>
        )}

        {etapa === "pix" && deposito && (
          <div className="mt-4">
            {qr && (
              <img
                src={qr}
                alt="QR Code do Pix"
                className="mx-auto size-56 rounded-2xl ring-1 ring-slate-200"
              />
            )}
            <p className="mt-3 text-center text-xs text-slate-500">
              Escaneie o QR Code pelo aplicativo do seu banco
            </p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Pix copia e cola</p>
            <p className="mt-1 max-h-20 overflow-y-auto break-all rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
              {deposito.pixCode}
            </p>
            <button
              onClick={() => void copiar()}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20"
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Código copiado!" : "Copiar código Pix"}
            </button>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-amber-600">
              <span className="size-2 animate-pulse rounded-full bg-amber-500" />
              Aguardando pagamento…
            </div>
          </div>
        )}

        {etapa === "confirmado" && (
          <div className="mt-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="size-7" />
            </div>
            <p className="mt-3 font-display text-xl">Pagamento confirmado!</p>
            <p className="mt-1 text-xs text-slate-500">Sua chamada já está liberada.</p>
            <button
              onClick={onPago}
              className="mt-5 h-12 w-full rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20"
            >
              Continuar
            </button>
          </div>
        )}

        {etapa === "falhou" && (
          <div className="mt-6 text-center">
            <p className="font-display text-lg">O pagamento não foi concluído</p>
            <p className="mt-1 text-xs text-slate-500">Você pode tentar gerar um novo Pix.</p>
            <button
              onClick={() => {
                setDeposito(null);
                setQr("");
                setEtapa("dados");
              }}
              className="mt-5 h-12 w-full rounded-xl bg-brand text-sm font-bold text-white"
            >
              Tentar de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
