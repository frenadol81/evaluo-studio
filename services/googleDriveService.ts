/// <reference types="vite/client" />

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let cachedAccessToken: string | null = null;

export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const config = import.meta.env.VITE_FIREBASE_CONFIG;
    if (!config) throw new Error("Configura el teu projecte Firebase per activar Google Drive.");
    const auth = getAuth(getApps()[0] || initializeApp(JSON.parse(config)));
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No s\'ha pogut obtenir el token d\'accés de Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.log("L'usuari ha tancat la finestra emergent de Google.");
      return null;
    }
    console.error('Error en autenticació Google Drive:', error);
    if (error?.code === 'auth/popup-blocked') {
      throw new Error("El navegador ha blocat la finestra emergent. Si us plau, permet les finestres emergents i torna-ho a provar.");
    }
    throw error;
  }
};

export const getCachedAccessToken = () => cachedAccessToken;

/**
 * Llista els fitxers d'una carpeta de Google Drive especificada per folderId.
 */
export const listDriveFolderFiles = async (folderId: string, accessToken: string) => {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webContentLink,thumbnailLink)`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al consultar Google Drive (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
};

export const downloadStudentPhotoFiles = async (folderId: string, accessToken: string): Promise<File[]> => {
  const files = await listDriveFolderFiles(folderId, accessToken);
  const supported = files.filter((file: { name: string }) => /\.(png|jpe?g|webp|gif|bmp|docx?|odt|zip)$/i.test(file.name));
  const result: File[] = [];
  for (const file of supported) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`No s'ha pogut descarregar el fitxer ${file.name}.`);
    const blob = await res.blob();
    result.push(new File([blob], file.name, { type: blob.type }));
  }
  return result;
};
