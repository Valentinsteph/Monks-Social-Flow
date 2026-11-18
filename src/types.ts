export type StageId = string;

export type PlatformId =
  | 'instagram'
  | 'youtube'
  | 'x'
  | 'facebook';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  shortName: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  iconName: string;
}

export interface StageConfig {
  id: StageId;
  boardId?: string;
  label: string;
  shortLabel?: string;
  description: string;
  accentColor: string;
  indicatorBg: string;
  borderColor: string;
  order?: number;
  visibility?: 'workspace';
  ownerId?: string;
}

export interface BoardConfig {
  id: string;
  name: string;
  description?: string;
  visibility: 'workspace';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  boardId: string;
  name: string;
  visibility: 'workspace';
  order: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignee {
  name: string;
  role?: string;
  initials: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface ContentCard {
  id: string;
  boardId?: string;
  title: string;
  client: string; // PA / Projet (Brand, Gemini, Pixel, Search, Partenariat Foot, etc.)
  campaign?: string;
  stageId: StageId;
  platforms: PlatformId[];
  slideUrl?: string;
  driveFile?: DriveFile;
  publicationDate?: string; // YYYY-MM-DD, "ASAP" ou "Pas de date prévue"
  format?: string; // e.g. "vidéo verticale", "carrousel 4:5", "carrousel 1:1", "image fixe", "pure copy", etc.
  caption?: string; // Texte / Copy du post
  internalNotes?: string; // Brief, retours, specs
  assignee?: Assignee;
  visibility?: 'workspace';
  ownerId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'board' | 'list' | 'calendar';
