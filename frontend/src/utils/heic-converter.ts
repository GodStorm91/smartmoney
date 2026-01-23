import heic2any from 'heic2any';

export async function convertHeicToJpeg(file: File): Promise<File> {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop() || '';
  
  // Check if file is HEIC or HEIF format
  if (!['heic', 'heif'].includes(fileExtension)) {
    return file; // Not HEIC, return original
  }

  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });

    // Convert Blob to File
    const convertedArrayBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    const newFileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
    
    const convertedFile = new File([convertedArrayBlob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image. Please try a different format.');
  }
}

export function isHeicFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop() || '';
  return ['heic', 'heif'].includes(fileExtension);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || isHeicFile(file);
}
