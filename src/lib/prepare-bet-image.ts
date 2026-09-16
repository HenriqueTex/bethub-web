export type ImageCrop = {
  left: number
  top: number
  right: number
  bottom: number
}
export const fullImageCrop: ImageCrop = { left: 0, top: 0, right: 0, bottom: 0 }
export const BET_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]

export function validateBetImage(file: File) {
  if (!BET_IMAGE_TYPES.includes(file.type))
    throw new Error("Use uma imagem PNG, JPG ou WebP.")
  if (file.size > 10 * 1024 * 1024)
    throw new Error("A imagem deve ter até 10 MB.")
}

export async function prepareBetImage(
  file: File,
  crop: ImageCrop = fullImageCrop
) {
  validateBetImage(file)
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error(
        "A imagem é muito grande. Envie um recorte do comprovante."
      )
    const x = Math.round((bitmap.width * crop.left) / 100)
    const y = Math.round((bitmap.height * crop.top) / 100)
    const width = Math.max(
      1,
      Math.round((bitmap.width * (100 - crop.left - crop.right)) / 100)
    )
    const height = Math.max(
      1,
      Math.round((bitmap.height * (100 - crop.top - crop.bottom)) / 100)
    )
    const scale = Math.min(1, 2400 / Math.max(width, height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext("2d")
    if (!context)
      throw new Error("Não foi possível preparar a imagem neste navegador.")
    context.drawImage(
      bitmap,
      x,
      y,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height
    )
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Não foi possível preparar a imagem.")),
        "image/webp",
        0.94
      )
    )
    if (
      scale === 1 &&
      Object.values(crop).every((value) => value === 0) &&
      blob.size >= file.size
    )
      return file
    return new File(
      [blob],
      blob.type === "image/webp" ? "aposta.webp" : "aposta.png",
      { type: blob.type }
    )
  } finally {
    bitmap.close()
  }
}
