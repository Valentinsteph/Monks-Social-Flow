/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ContentCard, StageId, PlatformId, ViewMode } from './types';
import { STAGES, INITIAL_CARDS, DEFAULT_CLIENTS } from './data/constants';
import { Navbar } from './components/Navbar';
import { WorkflowStats } from './components/WorkflowStats';
import { Column } from './components/Column';
import { ListView } from './components/ListView';
import { CalendarView } from './components/CalendarView';
import { CardModal } from './components/CardModal';
import { DriveExplorerModal } from './components/DriveExplorerModal';
import { SlidersHorizontal, Upload, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { getRecentlyModifiedInfo } from './utils/dateUtils';

const STORAGE_KEY = 'monks_social_flow_cards_v3';
const CLIENTS_STORAGE_KEY = 'monks_social_flow_pas_v3';

// Migration helper for any legacy stage IDs or platforms
function sanitizeCards(rawCards: any[]): ContentCard[] {
  const stageMap: Record<string, StageId> = {
    'briefe': 'briefe',
    'retravail': 'retravail',
    'en-retravail': 'retravail',
    'concept-a-valider': 'a-valider-interne',
    'a-valider-interne': 'a-valider-interne',
    'concept-valide-client': 'concept-a-faire-valider-client',
    'concept-a-faire-valider-client': 'concept-a-faire-valider-client',
    'part-en-prod': 'part-en-prod',
    'prod-valide-client': 'prod-a-faire-valider-client',
    'prod-a-faire-valider-client': 'prod-a-faire-valider-client',
    'valide': 'valide',
    'programme': 'programme',
    'poste': 'poste',
    'kille': 'kille',
    'kill': 'kille',
    'archive': 'kille',
  };

  const allowedPlatforms: PlatformId[] = ['instagram', 'youtube', 'x', 'facebook'];

  const formatMap: Record<string, string> = {
    'Reel 9:16': 'vidéo verticale',
    'TikTok 9:16': 'vidéo verticale',
    'YouTube Short': 'vidéo verticale',
    'Vidéo Long Format': 'vidéo verticale',
    'video verticale': 'vidéo verticale',
    'carroussel 4:5': 'carrousel 4:5',
    'carroussel 1:1': 'carrousel 1:1',
    'Carrousel (4:5 / 1:1)': 'carrousel 4:5',
    'Post Statique': 'image fixe',
  };

  return rawCards.map((c) => {
    const stageId = stageMap[c.stageId] || 'briefe';
    const platforms = Array.isArray(c.platforms)
      ? (c.platforms.filter((p: any) => allowedPlatforms.includes(p)) as PlatformId[])
      : ['instagram'];
    const format = formatMap[c.format] || c.format || 'vidéo verticale';
    // Strictly normalize client to one of: Brand, Gemini, Pixel, Search, Partenariat Foot
    const client = normalizePA(c.client);

    return {
      ...c,
      stageId,
      platforms: platforms.length > 0 ? platforms : ['instagram'],
      client,
      format,
    };
  });
}

export function normalizePA(raw?: string): string {
  if (!raw) return 'Brand';
  const trimmed = raw.trim();
  if (trimmed === 'Part. Foot.' || trimmed === 'Part. Foot' || trimmed === 'Partenariat Foot') {
    return 'Partenariat Foot';
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('foot') || lower.includes('partenariat')) return 'Partenariat Foot';
  if (lower.includes('pixel')) return 'Pixel';
  if (lower.includes('search')) return 'Search';
  if (lower.includes('gemini')) return 'Gemini';
  if (lower.includes('brand') || lower.includes('google')) return 'Brand';

  const match = DEFAULT_CLIENTS.find((pa) => pa.toLowerCase() === lower);
  if (match) return match;

  return 'Brand';
}

// Helper to inspect all previous storage versions and restore any lost user cards
function loadCardsWithRecovery(): { cards: ContentCard[]; recoveredSource: string | null } {
  const legacyKeys = [
    'monks_social_flow_cards_v2',
    'monks_social_flow_cards',
    'monks_social_flow_cards_v1',
    'google_social_flow_cards',
  ];

  let legacyCards: ContentCard[] = [];
  let recoveredSource: string | null = null;

  // 1. Scan candidate legacy keys
  for (const key of legacyKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeCards(parsed);
          if (sanitized.length > legacyCards.length || !recoveredSource) {
            legacyCards = sanitized;
            recoveredSource = key;
          }
        }
      }
    } catch (e) {
      console.warn(`Error reading ${key}:`, e);
    }
  }

  // 2. Also scan any other key in localStorage for possible saved cards
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== STORAGE_KEY && !legacyKeys.includes(k) && (k.includes('monks') || k.includes('cards') || k.includes('flow'))) {
        const raw = localStorage.getItem(k);
        if (raw && (raw.includes('"title"') || raw.includes('"stageId"'))) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title) {
              const sanitized = sanitizeCards(parsed);
              if (sanitized.length > legacyCards.length) {
                legacyCards = sanitized;
                recoveredSource = k;
              }
            }
          } catch {}
        }
      }
    }
  } catch (e) {}

  // 3. Check v3 current key
  let currentCards: ContentCard[] = [];
  try {
    const rawV3 = localStorage.getItem(STORAGE_KEY);
    if (rawV3) {
      const parsed = JSON.parse(rawV3);
      if (Array.isArray(parsed) && parsed.length > 0) {
        currentCards = sanitizeCards(parsed);
      }
    }
  } catch (e) {}

  // If we found legacy cards from previous versions (e.g. monks_social_flow_cards_v2):
  // We prioritize them because the user explicitly wants their previous cards back!
  // And we merge any new cards that may have been created in v3 so nothing is lost.
  if (legacyCards.length > 0) {
    const map = new Map<string, ContentCard>();
    // First, insert all legacy cards
    legacyCards.forEach((c) => map.set(c.id, c));
    // Also include any user-created card in currentCards that was added recently
    currentCards.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, c);
      }
    });
    return {
      cards: Array.from(map.values()),
      recoveredSource,
    };
  }

  if (currentCards.length > 0) {
    return { cards: currentCards, recoveredSource: null };
  }

  return { cards: INITIAL_CARDS, recoveredSource: null };
}

