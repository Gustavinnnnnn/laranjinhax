import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  X,
  LayoutDashboard,
  ReceiptText,
  Users,
  UserRound,
  Settings,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import { useDb } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel — Laranjinha" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel — Laranjinha" },
      { property: "og:description", content: "Painel de administração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const itens = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exato: true },
  { to: "/admin/vendas", label: "Histórico de vendas", icon: ReceiptText },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/modelos", label: "Modelos", icon: UserRound },
  { to: "/admin/carteira", label: "Carteira", icon: Wallet },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

function AdminLayout() {
  const { config } = useDb();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [verificando, setVerificando] = useState(pathname !== "/admin/login");
  const [autenticado, setAutenticado] = useState(pathname === "/admin/login");
  const [aberto, setAberto] = useState(false);
  const match = useMatchRoute();

  useEffect(() => {
    if (pathname === "/admin/login") {
      setVerificando(false);
      setAutenticado(true);
      return;
    }
    if (!supabase) {
      setVerificando(false);
      setAutenticado(false);
      navigate({ to: "/admin/login" });
      return;
    }

    let ativo = true;
    setVerificando(true);
    const validar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      const usuario = data.session?.user;
      if (!usuario) {
        setAutenticado(false);
        setVerificando(false);
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: ehAdmin } = await supabase.rpc("has_role", {
        _user_id: usuario.id,
        _role: "admin",
      });
      if (!ativo) return;
      if (ehAdmin) {
        setAutenticado(true);
        setVerificando(false);
      } else {
        await supabase.auth.signOut();
        setAutenticado(false);
        setVerificando(false);
        navigate({ to: "/admin/login" });
      }
    };
    void validar();


    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      if (!ativo || pathname === "/admin/login") return;
      if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED") return;
      if (session) {
        void validar();
      } else {
        setAutenticado(false);
        navigate({ to: "/admin/login" });
      }
    });


    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, pathname]);

  if (verificando) {
    return <div className="grid h-full min-h-screen place-items-center bg-background text-sm text-muted-foreground">Verificando acesso...</div>;
  }

  if (!autenticado) return null;

  const nav = (
    <nav className="flex flex-col gap-1">
      {itens.map(({ to, label, icon: Icon, ...rest }) => {
        const ativo = match({ to, ...(rest as object) });
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setAberto(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              ativo ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-full w-full bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <p className="mb-4 px-2 font-display text-lg">{config.nomeSite} · Painel</p>
        {nav}
      </aside>

      {/* Drawer mobile */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between px-2">
              <p className="font-display text-lg">{config.nomeSite} · Painel</p>
              <button aria-label="Fechar menu" onClick={() => setAberto(false)}>
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b bg-card px-4 py-3 md:hidden">
          <button aria-label="Abrir menu" onClick={() => setAberto(true)}>
            <Menu className="size-5" />
          </button>
          <p className="flex-1 truncate font-display text-lg">{config.nomeSite} · Painel</p>
          <Link to="/" aria-label="Ver site" className="text-muted-foreground">
            <ArrowLeft className="size-5" />
          </Link>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
