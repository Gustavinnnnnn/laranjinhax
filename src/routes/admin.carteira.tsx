import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, useDb } from "@/lib/store";

export const Route = createFileRoute("/admin/carteira")({ component: Carteira });

function Carteira() {
  const { vendas, config } = useDb();
  const [saques, setSaques] = useState<Record<string, number>>({});
  const pagas = vendas.filter((v) => v.status === "pago");
  const totalPago = pagas.reduce((s,v)=>s+v.valor,0);
  const pendente = vendas.filter((v)=>v.status==="pendente").reduce((s,v)=>s+v.valor,0);
  const porSocio = totalPago / 2;
  const sacar = (socio:string)=>(saques[socio]??0);
  const disponivel = (socio:string)=>porSocio-sacar(socio);
  const solicitarSaque=(socio:string)=>{if(disponivel(socio)<=0){toast.error("Sem saldo disponível");return;}setSaques(s=>({...s,[socio]:(s[socio]??0)+porSocio}));toast.success(`Saque de ${formatBRL(porSocio)} solicitado`);};
  return <div className="mx-auto max-w-xl space-y-5">
    <div><h1 className="font-display text-2xl">Carteira</h1><p className="mt-1 text-sm text-muted-foreground">Toda venda paga é dividida automaticamente: 50% para cada sócio.</p></div>
    <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground"><Banknote className="size-4"/><p className="text-[11px] font-medium uppercase tracking-wide">Receita paga</p></div><p className="mt-2 text-xl font-bold tabular-nums">{formatBRL(totalPago)}</p></div><div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4"/><p className="text-[11px] font-medium uppercase tracking-wide">A receber (pendente)</p></div><p className="mt-2 text-xl font-bold tabular-nums">{formatBRL(pendente)}</p></div></div>
    {[config.parceiroA||"Sócio 1",config.parceiroB||"Sócio 2"].map((socio,i)=><div key={i} className="rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">{socio}</p><span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">50%</span></div><p className="mt-3 text-2xl font-bold tabular-nums">{formatBRL(porSocio)}</p><p className="mt-0.5 text-[12px] text-muted-foreground">Disponível: {formatBRL(disponivel(socio))} · Sacado: {formatBRL(sacar(socio))}</p><button onClick={()=>solicitarSaque(socio)} className="mt-3 w-full rounded-full border py-2.5 text-sm font-semibold disabled:opacity-50" disabled={disponivel(socio)<=0}>Sacar</button></div>)}
    <p className="text-[12px] text-muted-foreground">Com o gateway de pagamento real conectado, os valores caem direto nas contas de cada sócio (split automático).</p>
  </div>;
}
