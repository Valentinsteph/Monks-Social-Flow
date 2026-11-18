import { getAccessToken } from './googleAuth';
import { DriveFile } from '../types';

export interface DriveSearchFilters {
  searchTerm?: string;
  typeFilter?: 'all' | 'presentation' | 'document' | 'spreadsheet' | 'image' | 'video' | 'folder';
  folderId?: string;
}

export interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Fetch files from Google Drive
 */
export async function listDriveFiles(
  filters: DriveSearchFilters = {},
  pageToken?: string
): Promise<DriveFileListResponse> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Non authentifié à Google Drive. Veuillez vous connecter.');
  }

  const queryParts: string[] = ['trashed = false'];

  if (filters.folderId) {
    queryParts.push(`'${filters.folderId}' in parents`);
  }

  if (filters.searchTerm && filters.searchTerm.trim()) {
    const escaped = filters.searchTerm.trim().replace(/'/g, "\\'");
    queryParts.push(`name contains '${escaped}'`);
  }

  if (filters.typeFilter && filters.typeFilter !== 'all') {
    switch (filters.typeFilter) {
      case 'presentation':
        queryParts.push("mimeType = 'application/vnd.google-apps.presentation'");
        break;
      case 'document':
        queryParts.push("mimeType = 'application/vnd.google-apps.document'");
        break;
      case 'spreadsheet':
        queryParts.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
        break;
      case 'folder':
        queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
        break;
      case 'image':
        queryParts.push("mimeType contains 'image/'");
        break;
      case 'video':
        queryParts.push("mimeType contains 'video/'");
        break;
    }
  }

  const query = queryParts.join(' and ');
  const params = new URLSearchParams({
    q: query,
    fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, modifiedTime, size)',
    pageSize: '24',
    orderBy: 'modifiedTime desc',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `Erreur Google Drive (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Creates a new Google Slides presentation in Google Drive for a social post card
 */
export async function createGooglePresentation(
  title: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Non authentifié à Google Drive.');
  }

  const metadata: Record<string, any> = {
    name: title,
    mimeType: 'application/vnd.google-apps.presentation',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,webContentLink,iconLink,thumbnailLink,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Échec de la création de la présentation Google Slides');
  }

  return await response.json();
}

/**
 * Move a file to Google Drive trash (destructively mutates file state)
 * Note: Must be called only after user confirmation per safety guidelines.
 */
export async function trashDriveFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Non authentifié à Google Drive.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Échec de la mise à la corbeille du fichier');
  }
}

/**
 * Format bytes to readable size
 */
export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num)) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get user-friendly name and styling for Google Drive MIME types
 */
export function getMimeTypeDetails(mimeType: string): {
  label: string;
  badgeClass: string;
  isSlide: boolean;
} {
  switch (mimeType) {
    case 'application/vnd.google-apps.presentation':
      return {
        label: 'Google Slides',
        badgeClass: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
        isSlide: true,
      };
    case 'application/vnd.google-apps.document':
      return {
        label: 'Google Docs',
        badgeClass: 'bg-blue-950/70 border-blue-500/40 text-blue-300',
        isSlide: false,
      };
    case 'application/vnd.google-apps.spreadsheet':
      return {
        label: 'Google Sheets',
        badgeClass: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
        isSlide: false,
      };
    case 'application/vnd.google-apps.folder':
      return {
        label: 'Dossier',
        badgeClass: 'bg-zinc-800 border-zinc-650 text-zinc-300',
        isSlide: false,
      };
    case 'application/pdf':
      return {
        label: 'PDF',
        badgeClass: 'bg-red-950/70 border-red-500/40 text-red-300',
        isSlide: false,
      };
    default:
      if (mimeType.startsWith('image/')) {
        return {
          label: 'Image',
          badgeClass: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
          isSlide: false,
        };
      }
      if (mimeType.startsWith('video/')) {
        return {
          label: 'Vidéo',
          badgeClass: 'bg-pink-950/70 border-pink-500/40 text-pink-300',
          isSlide: false,
        };
      }
      return {
        label: 'Fichier',
        badgeClass: 'bg-zinc-800 border-zinc-700 text-zinc-400',
        isSlide: false,
      };
  }
}
