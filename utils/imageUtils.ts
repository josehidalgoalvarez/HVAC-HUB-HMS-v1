import { apiClient } from '../src/api/client';

/**
 * Compresses and resizes an image file to a Base64 string or URL.
 * In v2: Default cap raised to ~1600px, JPEG quality ~0.7.
 * When VITE_USE_API is enabled, compressAndUploadImage() uploads to POST /api/photos
 * and returns the hosted URL, guaranteeing localStorage never holds base64 photos.
 */
export const compressImage = (file: File | Blob, maxWidth = 1600, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while resizing
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Fill white background (transparency becomes black in JPEG otherwise)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};

/**
 * Compresses image to a standard Blob object for multipart upload.
 */
export const compressImageToBlob = (
  file: File | Blob,
  maxWidth = 1600,
  quality = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};

/**
 * High-level helper:
 * Compresses client-side, then uploads to POST /api/photos if VITE_USE_API=true,
 * returning the photo URL.
 * Falls back to local data URL if VITE_USE_API=false.
 */
export const compressAndUploadImage = async (
  file: File | Blob,
  options?: {
    maxWidth?: number;
    quality?: number;
    entityType?: string;
    entityId?: string | number;
    caption?: string;
  }
): Promise<string> => {
  const maxWidth = options?.maxWidth ?? 1600;
  const quality = options?.quality ?? 0.7;
  const useApi = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_API === 'true');

  if (useApi) {
    const compressedBlob = await compressImageToBlob(file, maxWidth, quality);
    const result = await apiClient.uploadPhoto(compressedBlob, {
      entityType: options?.entityType ?? 'general',
      entityId: options?.entityId,
      caption: options?.caption,
    });
    return result.url;
  }

  // Fallback for offline local demo
  return compressImage(file, maxWidth, quality);
};
