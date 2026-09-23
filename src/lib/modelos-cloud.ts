import { supabase } from "@/integrations/supabase/client";
import type { Modelo } from "@/lib/store";

type Linha = {
  id: string;
  nome: string;
  idade: number;
  online: boolean;
  ativo: boolean;
  descricao: string;
  foto: string;
  preco_por_minuto: number | string;
  duracoes: number[] | null;
  video_chamada_url: string;
  foto_fundo_chat: string;
};

const paraModelo = (r: Linha): Modelo => ({
  id: r.id,
  nome: r.nome,
  idade: r.idade,
  online: r.online,
  ativo: r.ativo,
  descricao: r.descricao,
  foto: r.foto,
  precoPorMinuto: Number(r.preco_por_minuto),
  duracoes: r.duracoes ?? [],
  videoChamadaUrl: r.video_chamada_url ?? "",
  fotoFundoChat: r.foto_fundo_chat ?? "",
});

const paraLinha = (m: Modelo) => ({
  id: m.id,
  nome: m.nome,
  idade: m.idade,
  online: m.online,
  ativo: m.ativo,
  descricao: m.descricao,
  foto: m.foto,
  preco_por_minuto: m.precoPorMinuto,
  duracoes: m.duracoes,
  video_chamada_url: m.videoChamadaUrl,
  foto_fundo_chat: m.fotoFundoChat,
});

export async function listarModelos(): Promise<Modelo[]> {
  const { data, error } = await supabase
    .from("modelos")
    .select("*")
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Linha[]).map(paraModelo);
}

export async function gravarModelo(m: Modelo): Promise<Modelo> {
  const { data, error } = await supabase
    .from("modelos")
    .upsert(paraLinha(m) as never)
    .select()
    .single();
  if (error) throw error;
  return paraModelo(data as unknown as Linha);
}

export async function apagarModelo(id: string): Promise<void> {
  const { error } = await supabase.from("modelos").delete().eq("id", id);
  if (error) throw error;
}
