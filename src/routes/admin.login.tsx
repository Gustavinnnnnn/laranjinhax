import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!supabase) {
      setCarregando(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) navigate({ to: "/admin" });
      else if (ativo) setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast.error("Supabase não está configurado neste ambiente.");
      return;
    }
    if (!email.trim() || !senha) {
      toast.error("Informe e-mail e senha.");
      return;
    }

    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setEntrando(false);

    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }

    toast.success("Login realizado.");
    navigate({ to: "/admin" });
  }

  if (carregando) {
    return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Verificando acesso...</div>;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="font-display text-2xl">Painel administrativo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para acessar o Vínculo.</p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">E-mail</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="seu@email.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={entrando}
            className="mt-2 h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {entrando ? "Entrando..." : "Entrar no painel"}
          </button>
        </div>
      </form>
    </main>
  );
}
