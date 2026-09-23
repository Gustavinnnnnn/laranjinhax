import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "modelos";
export const IMG_REF_PREFIX = "storage:";

const cache = new Map<string, { url: string; exp: number }>();

export function ehReferenciaImagem(valor: string) {
  return valor.startsWith(IMG_REF_PREFIX);
}

/** Reduz a imagem e envia para o armazenamento na nuvem; devolve a referência salva no perfil. */
export async function salvarImagem(modeloId: string, tipo: "foto" | "fundo", file: File): Promise<string> {
  const blob = await reduzirImagem(file, tipo === "fundo" ? 1400 : 1000);
  const path = `imagens/${modeloId}-${tipo}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return `${IMG_REF_PREFIX}${path}`;
}

export async function removerImagem(ref: string): Promise<void> {
  if (!ref || !ehReferenciaImagem(ref)) return;
  cache.delete(ref);
  await supabase.storage.from(BUCKET).remove([ref.slice(IMG_REF_PREFIX.length)]);
}

/** Converte a referência guardada no perfil em uma URL que o navegador consegue exibir. */
export async function resolverImagem(ref: string): Promise<string> {
  if (!ref) return "";
  if (!ehReferenciaImagem(ref)) return ref;
  const guardado = cache.get(ref);
  if (guardado && guardado.exp > Date.now()) return guardado.url;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ref.slice(IMG_REF_PREFIX.length), 60 * 60 * 12);
  if (error || !data?.signedUrl) return "";
  cache.set(ref, { url: data.signedUrl, exp: Date.now() + 60 * 60 * 11 * 1000 });
  return data.signedUrl;
}

/** Hook para exibir uma foto guardada na nuvem (ou uma URL/data-url antiga). */
export function useImagem(ref: string): string {
  const inicial = ref && !ehReferenciaImagem(ref) ? ref : (cache.get(ref)?.url ?? "");
  const [src, setSrc] = useState(inicial);
  useEffect(() => {
    let ativo = true;
    if (!ref) {
      setSrc("");
      return;
    }
    if (!ehReferenciaImagem(ref)) {
      setSrc(ref);
      return;
    }
    void resolverImagem(ref).then((url) => {
      if (ativo) setSrc(url);
    });
    return () => {
      ativo = false;
    };
  }, [ref]);
  return src;
}

function reduzirImagem(file: File, maxLado: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha ao processar imagem"))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("imagem inválida"));
    img.src = URL.createObjectURL(file);
  });
}
