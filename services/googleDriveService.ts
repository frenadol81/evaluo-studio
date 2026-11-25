/// <reference types="vite/client" />

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let cachedAccessToken: string | null = null;

export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const config = import.meta.env.VITE_FIREBASE_CONFIG;
    if (!config) throw new Error("Configura el teu projecte Firebase per activar Google Drive.");
    const accountHint = import.meta.env.VITE_DRIVE_LOGIN_HINT?.trim();
    provider.setCustomParameters(accountHint
      ? { prompt: 'select_account', login_hint: accountHint }
      : { prompt: 'select_account' });
    const auth = getAuth(getApps()[0] || initializeApp(JSON.parse(config)));
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No s\'ha pogut obtenir el token d\'accés de Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error(`Firebase no permet iniciar sessió des de ${window.location.hostname}. A Firebase Console, obre Authentication → Settings → Authorized domains i afegeix ${window.location.hostname} com a domini.`);
    }
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
  const files: { id: string; name: string; mimeType: string }[] = [];
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'nextPageToken,files(id,name,mimeType)',
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  do {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Error al consultar Google Drive (${res.status}).`);
    const page = await res.json();
    files.push(...(page.files || []));
    if (!page.nextPageToken) break;
    params.set('pageToken', page.nextPageToken);
  } while (true);
  return files;
};

export type DrivePhotoFile = File & { photoFolders: string[] };

export const downloadStudentPhotoFiles = async (folderLink: string, accessToken: string) => {
  const input = folderLink.trim();
  const folderId = /^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/i.exec(input)?.[1] || input;
  if (!/^[\w-]+$/.test(folderId)) throw new Error('Introdueix un ID o un enllaç de carpeta de Drive vàlid.');
  const result: DrivePhotoFile[] = [];
  const errors: string[] = [];
  const folders = [{ id: folderId, path: [] as string[] }];
  const visited = new Set<string>();
  for (const folder of folders) {
    if (visited.has(folder.id)) continue;
    visited.add(folder.id);
    let files;
    try {
      files = await listDriveFolderFiles(folder.id, accessToken);
    } catch (error) {
      if (folder.id === folderId) throw error;
      errors.push(folder.path.join(' / ') + ': no es pot obrir la carpeta.');
      continue;
    }
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        folders.push({ id: file.id, path: [...folder.path, file.name] });
        continue;
      }
      if (!/\.(png|jpe?g|webp|gif|bmp|docx?|odt|zip)$/i.test(file.name)) continue;
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        result.push(Object.assign(new File([blob], file.name, { type: blob.type }), { photoFolders: folder.path }));
      } catch {
        errors.push(file.name + ': no es pot descarregar des de Drive.');
      }
    }
  }
  return { files: result, errors };
};
