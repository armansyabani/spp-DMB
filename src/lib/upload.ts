import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const isStorageConfigured = Boolean(storage);

/**
 * Upload a file (image/video/etc). If Firebase Storage is configured, the file
 * is uploaded there and a permanent https download URL is returned. If not
 * configured, it gracefully falls back to a base64 data URL so the app keeps
 * working locally without any setup.
 */
export async function uploadFile(file: File, folder: string): Promise<{ url: string; storagePath?: string }> {
  if (!storage) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
    return { url: dataUrl };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${cleanName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return { url, storagePath: path };
}

export async function deleteUploadedFile(storagePath?: string) {
  if (!storage || !storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.warn('Gagal menghapus file dari Storage (mungkin sudah terhapus):', err);
  }
}
