import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Informa se já existe um administrador cadastrado. */
export const existeAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { existe: (count ?? 0) > 0 };
});

/** Cria o primeiro acesso do painel. Só funciona enquanto não houver administrador. */
export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) =>
    z.object({ email: z.string().email(), senha: z.string().min(8).max(72) }).parse(entrada),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      return { ok: false as const, erro: "Já existe um administrador cadastrado." };
    }

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
    });
    if (error || !criado.user) {
      console.error("[admin] falha ao criar administrador", error?.message);
      return { ok: false as const, erro: "Não foi possível criar o acesso." };
    }

    const { error: erroPapel } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: criado.user.id, role: "admin" });
    if (erroPapel) {
      console.error("[admin] falha ao dar permissão", erroPapel.message);
      return { ok: false as const, erro: "Acesso criado, mas a permissão falhou." };
    }

    console.info("[admin] primeiro administrador criado");
    return { ok: true as const };
  });
