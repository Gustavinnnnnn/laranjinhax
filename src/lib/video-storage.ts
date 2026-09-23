import { supabase } from "@/integrations/supabase/client";

const BUCKET = "modelos";
export const VIDEO_REF_PREFIX = "storage:";

export function ehReferenciaVideo(valor: string) {
  return valor.startsWith(VIDEO_REF_PREFIX);
}

export function caminhoDaReferencia(valor: string) {
  return valor.slice(VIDEO_REF_PREFIX.length);
}

/** Envia o vídeo para o armazenamento na nuvem e devolve a referência salva no perfil. */
export async function salvarVideo(modeloId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `videos/${modeloId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "video/mp4",
  });
  if (error) throw error;
  return `${VIDEO_REF_PREFIX}${path}`;
}

export async function removerVideo(ref: string): Promise<void> {
  if (!ref || !ehReferenciaVideo(ref)) return;
  await supabase.storage.from(BUCKET).remove([caminhoDaReferencia(ref)]);
}

/** Converte a referência guardada no perfil em uma URL que o navegador consegue tocar. */
export async function resolverVideo(ref: string): Promise<string> {
  if (!ref) return "";
  if (!ehReferenciaVideo(ref)) return ref;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminhoDaReferencia(ref), 60 * 60 * 12);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}
