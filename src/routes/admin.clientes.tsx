import { createFileRoute } from "@tanstack/react-router";
import { formatBRL } from "@/lib/store";
import { useVendas } from "@/lib/pagamentos-cloud";

export const Route = createFileRoute("/admin/clientes")({
  component: Clientes,
});

function Clientes() {
  const { vendas } = useVendas();

  const porCliente = new Map<
    string,
    { cliente: string; pago: number; pendente: number; compras: number }
  >();
  for (const v of vendas) {
    const c = porCliente.get(v.cliente) ?? {
      cliente: v.cliente,
      pago: 0,
      pendente: 0,
      compras: 0,
    };
    c.compras += 1;
    if (v.status === "pago") c.pago += v.valor;
    else c.pendente += v.valor;
    porCliente.set(v.cliente, c);
  }
  const lista = [...porCliente.values()].sort((a, b) => b.pago - a.pago || b.pendente - a.pendente);

  const chip = (c: { pago: number; pendente: number }) =>
    c.pago > 0 ? (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
        Pagou
      </span>
    ) : c.pendente > 0 ? (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">
        Pendente
      </span>
    ) : (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
        Só gerou
      </span>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem pagou, quem está pendente e quem só gerou venda.
        </p>
      </div>

      {lista.length === 0 && (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum cliente ainda. Assim que alguém comprar uma chamada, aparece aqui.
        </p>
      )}

      <div className="space-y-2">
        {lista.map((c) => (
          <div key={c.cliente} className="rounded-xl border bg-card p-3.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-sm font-semibold">{c.cliente}</p>
              {chip(c)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[12px]">
              <div className="rounded-lg bg-muted/60 p-2">
                <p className="text-muted-foreground">Pago</p>
                <p className="mt-0.5 font-bold tabular-nums">{formatBRL(c.pago)}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-2">
                <p className="text-muted-foreground">Pendente</p>
                <p className="mt-0.5 font-bold tabular-nums">{formatBRL(c.pendente)}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-2">
                <p className="text-muted-foreground">Compras</p>
                <p className="mt-0.5 font-bold tabular-nums">{c.compras}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
