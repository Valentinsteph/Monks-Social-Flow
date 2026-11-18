import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BoardConfig,
  ContentCard,
  DriveFile,
  Assignee,
  PlatformId,
  ProjectItem,
  StageConfig,
} from '../types';
import { STAGES, INITIAL_CARDS, DEFAULT_CLIENTS } from '../data/constants';

export const DEFAULT_BOARD_ID = 'monks-social-flow';
const ALLOWED_PLATFORMS: PlatformId[] = ['instagram', 'youtube', 'x', 'facebook'];

export function toValidFirestoreId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  if (cleaned.length > 0) return cleaned;
  return `${fallbackPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function timestampToIso(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string' && ts.trim().length > 0) {
    return ts;
  }
  return new Date().toISOString();
}

function sanitizePlatforms(raw: unknown): PlatformId[] {
  if (!Array.isArray(raw)) return ['instagram'];
  const valid = raw.filter((p): p is PlatformId => ALLOWED_PLATFORMS.includes(p as PlatformId));
  const deduped = Array.from(new Set(valid)).slice(0, 4);
  return deduped.length > 0 ? deduped : ['instagram'];
}

function sanitizeAssignee(raw?: Assignee): Assignee | undefined {
  if (!raw || !raw.name || !raw.name.trim()) return undefined;
  const name = clampString(raw.name, 100);
  const initials =
    clampString(raw.initials, 10) ||
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    'MK';
  const result: Assignee = { name, initials };
  if (raw.role && raw.role.trim()) {
    result.role = clampString(raw.role, 80);
  }
  return result;
}

function sanitizeDriveFile(raw?: DriveFile): DriveFile | undefined {
  if (!raw || !raw.id || !raw.name || !raw.mimeType) return undefined;
  const result: DriveFile = {
    id: clampString(raw.id, 200),
    name: clampString(raw.name, 300),
    mimeType: clampString(raw.mimeType, 200),
  };
  if (raw.webViewLink) result.webViewLink = clampString(raw.webViewLink, 1000);
  if (raw.webContentLink) result.webContentLink = clampString(raw.webContentLink, 1000);
  if (raw.iconLink) result.iconLink = clampString(raw.iconLink, 1000);
  if (raw.thumbnailLink) result.thumbnailLink = clampString(raw.thumbnailLink, 1000);
  if (raw.modifiedTime) result.modifiedTime = clampString(raw.modifiedTime, 80);
  if (raw.size) result.size = clampString(raw.size, 40);
  return result;
}

function buildCardCreatePayload(
  boardId: string,
  cardId: string,
  cardData: Partial<ContentCard>,
  ownerId: string,
  orderFallback = 0
): Record<string, unknown> {
  const title = clampString(cardData.title, 200) || 'Nouveau contenu';
  const client = clampString(cardData.client, 80) || 'Brand';
  const stageId = toValidFirestoreId(cardData.stageId || 'briefe', 'stage');
  const order = typeof cardData.order === 'number' && cardData.order >= 0 ? Math.min(cardData.order, 100000) : orderFallback;

  const payload: Record<string, unknown> = {
    id: cardId,
    boardId,
    title,
    client,
    stageId,
    platforms: sanitizePlatforms(cardData.platforms),
    visibility: 'workspace',
    order,
    ownerId: clampString(ownerId, 128),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const campaign = clampString(cardData.campaign, 120);
  if (campaign) payload.campaign = campaign;

  const slideUrl = clampString(cardData.slideUrl, 1000);
  if (slideUrl) payload.slideUrl = slideUrl;

  const driveFile = sanitizeDriveFile(cardData.driveFile);
  if (driveFile) payload.driveFile = driveFile;

  const publicationDate = clampString(cardData.publicationDate, 40);
  if (publicationDate) payload.publicationDate = publicationDate;

  const format = clampString(cardData.format, 80);
  if (format) payload.format = format;

  const caption = clampString(cardData.caption, 5000);
  if (caption) payload.caption = caption;

  const internalNotes = clampString(cardData.internalNotes, 5000);
  if (internalNotes) payload.internalNotes = internalNotes;

  const assignee = sanitizeAssignee(cardData.assignee);
  if (assignee) payload.assignee = assignee;

  return payload;
}

function requireDb() {
  if (!db) {
    throw new Error('Firestore non initialisé. Vérifiez les variables d’environnement Vite Firebase.');
  }
  return db;
}

// =========================================================================
// Seed & Initialization
// =========================================================================
export async function ensureDefaultBoardSeeded(boardId: string, ownerId: string): Promise<void> {
  const database = requireDb();
  const boardPath = `boards/${boardId}`;
  const boardRef = doc(database, 'boards', boardId);

  let boardSnap;
  try {
    boardSnap = await getDoc(boardRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, boardPath);
  }

  if (boardSnap.exists()) {
    return;
  }

  const batch = writeBatch(database);

  batch.set(boardRef, {
    id: boardId,
    name: 'Monks Social Flow',
    description: 'Tableau collaboratif de validation et suivi des contenus réseaux sociaux',
    visibility: 'workspace',
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  DEFAULT_CLIENTS.forEach((clientName, idx) => {
    const projectId = toValidFirestoreId(clientName, 'project');
    const projectRef = doc(database, 'boards', boardId, 'projects', projectId);
    batch.set(projectRef, {
      id: projectId,
      boardId,
      name: clampString(clientName, 80),
      visibility: 'workspace',
      order: idx,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  STAGES.forEach((stage, idx) => {
    const colId = toValidFirestoreId(stage.id, 'col');
    const colRef = doc(database, 'boards', boardId, 'columns', colId);
    const colPayload: Record<string, unknown> = {
      id: colId,
      boardId,
      label: clampString(stage.label, 100),
      description: clampString(stage.description, 300),
      accentColor: clampString(stage.accentColor, 64),
      indicatorBg: clampString(stage.indicatorBg, 64),
      borderColor: clampString(stage.borderColor, 120),
      visibility: 'workspace',
      order: idx,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (stage.shortLabel) {
      colPayload.shortLabel = clampString(stage.shortLabel, 60);
    }
    batch.set(colRef, colPayload);
  });

  INITIAL_CARDS.forEach((card, idx) => {
    const cardId = toValidFirestoreId(card.id, 'card');
    const cardRef = doc(database, 'boards', boardId, 'cards', cardId);
    batch.set(cardRef, buildCardCreatePayload(boardId, cardId, card, ownerId, idx));
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, boardPath);
  }
}

export async function resetBoardToDefaults(boardId: string, ownerId: string): Promise<void> {
  const database = requireDb();
  const basePath = `boards/${boardId}`;

  try {
    const cardsSnap = await getDocs(
      query(collection(database, 'boards', boardId, 'cards'), where('visibility', '==', 'workspace'))
    );
    const projectsSnap = await getDocs(
      query(collection(database, 'boards', boardId, 'projects'), where('visibility', '==', 'workspace'))
    );
    const columnsSnap = await getDocs(
      query(collection(database, 'boards', boardId, 'columns'), where('visibility', '==', 'workspace'))
    );

    const deleteBatch = writeBatch(database);
    cardsSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
    projectsSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
    columnsSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    const seedBatch = writeBatch(database);
    const boardRef = doc(database, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    if (!boardSnap.exists()) {
      seedBatch.set(boardRef, {
        id: boardId,
        name: 'Monks Social Flow',
        description: 'Tableau collaboratif de validation et suivi des contenus réseaux sociaux',
        visibility: 'workspace',
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    DEFAULT_CLIENTS.forEach((clientName, idx) => {
      const projectId = toValidFirestoreId(clientName, 'project');
      const projectRef = doc(database, 'boards', boardId, 'projects', projectId);
      seedBatch.set(projectRef, {
        id: projectId,
        boardId,
        name: clampString(clientName, 80),
        visibility: 'workspace',
        order: idx,
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    STAGES.forEach((stage, idx) => {
      const colId = toValidFirestoreId(stage.id, 'col');
      const colRef = doc(database, 'boards', boardId, 'columns', colId);
      const colPayload: Record<string, unknown> = {
        id: colId,
        boardId,
        label: clampString(stage.label, 100),
        description: clampString(stage.description, 300),
        accentColor: clampString(stage.accentColor, 64),
        indicatorBg: clampString(stage.indicatorBg, 64),
        borderColor: clampString(stage.borderColor, 120),
        visibility: 'workspace',
        order: idx,
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (stage.shortLabel) {
        colPayload.shortLabel = clampString(stage.shortLabel, 60);
      }
      seedBatch.set(colRef, colPayload);
    });

    INITIAL_CARDS.forEach((card, idx) => {
      const cardId = toValidFirestoreId(card.id, 'card');
      const cardRef = doc(database, 'boards', boardId, 'cards', cardId);
      seedBatch.set(cardRef, buildCardCreatePayload(boardId, cardId, card, ownerId, idx));
    });

    await seedBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, basePath);
  }
}

// =========================================================================
// Real-time Subscriptions (onSnapshot)
// =========================================================================
export function subscribeToBoards(
  onData: (boards: BoardConfig[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const database = requireDb();
  const path = 'boards';
  const q = query(collection(database, path), where('visibility', '==', 'workspace'));

  return onSnapshot(
    q,
    (snapshot) => {
      const boards: BoardConfig[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || d.id,
          description: data.description,
          visibility: 'workspace',
          ownerId: data.ownerId,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      boards.sort((a, b) => {
        if (a.id === DEFAULT_BOARD_ID) return -1;
        if (b.id === DEFAULT_BOARD_ID) return 1;
        return a.name.localeCompare(b.name, 'fr');
      });
      onData(boards);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError) onError(err as Error);
      }
    }
  );
}

export function subscribeToProjects(
  boardId: string,
  onData: (projects: ProjectItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const database = requireDb();
  const path = `boards/${boardId}/projects`;
  const q = query(collection(database, 'boards', boardId, 'projects'), where('visibility', '==', 'workspace'));

  return onSnapshot(
    q,
    (snapshot) => {
      const projects: ProjectItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          boardId: data.boardId || boardId,
          name: data.name,
          visibility: 'workspace',
          order: typeof data.order === 'number' ? data.order : 0,
          ownerId: data.ownerId,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      projects.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
      onData(projects);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError) onError(err as Error);
      }
    }
  );
}

export function subscribeToColumns(
  boardId: string,
  onData: (columns: StageConfig[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const database = requireDb();
  const path = `boards/${boardId}/columns`;
  const q = query(collection(database, 'boards', boardId, 'columns'), where('visibility', '==', 'workspace'));

  return onSnapshot(
    q,
    (snapshot) => {
      const columns: StageConfig[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          boardId: data.boardId || boardId,
          label: data.label,
          shortLabel: data.shortLabel,
          description: data.description || '',
          accentColor: data.accentColor || 'text-emerald-400',
          indicatorBg: data.indicatorBg || 'bg-emerald-500',
          borderColor: data.borderColor || 'border-emerald-500/30 hover:border-emerald-500/60',
          order: typeof data.order === 'number' ? data.order : 0,
          visibility: 'workspace',
          ownerId: data.ownerId,
        };
      });
      columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onData(columns);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError) onError(err as Error);
      }
    }
  );
}

export function subscribeToCards(
  boardId: string,
  onData: (cards: ContentCard[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const database = requireDb();
  const path = `boards/${boardId}/cards`;
  const q = query(collection(database, 'boards', boardId, 'cards'), where('visibility', '==', 'workspace'));

  return onSnapshot(
    q,
    (snapshot) => {
      const cards: ContentCard[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          boardId: data.boardId || boardId,
          title: data.title || 'Sans titre',
          client: data.client || 'Brand',
          campaign: data.campaign,
          stageId: data.stageId || 'briefe',
          platforms: sanitizePlatforms(data.platforms),
          slideUrl: data.slideUrl,
          driveFile: data.driveFile,
          publicationDate: data.publicationDate,
          format: data.format,
          caption: data.caption,
          internalNotes: data.internalNotes,
          assignee: data.assignee,
          visibility: 'workspace',
          ownerId: data.ownerId,
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      cards.sort((a, b) => {
        const timeDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (!isNaN(timeDiff) && timeDiff !== 0) return timeDiff;
        return a.order - b.order;
      });
      onData(cards);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError) onError(err as Error);
      }
    }
  );
}

// =========================================================================
// CRUD Mutations: Boards, Projects, Columns, Cards
// =========================================================================
export async function createBoardInFirestore(
  name: string,
  ownerId: string,
  description = ''
): Promise<string> {
  const database = requireDb();
  const boardId = toValidFirestoreId(`${name}-${Date.now().toString(36)}`, 'board');
  const path = `boards/${boardId}`;
  const boardRef = doc(database, 'boards', boardId);

  const batch = writeBatch(database);
  const boardPayload: Record<string, unknown> = {
    id: boardId,
    name: clampString(name, 120) || 'Nouveau tableau',
    visibility: 'workspace',
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (description.trim()) {
    boardPayload.description = clampString(description, 500);
  }
  batch.set(boardRef, boardPayload);

  // Seed default projects & workflow columns for the new board
  DEFAULT_CLIENTS.forEach((clientName, idx) => {
    const projectId = toValidFirestoreId(clientName, 'project');
    batch.set(doc(database, 'boards', boardId, 'projects', projectId), {
      id: projectId,
      boardId,
      name: clampString(clientName, 80),
      visibility: 'workspace',
      order: idx,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  STAGES.forEach((stage, idx) => {
    const colId = toValidFirestoreId(stage.id, 'col');
    const colPayload: Record<string, unknown> = {
      id: colId,
      boardId,
      label: clampString(stage.label, 100),
      description: clampString(stage.description, 300),
      accentColor: clampString(stage.accentColor, 64),
      indicatorBg: clampString(stage.indicatorBg, 64),
      borderColor: clampString(stage.borderColor, 120),
      visibility: 'workspace',
      order: idx,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (stage.shortLabel) {
      colPayload.shortLabel = clampString(stage.shortLabel, 60);
    }
    batch.set(doc(database, 'boards', boardId, 'columns', colId), colPayload);
  });

  try {
    await batch.commit();
    return boardId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createProjectInFirestore(
  boardId: string,
  name: string,
  order: number,
  ownerId: string
): Promise<string> {
  const database = requireDb();
  const projectId = toValidFirestoreId(name, 'project');
  const path = `boards/${boardId}/projects/${projectId}`;
  const projectRef = doc(database, 'boards', boardId, 'projects', projectId);

  try {
    await setDoc(projectRef, {
      id: projectId,
      boardId,
      name: clampString(name, 80),
      visibility: 'workspace',
      order,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return projectId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createColumnInFirestore(
  boardId: string,
  label: string,
  description: string,
  order: number,
  ownerId: string
): Promise<string> {
  const database = requireDb();
  const columnId = toValidFirestoreId(`${label}-${Date.now().toString(36)}`, 'col');
  const path = `boards/${boardId}/columns/${columnId}`;
  const colRef = doc(database, 'boards', boardId, 'columns', columnId);

  try {
    await setDoc(colRef, {
      id: columnId,
      boardId,
      label: clampString(label, 100) || 'Nouvelle colonne',
      shortLabel: clampString(label, 60) || 'Colonne',
      description: clampString(description, 300) || 'Étape personnalisée du workflow',
      accentColor: 'text-emerald-400',
      indicatorBg: 'bg-emerald-500',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      visibility: 'workspace',
      order,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return columnId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createCardInFirestore(
  boardId: string,
  cardData: Partial<ContentCard>,
  ownerId: string,
  orderFallback = 0
): Promise<string> {
  const database = requireDb();
  const cardId = `monks-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const path = `boards/${boardId}/cards/${cardId}`;
  const cardRef = doc(database, 'boards', boardId, 'cards', cardId);

  try {
    await setDoc(cardRef, buildCardCreatePayload(boardId, cardId, cardData, ownerId, orderFallback));
    return cardId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCardInFirestore(
  boardId: string,
  cardId: string,
  cardData: Partial<ContentCard>
): Promise<void> {
  const database = requireDb();
  const path = `boards/${boardId}/cards/${cardId}`;
  const cardRef = doc(database, 'boards', boardId, 'cards', cardId);

  const updates: Record<string, unknown> = {
    title: clampString(cardData.title, 200) || 'Sans titre',
    client: clampString(cardData.client, 80) || 'Brand',
    stageId: toValidFirestoreId(cardData.stageId || 'briefe', 'stage'),
    platforms: sanitizePlatforms(cardData.platforms),
    updatedAt: serverTimestamp(),
  };

  const campaign = clampString(cardData.campaign, 120);
  updates.campaign = campaign || deleteField();

  const slideUrl = clampString(cardData.slideUrl, 1000);
  updates.slideUrl = slideUrl || deleteField();

  const driveFile = sanitizeDriveFile(cardData.driveFile);
  updates.driveFile = driveFile || deleteField();

  const publicationDate = clampString(cardData.publicationDate, 40);
  updates.publicationDate = publicationDate || deleteField();

  const format = clampString(cardData.format, 80);
  updates.format = format || deleteField();

  const caption = clampString(cardData.caption, 5000);
  if (cardData.caption !== undefined) {
    updates.caption = caption || deleteField();
  }

  const internalNotes = clampString(cardData.internalNotes, 5000);
  if (cardData.internalNotes !== undefined) {
    updates.internalNotes = internalNotes || deleteField();
  }

  const assignee = sanitizeAssignee(cardData.assignee);
  updates.assignee = assignee || deleteField();

  if (typeof cardData.order === 'number' && cardData.order >= 0) {
    updates.order = Math.min(cardData.order, 100000);
  }

  try {
    await updateDoc(cardRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function moveCardStageInFirestore(
  boardId: string,
  cardId: string,
  stageId: string,
  order?: number
): Promise<void> {
  const database = requireDb();
  const path = `boards/${boardId}/cards/${cardId}`;
  const cardRef = doc(database, 'boards', boardId, 'cards', cardId);

  const updates: Record<string, unknown> = {
    stageId: toValidFirestoreId(stageId, 'stage'),
    updatedAt: serverTimestamp(),
  };
  if (typeof order === 'number' && order >= 0) {
    updates.order = Math.min(order, 100000);
  }

  try {
    await updateDoc(cardRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCardDateInFirestore(
  boardId: string,
  cardId: string,
  publicationDate?: string
): Promise<void> {
  const database = requireDb();
  const path = `boards/${boardId}/cards/${cardId}`;
  const cardRef = doc(database, 'boards', boardId, 'cards', cardId);

  const cleaned = clampString(publicationDate, 40);
  try {
    await updateDoc(cardRef, {
      publicationDate: cleaned || deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCardInFirestore(boardId: string, cardId: string): Promise<void> {
  const database = requireDb();
  const path = `boards/${boardId}/cards/${cardId}`;
  const cardRef = doc(database, 'boards', boardId, 'cards', cardId);

  try {
    await deleteDoc(cardRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function importCardsBatchInFirestore(
  boardId: string,
  importedCards: Partial<ContentCard>[],
  ownerId: string
): Promise<number> {
  const database = requireDb();
  const path = `boards/${boardId}/cards`;

  const chunkSize = 400;
  let totalImported = 0;

  try {
    for (let i = 0; i < importedCards.length; i += chunkSize) {
      const chunk = importedCards.slice(i, i + chunkSize);
      const batch = writeBatch(database);
      chunk.forEach((card, idx) => {
        const cardId = card.id
          ? toValidFirestoreId(card.id, 'import')
          : `import-${Date.now()}-${i + idx}`;
        const cardRef = doc(database, 'boards', boardId, 'cards', cardId);
        batch.set(cardRef, buildCardCreatePayload(boardId, cardId, card, ownerId, i + idx));
      });
      await batch.commit();
      totalImported += chunk.length;
    }
    return totalImported;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
