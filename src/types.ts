export type StageId =
  | 'briefe'
  | 'retravail'
  | 'a-valider-interne'
  | 'concept-a-faire-valider-client'
  | 'part-en-prod'
  | 'prod-a-faire-valider-client'
  | 'valide'
  | 'programme'
  | 'poste'
  | 'kille';

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
  label: string;
  shortLabel?: string;
  description: string;
  accentColor: string;
  indicatorBg: string;
  borderColor: string;
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
  title: string;
  client: string; // PA (Product Area: Brand, Gemini, Pixel, Search, Partenariat Foot)
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
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'board' | 'list' | 'calendar';
