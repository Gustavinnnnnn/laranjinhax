import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CircleCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, useDb } from "@/lib/store";

export const Route = createFileRoute("/admin/vendas")({ component: Vendas });

const filtros = [
  { id: "todas", label: "Todas" },
  { id: "pagas", label: "Pagas" },
  { id: "pendentes", label: "Pendentes" },
] as const;
type Filtro = (typeof filtros)[number]["id"];

function Vendas() {
  const { vendas, marcarPago, cancelarVenda } = useDb();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const lista = vendas.filter((v) => filtro === "todas" ? true : filtro === "pagas" ? v.status === "pago" : v.status === "pendente");
  return <div className="space-y-4">
    <h1 className="font-display text-2xl">Histórico de vendas</h1>
    <div className="flex gap-1.5">{filtros.map((f) => <button key={f.id} onClick={() => setFiltro(f.id)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${filtro === f.id ? "bg-brand text-primary-foreground" : "border bg-card text-muted-foreground"}`}>{f.label}</button>)}</div>
    {lista.length === 0 && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma venda {filtro === "pendentes" ? "pendente" : filtro} por aqui.</p>}
    <div className="space-y-2">{lista.map((v) => <div key={v.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{v.modeloNome}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${v.status === "pago" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>{v.status === "pago" ? "Paga" : "Pendente"}</span></div><p className="mt-0.5 text-[12px] text-muted-foreground">{v.cliente} · {v.minutos} min · {new Date(v.criadoEm).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</p></div>
      <p className="shrink-0 text-sm font-bold tabular-nums">{formatBRL(v.valor)}</p>
      </div>)}</div>
    </div>)}</div>
  </div>;
}
