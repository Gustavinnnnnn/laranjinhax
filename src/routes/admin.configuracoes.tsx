import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Film } from "lucide-react";
import { useDb } from "@/lib/store";

export const Route = createFileRoute("/admin/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { config, atualizarConfig } = useDb();
  const [rascunho, setRascunho] = useState(config);

  useEffect(() => setRascunho(config), [config]);

  const salvar = () => {
    atualizarConfig({ ...rascunho, nomeSite: rascunho.nomeSite.trim() || "Laranjinha" });
    toast.success("Configurações salvas");
  };


  const campo = "h-10 w-full rounded-lg border bg-background px-3 outline-none";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-2xl">Configurações</h1>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Site</p>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nome do site</span>
          <input value={rascunho.nomeSite} onChange={(e) => setRascunho({ ...rascunho, nomeSite: e.target.value })} className={campo} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Descrição (aparece no buscador)</span>
          <textarea value={rascunho.descricao} onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 outline-none" />
        </label>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Film className="size-4" /> Vídeo da chamada</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Cada modelo tem o próprio vídeo de chamada. Envie o vídeo em Modelos, ao editar o perfil.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Pagamento</p>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Gateway</span>
          <select value={rascunho.provedorPagamento} disabled className={`${campo} text-muted-foreground`}>
            <option value="simulado">Simulado (pagamento de teste)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Chave Pix (opcional)</span>
          <input value={rascunho.chavePix} onChange={(e) => setRascunho({ ...rascunho, chavePix: e.target.value })} className={campo} placeholder="Se preencher, o cliente vê a chave antes de pagar" />
        </label>
        <p className="text-[12px] text-muted-foreground">Quando o gateway real for conectado (Stripe/Pix), ele passa a aparecer aqui.</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Carteira — divisão entre sócios</p>
        <p className="text-[12px] text-muted-foreground">Toda venda paga é dividida 50% para cada sócio.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Sócio 1</span>
            <input value={rascunho.parceiroA} onChange={(e) => setRascunho({ ...rascunho, parceiroA: e.target.value })} className={campo} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Sócio 2</span>
            <input value={rascunho.parceiroB} onChange={(e) => setRascunho({ ...rascunho, parceiroB: e.target.value })} className={campo} />
          </label>
        </div>
      </div>

      <button onClick={salvar} className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-primary-foreground">
        Salvar configurações
      </button>
    </div>
  );
}
