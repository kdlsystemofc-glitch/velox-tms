/**
 * VELOX — Compressão de imagem no cliente (antes do upload).
 * Reduz fotos de NF/comprovante/ocorrência (que vêm pesadas da câmera) para
 * uploads rápidos em 4G e menos custo de storage. Degrada com segurança:
 * se algo falhar, devolve o arquivo original.
 */
export async function compressImage(file, { maxDim = 1600, quality = 0.7 } = {}) {
  try {
    if (!file || !file.type?.startsWith("image/") || file.type === "image/gif") return file;
    if (file.size < 300 * 1024) return file; // já é pequeno, não mexe

    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;

    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // não compensou

    const name = (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
