import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, Clock, CircleDollarSign, ReceiptText } from "lucide-react";
import { formatBRL } from "@/lib/store";
import { useVendas } from "@/lib/pagamentos-cloud";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const periodos = [
  { id: "hoje", label: "Hoje", dias: 1 },
  { id: "7d", label: "7 dias", dias: 7 },
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "tudo", label: "Tudo", dias: 0 },
] as const;

type Periodo = (typeof periodos)[number]["id"];

function Dashboard() {
  const { vendas } = useVendas();
  const [periodo, setPeriodo] = useState<Periodo>("7d");

  const dias = periodos.find((p) => p.id === periodo)!.dias;
  const limite = dias > 0 ? Date.now() - dias * 24 * 3600 * 1000 : 0;
  const noPeriodo = vendas.filter((v) => new Date(v.criadoEm).getTime() >= limite);

  const pagas = noPeriodo.filter((v) => v.status === "pago");
  const receita = pagas.reduce((s, v) => s + v.valor, 0);
  const pendente = noPeriodo
    .filter((v) => v.status === "pendente")
    .reduce((s, v) => s + v.valor, 0);
  const ticket = pagas.length ? receita / pagas.length : 0;

  // Vendas pagas por dia (últimos 14 dias)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const barras = Array.from({ length: 14 }, (_, i) => {
    const dia = new Date(hoje.getTime() - (13 - i) * 24 * 3600 * 1000);
    const total = vendas
      .filter((v) => {
        const d = new Date(v.criadoEm);
        return (
          v.status === "pago" &&
          d >= dia &&
          d < new Date(dia.getTime() + 24 * 3600 * 1000)
        );
      })
      .reduce((s, v) => s + v.valor, 0);
    return { dia, total };
  });
  const max = Math.max(...barras.map((b) => b.total), 1);

  const cards = [
    { label: "Receita paga", valor: formatBRL(receita), icon: CircleDollarSign },
    { label: "Vendas pendentes", valor: formatBRL(pendente), icon: Clock },
    { label: "Vendas pagas", valor: String(pagas.length), icon: ReceiptText },
    { label: "Ticket médio", valor: formatBRL(ticket), icon: TrendingUp },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">Dashboard</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {periodos.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                periodo === p.id
                  ? "bg-brand text-primary-foreground"
                  : "border bg-card text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, valor, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-4" />
              <p className="text-[11px] font-medium uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">{valor}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Receita paga — últimos 14 dias</p>
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {barras.map(({ dia, total }, i) => (
            <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  title={`${dia.toLocaleDateString("pt-BR")}: ${formatBRL(total)}`}
                  className="w-full rounded-t bg-brand/80 transition-colors group-hover:bg-brand"
                  style={{ height: `${Math.max((total / max) * 100, total > 0 ? 6 : 2)}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{dia.getDate()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