function loadClientsWithRecovery(): string[] {
  return [...DEFAULT_CLIENTS];
}

export default function App() {
  // Load cards with automatic recovery from all previous versions
  const [cards, setCards] = useState<ContentCard[]>(() => {
    return loadCardsWithRecovery().cards;
  });

  // Client management: strictly the 5 approved PAs
  const [customClients, setCustomClients] = useState<string[]>(DEFAULT_CLIENTS);

  // Track cards modified in the current session
  const [recentModifiedIds, setRecentModifiedIds] = useState<Set<string>>(() => {
    // Initially mark the first sample items that have recent timestamps
    const initialSet = new Set<string>();
    INITIAL_CARDS.forEach((c) => {
      const info = getRecentlyModifiedInfo(c.updatedAt, false);
      if (info?.isRecent) {
        initialSet.add(c.id);
      }
    });
    return initialSet;
  });

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<StageId | 'all'>('all');
  const [onlyRecentlyModified, setOnlyRecentlyModified] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);
  const [defaultStageForNew, setDefaultStageForNew] = useState<StageId>('briefe');
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hidden file input for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Persist to localStorage whenever cards change (sync across keys to prevent any loss)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      localStorage.setItem('monks_social_flow_cards_v2', JSON.stringify(cards));
      localStorage.setItem('monks_social_flow_cards', JSON.stringify(cards));
    } catch (e) {
      console.error('Failed to persist cards:', e);
    }
  }, [cards]);

  // Persist custom clients
  useEffect(() => {
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(customClients));
      localStorage.setItem('monks_social_flow_clients_v2', JSON.stringify(customClients));
      localStorage.setItem('monks_social_flow_clients', JSON.stringify(customClients));
    } catch (e) {
      console.error('Failed to persist clients:', e);
    }
  }, [customClients]);

  // Check on initial load if older cards were found and notify user
  useEffect(() => {
    const recoveryResult = loadCardsWithRecovery();
    if (recoveryResult.recoveredSource && recoveryResult.cards.length > 0) {
      showToast(`${recoveryResult.cards.length} cartes récupérées depuis vos sessions précédentes (${recoveryResult.recoveredSource}).`);
    }
  }, []);

  // Explicit restore action that scans all local backups
  const handleRestorePreviousCards = () => {
    const { cards: recovered, recoveredSource } = loadCardsWithRecovery();
    if (recovered && recovered.length > 0) {
      setCards(recovered);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered));
        localStorage.setItem('monks_social_flow_cards_v2', JSON.stringify(recovered));
      } catch {}
      showToast(`${recovered.length} cartes restaurées avec succès${recoveredSource ? ` (depuis ${recoveredSource})` : ''} !`);
    } else {
      showToast('Aucune ancienne carte trouvée dans le stockage local.');
    }
  };

  // Add new client to the list
  const handleAddClient = (newClientName: string) => {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    if (!customClients.includes(trimmed)) {
      const updated = [...customClients, trimmed].sort();
      setCustomClients(updated);
      showToast(`Nouveau PA « ${trimmed} » ajouté.`);
    }
    setSelectedClient(trimmed);
  };

  // Combined clients list: strictly the 5 approved PAs
  const allClientsList = useMemo(() => {
    return DEFAULT_CLIENTS;
  }, []);

  // Count total cards that are recently modified
  const totalRecentlyModified = useMemo(() => {
    return cards.filter((c) => {
      const info = getRecentlyModifiedInfo(c.updatedAt, recentModifiedIds.has(c.id));
      return info?.isRecent;
    }).length;
  }, [cards, recentModifiedIds]);

  // Filtered cards based on search, platform, client, stage, and recent modifications
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Filter by recently modified pastille if toggled
      if (onlyRecentlyModified) {
        const info = getRecentlyModifiedInfo(card.updatedAt, recentModifiedIds.has(card.id));
        if (!info?.isRecent) return false;
      }

      // Platform filter: must contain selected platform
      if (selectedPlatform !== 'all') {
        if (!card.platforms || !card.platforms.includes(selectedPlatform)) {
          return false;
        }
      }

      // Client filter
      if (selectedClient !== 'all') {
        if (card.client.toLowerCase() !== selectedClient.toLowerCase()) {
          return false;
        }
      }

      // Stage funnel filter
      if (stageFilter !== 'all') {
        if (card.stageId !== stageFilter) {
          return false;
        }
      }

      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = card.title.toLowerCase().includes(query);
        const matchClient = card.client.toLowerCase().includes(query);
        const matchCampaign = card.campaign?.toLowerCase().includes(query) || false;
        const matchCaption = card.caption?.toLowerCase().includes(query) || false;
        const matchNotes = card.internalNotes?.toLowerCase().includes(query) || false;
        const matchFormat = card.format?.toLowerCase().includes(query) || false;
        const matchAssignee = card.assignee?.name.toLowerCase().includes(query) || false;
        const matchDate = card.publicationDate?.toLowerCase().includes(query) || false;

        if (!matchTitle && !matchClient && !matchCampaign && !matchCaption && !matchNotes && !matchFormat && !matchAssignee && !matchDate) {
          return false;
        }
      }

      return true;
    });
  }, [cards, selectedPlatform, selectedClient, stageFilter, searchQuery, onlyRecentlyModified, recentModifiedIds]);

  // Handlers for card manipulation
  const markAsRecentlyModified = (cardId: string) => {
    setRecentModifiedIds((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  };

  const handleAddCardToStage = (stageId: StageId) => {
    setEditingCard(null);
    setDefaultStageForNew(stageId);
    setIsModalOpen(true);
  };

  const handleOpenNewCard = () => {
    setEditingCard(null);
    setDefaultStageForNew('briefe');
    setIsModalOpen(true);
  };

  const handleEditCard = (card: ContentCard) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = (cardData: Partial<ContentCard>) => {
    const now = new Date().toISOString();

    if (cardData.id) {
      // Update existing
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardData.id
            ? ({ ...c, ...cardData, client: normalizePA(cardData.client || c.client), updatedAt: now } as ContentCard)
            : c
        )
      );
      markAsRecentlyModified(cardData.id);
      showToast(`« ${cardData.title} » mis à jour (pastille activée).`);
    } else {
      // Create new
      const newId = `monks-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newCard: ContentCard = {
        id: newId,
        title: cardData.title || 'Nouveau contenu',
        client: normalizePA(cardData.client) || 'Brand',
        campaign: cardData.campaign,
        stageId: cardData.stageId || 'briefe',
        platforms: cardData.platforms || ['instagram'],
        slideUrl: cardData.slideUrl,
        publicationDate: cardData.publicationDate,
        format: cardData.format || 'vidéo verticale',
        caption: cardData.caption,
        internalNotes: cardData.internalNotes,
        assignee: cardData.assignee,
        order: cards.filter((c) => c.stageId === cardData.stageId).length,
        createdAt: now,
        updatedAt: now,
      };

      setCards((prev) => [newCard, ...prev]);
      markAsRecentlyModified(newId);
      showToast(`Nouveau contenu créé dans « ${STAGES.find((s) => s.id === newCard.stageId)?.label} »`);
    }
  };

  const handleAddNewCardOnDate = (dateString: string) => {
    setEditingCard({
      id: '',
      title: '',
      client: 'Brand',
      stageId: 'briefe',
      platforms: ['instagram'],
      publicationDate: dateString,
      format: 'vidéo verticale',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setDefaultStageForNew('briefe');
    setIsModalOpen(true);
  };

  const handleUpdateCardDate = (cardId: string, newDateString: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const now = new Date().toISOString();
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, publicationDate: newDateString, updatedAt: now } : c
      )
    );
    markAsRecentlyModified(cardId);
    showToast(`« ${card.title} » reprogrammé au ${newDateString}`);
  };

  const handleMoveStage = (cardId: string, targetStageId: StageId) => {
    const targetStage = STAGES.find((s) => s.id === targetStageId);
    const now = new Date().toISOString();
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, stageId: targetStageId, updatedAt: now }
          : c
      )
    );
    markAsRecentlyModified(cardId);
    if (targetStage) {
      showToast(`Déplacé vers « ${targetStage.label} » (marqué modifié)`);
    }
  };

  const handleCardDrop = (cardId: string, targetStageId: StageId) => {
    handleMoveStage(cardId, targetStageId);
  };

  const handleDuplicateCard = (card: ContentCard) => {
    const newId = `monks-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicate: ContentCard = {
      ...card,
      id: newId,
      title: `${card.title} (Copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCards((prev) => [duplicate, ...prev]);
    markAsRecentlyModified(newId);
    showToast(`Carte dupliquée : « ${duplicate.title} »`);
  };

  const handleDeleteCard = (cardId: string) => {
    const cardToDelete = cards.find((c) => c.id === cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setRecentModifiedIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
    showToast(`« ${cardToDelete?.title || 'Contenu'} » supprimé.`);
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser le tableau avec les contenus de démonstration pour les PA (Brand, Gemini, Pixel, Search, Partenariat Foot) ?')) {
      setCards(INITIAL_CARDS);
      setCustomClients(DEFAULT_CLIENTS);
      const initialSet = new Set<string>();
      INITIAL_CARDS.forEach((c) => {
        const info = getRecentlyModifiedInfo(c.updatedAt, false);
        if (info?.isRecent) initialSet.add(c.id);
      });
      setRecentModifiedIds(initialSet);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CARDS));
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(DEFAULT_CLIENTS));
      showToast('Tableau réinitialisé avec les 5 PA par défaut.');
    }
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `monks-social-flow-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Export JSON généré.');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const sanitized = sanitizeCards(imported);
            setCards(sanitized);
            showToast(`${sanitized.length} contenus importés avec succès.`);
          } else {
            showToast('Format de fichier invalide.');
          }
        } catch {
          showToast('Erreur lors de la lecture du fichier JSON.');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportData}
        accept=".json"
        className="hidden"
      />

      {/* Top Navigation & Controls */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        selectedClient={selectedClient}
        onSelectClient={setSelectedClient}
        clientsList={allClientsList}
        onAddClient={handleAddClient}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenNewCard={handleOpenNewCard}
        onResetData={handleResetData}
        onRestoreData={handleRestorePreviousCards}
        onExportData={handleExportData}
        onOpenDriveExplorer={() => setIsDriveExplorerOpen(true)}
        totalCards={cards.length}
      />

      {/* Validation Pipeline Summary Bar */}
      <WorkflowStats
        cards={filteredCards}
        activeStageFilter={stageFilter}
        onSelectStageFilter={setStageFilter}
      />

      {/* Sub-bar: Quick toggle for recently modified pastille & active filter reset */}
      <div className="px-4 sm:px-6 py-2 bg-[#12141f] border-b border-zinc-750 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {/* Recently modified quick filter pastille */}
          <button
            type="button"
            id="toggle-recently-modified"
            onClick={() => setOnlyRecentlyModified(!onlyRecentlyModified)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
              onlyRecentlyModified
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#1a1d2c] hover:bg-[#222637] text-amber-300 border-amber-500/50'
            }`}
            title="Filtrer uniquement les contenus modifiés récemment"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            <span>Pastille : Récemment modifiés ({totalRecentlyModified})</span>
          </button>

          <span className="text-zinc-600 hidden sm:inline">|</span>

          {/* Active filters summary */}
          {(searchQuery || selectedPlatform !== 'all' || selectedClient !== 'all' || stageFilter !== 'all' || onlyRecentlyModified) ? (
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                Filtre actif : {filteredCards.length} contenu(s) affiché(s) sur {cards.length}
              </span>
            </div>
          ) : (
            <span className="text-zinc-400 hidden sm:inline font-medium">
              PA actifs : <span className="text-emerald-400 font-semibold">Brand, Gemini, Pixel, Search, Partenariat Foot</span>
            </span>
          )}
        </div>

        {/* Clear all filters button */}
        {(searchQuery || selectedPlatform !== 'all' || selectedClient !== 'all' || stageFilter !== 'all' || onlyRecentlyModified) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedPlatform('all');
              setSelectedClient('all');
              setStageFilter('all');
              setOnlyRecentlyModified(false);
            }}
            className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold ml-auto"
          >
            Réinitialiser tous les filtres
          </button>
        )}
      </div>

      {/* Main Board Canvas */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto custom-scrollbar">
        {viewMode === 'board' && (
          <div className="flex gap-4 items-start min-w-max pb-4">
            {STAGES.map((stage) => {
              const stageCards = filteredCards.filter((c) => c.stageId === stage.id);
              return (
                <Column
                  key={stage.id}
                  stage={stage}
                  cards={stageCards}
                  recentModifiedIds={recentModifiedIds}
                  onAddCardToStage={handleAddCardToStage}
                  onEditCard={handleEditCard}
                  onMoveStage={handleMoveStage}
                  onDuplicateCard={handleDuplicateCard}
                  onDeleteCard={handleDeleteCard}
                  onCardDrop={handleCardDrop}
                />
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="max-w-7xl mx-auto">
            <ListView
              cards={filteredCards}
              recentModifiedIds={recentModifiedIds}
              onEditCard={handleEditCard}
              onMoveStage={handleMoveStage}
              onDeleteCard={handleDeleteCard}
            />
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="max-w-7xl mx-auto">
            <CalendarView
              cards={filteredCards}
              recentModifiedIds={recentModifiedIds}
              onEditCard={handleEditCard}
              onAddNewCardOnDate={handleAddNewCardOnDate}
              onUpdateCardDate={handleUpdateCardDate}
            />
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-3 border-t border-zinc-800/60 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-3 bg-zinc-950">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-300">.Monks Social Flow</span>
          <span>•</span>
          <span>Pipeline : Briefé → En retravail → À valider en interne → À faire valider par le client → En Prod → Attente Validation Chloé → VALIDÉ → Programmé → Posté | Killé</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <Upload className="w-3 h-3" />
            <span>Importer JSON</span>
          </button>
          <span>•</span>
          <span>Glissez-déposez les cartes d'une étape à l'autre</span>
        </div>
      </footer>

      {/* Card Creation / Edit Modal */}
      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        initialCard={editingCard}
        defaultStageId={defaultStageForNew}
        clientsList={allClientsList}
        onAddNewClient={handleAddClient}
      />

      {/* Google Drive Explorer Modal */}
      <DriveExplorerModal
        isOpen={isDriveExplorerOpen}
        onClose={() => setIsDriveExplorerOpen(false)}
        onAttachFile={(file) => {
          setIsDriveExplorerOpen(false);
          setEditingCard({
            id: `card-${Date.now()}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            client: 'Brand',
            stageId: 'briefe',
            platforms: ['instagram'],
            slideUrl: file.webViewLink,
            driveFile: file,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as ContentCard);
          setIsModalOpen(true);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/50 shadow-2xl text-xs text-emerald-300 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
