export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { throw new Error('This image could not be opened. Try another photo.') }
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('Choose a photo smaller than 40 megapixels.')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this photo.')
    const size = Math.min(bitmap.width, bitmap.height)
    context.fillStyle = '#fffcf7'
    context.fillRect(0, 0, 256, 256)
    context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256)
    const photo = canvas.toDataURL('image/jpeg', 0.85)
    if (photo.length > 90_000) throw new Error('This photo is too detailed. Try a simpler image.')
    return photo
  } finally { bitmap.close() }
}
