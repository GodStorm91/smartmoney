/**
 * Image processing utilities for receipt scanning
 */

/**
 * Resize and compress image to max dimensions while maintaining aspect ratio
 * @param file - Image file to process
 * @param maxWidth - Maximum width (default 1024)
 * @param maxHeight - Maximum height (default 1024)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Base64 encoded JPEG image with data URL prefix
 */
export async function processImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      let { width, height } = img

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      // Draw image to canvas (this resizes it)
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to base64 JPEG
      const base64 = canvas.toDataURL('image/jpeg', quality)

      // Clean up object URL
      URL.revokeObjectURL(img.src)

      resolve(base64)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }

    // Create object URL for the file
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert base64 data URL to raw base64 (without prefix)
 * @param dataUrl - Full data URL (data:image/jpeg;base64,...)
 * @returns Raw base64 string
 */
export function dataUrlToBase64(dataUrl: string): string {
  if (dataUrl.includes('base64,')) {
    return dataUrl.split('base64,')[1]
  }
  return dataUrl
}

/**
 * Get media type from data URL
 * @param dataUrl - Full data URL
 * @returns Media type (e.g., 'image/jpeg')
 */
export function getMediaType(dataUrl: string): string {
  if (dataUrl.startsWith('data:') && dataUrl.includes(';')) {
    return dataUrl.substring(5, dataUrl.indexOf(';'))
  }
  return 'image/jpeg'
}
