/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  BoardConfig,
  ContentCard,
  StageConfig,
  StageId,
  PlatformId,
  ProjectItem,
  ViewMode,
} from './types';
import { STAGES, DEFAULT_CLIENTS } from './data/constants';
import {
  auth,
  isFirebaseConfigured,
  missingFirebaseEnvVars,
} from './firebase';
import { signInWithGoogle, logout } from './services/googleAuth';
import {
  DEFAULT_BOARD_ID,
  ensureDefaultBoardSeeded,
  resetBoardToDefaults,
  subscribeToBoards,
  subscribeToProjects,
  subscribeToColumns,
  subscribeToCards,
  createBoardInFirestore,
  createProjectInFirestore,
  createColumnInFirestore,
  createCardInFirestore,
  updateCardInFirestore,
  moveCardStageInFirestore,
  updateCardDateInFirestore,
  deleteCardInFirestore,
  importCardsBatchInFirestore,
} from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { WorkflowStats } from './components/WorkflowStats';
import { Column } from './components/Column';
import { ListView } from './components/ListView';
import { CalendarView } from './components/CalendarView';
import { CardModal } from './components/CardModal';
import { DriveExplorerModal } from './components/DriveExplorerModal';
import {
  SlidersHorizontal,
  Upload,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { getRecentlyModifiedInfo } from './utils/dateUtils';

export default function App() {
  // Auth readiness state
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real-time Firestore state (boards, projects, columns, cards)
  const [boards, setBoards] = useState<BoardConfig[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>(DEFAULT_BOARD_ID);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [columns, setColumns] = useState<StageConfig[]>(STAGES);
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  // Track cards modified in the current session
  const [recentModifiedIds, setRecentModifiedIds] = useState<Set<string>>(() => new Set());

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<StageId | 'all'>('all');
  const [onlyRecentlyModified, setOnlyRecentlyModified] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Add column inline form state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);
  const [defaultStageForNew, setDefaultStageForNew] = useState<StageId>('briefe');
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // 1. Firebase Auth listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. Seed default board once user is authenticated & subscribe to shared boards
  useEffect(() => {
    if (!isFirebaseConfigured || !authReady || !currentUser) return;

    let isMounted = true;
    setIsLoadingBoard(true);

    ensureDefaultBoardSeeded(DEFAULT_BOARD_ID, currentUser.uid)
      .then(() => {
        if (isMounted) setIsLoadingBoard(false);
      })
      .catch((err) => {
        if (isMounted) setFatalError(err as Error);
      });

    const unsubBoards = subscribeToBoards(
      (fetchedBoards) => {
        setBoards(fetchedBoards);
        if (
          fetchedBoards.length > 0 &&
          !fetchedBoards.some((b) => b.id === activeBoardId)
        ) {
          setActiveBoardId(fetchedBoards[0].id);
        }
      },
      (err) => setFatalError(err)
    );

    return () => {
      isMounted = false;
      unsubBoards();
    };
  }, [authReady, currentUser]);

  // 3. Subscribe in real time (onSnapshot) to projects, columns, and cards for activeBoardId
  useEffect(() => {
    if (!isFirebaseConfigured || !authReady || !currentUser || !activeBoardId) return;

    const unsubProjects = subscribeToProjects(
      activeBoardId,
      (fetchedProjects) => {
        setProjects(fetchedProjects);
      },
      (err) => setFatalError(err)
    );

    const unsubColumns = subscribeToColumns(
      activeBoardId,
      (fetchedColumns) => {
        if (fetchedColumns.length > 0) {
          setColumns(fetchedColumns);
        } else {
          setColumns(STAGES);
        }
      },
      (err) => setFatalError(err)
    );

    const unsubCards = subscribeToCards(
      activeBoardId,
      (fetchedCards) => {
        setCards(fetchedCards);
        setIsLoadingBoard(false);
      },
      (err) => setFatalError(err)
    );

    return () => {
      unsubProjects();
      unsubColumns();
      unsubCards();
    };
  }, [authReady, currentUser, activeBoardId]);

  const allClientsList = useMemo(() => {
    if (projects.length > 0) {
      return projects.map((p) => p.name);
    }
    return DEFAULT_CLIENTS;
  }, [projects]);

  const totalRecentlyModified = useMemo(() => {
    return cards.filter((c) => {
      const info = getRecentlyModifiedInfo(c.updatedAt, recentModifiedIds.has(c.id));
      return info?.isRecent;
    }).length;
  }, [cards, recentModifiedIds]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (onlyRecentlyModified) {
        const info = getRecentlyModifiedInfo(card.updatedAt, recentModifiedIds.has(card.id));
        if (!info?.isRecent) return false;
      }

      if (selectedPlatform !== 'all') {
        if (!card.platforms || !card.platforms.includes(selectedPlatform)) {
          return false;
        }
      }

      if (selectedClient !== 'all') {
        if (card.client.toLowerCase() !== selectedClient.toLowerCase()) {
          return false;
        }
      }

      if (stageFilter !== 'all') {
        if (card.stageId !== stageFilter) {
          return false;
        }
      }

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

        if (
          !matchTitle &&
          !matchClient &&
          !matchCampaign &&
          !matchCaption &&
          !matchNotes &&
          !matchFormat &&
          !matchAssignee &&
          !matchDate
        ) {
          return false;
        }
      }

      return true;
    });
  }, [cards, selectedPlatform, selectedClient, stageFilter, searchQuery, onlyRecentlyModified, recentModifiedIds]);

  const markAsRecentlyModified = (cardId: string) => {
    setRecentModifiedIds((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  };

  // Auth actions
  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Échec de la connexion avec Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setBoards([]);
    setProjects([]);
    setCards([]);
    setColumns(STAGES);
  };

  // Board / Project / Column / Card Firestore mutations
  const handleCreateBoard = async (name: string) => {
    if (!currentUser) return;
    try {
      const newBoardId = await createBoardInFirestore(name, currentUser.uid);
      setActiveBoardId(newBoardId);
      setSelectedClient('all');
      setStageFilter('all');
      showToast(`Nouveau tableau « ${name} » créé et synchronisé.`);
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleAddClient = async (newClientName: string) => {
    if (!currentUser) return;
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    const exists = allClientsList.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      try {
        await createProjectInFirestore(activeBoardId, trimmed, projects.length, currentUser.uid);
        showToast(`Nouveau PA / Projet « ${trimmed} » synchronisé.`);
      } catch (err) {
        setFatalError(err as Error);
        return;
      }
    }
    setSelectedClient(trimmed);
  };

  const handleCreateColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmed = newColumnLabel.trim();
    if (!trimmed) return;
    try {
      await createColumnInFirestore(
        activeBoardId,
        trimmed,
        'Étape personnalisée partagée',
        columns.length,
        currentUser.uid
      );
      setNewColumnLabel('');
      setIsAddingColumn(false);
      showToast(`Colonne « ${trimmed} » ajoutée.`);
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleAddCardToStage = (stageId: StageId) => {
    setEditingCard(null);
    setDefaultStageForNew(stageId);
    setIsModalOpen(true);
  };

  const handleOpenNewCard = () => {
    setEditingCard(null);
    setDefaultStageForNew(columns[0]?.id || 'briefe');
    setIsModalOpen(true);
  };

  const handleEditCard = (card: ContentCard) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = async (cardData: Partial<ContentCard>) => {
    if (!currentUser) return;

    try {
      if (cardData.id && cards.some((c) => c.id === cardData.id)) {
        await updateCardInFirestore(activeBoardId, cardData.id, cardData);
        markAsRecentlyModified(cardData.id);
        showToast(`« ${cardData.title} » mis à jour en temps réel.`);
      } else {
        const order = cards.filter((c) => c.stageId === (cardData.stageId || 'briefe')).length;
        const createdId = await createCardInFirestore(activeBoardId, cardData, currentUser.uid, order);
        markAsRecentlyModified(createdId);
        const stageLabel = columns.find((s) => s.id === cardData.stageId)?.label || 'Briefé';
        showToast(`Nouveau contenu créé dans « ${stageLabel} »`);
      }
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleAddNewCardOnDate = (dateString: string) => {
    setEditingCard({
      id: '',
      title: '',
      client: allClientsList[0] || 'Brand',
      stageId: columns[0]?.id || 'briefe',
      platforms: ['instagram'],
      publicationDate: dateString,
      format: 'vidéo verticale',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setDefaultStageForNew(columns[0]?.id || 'briefe');
    setIsModalOpen(true);
  };

  const handleUpdateCardDate = async (cardId: string, newDateString: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    try {
      await updateCardDateInFirestore(activeBoardId, cardId, newDateString);
      markAsRecentlyModified(cardId);
      showToast(`« ${card.title} » reprogrammé au ${newDateString}`);
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleMoveStage = async (cardId: string, targetStageId: StageId) => {
    const targetStage = columns.find((s) => s.id === targetStageId);
    try {
      await moveCardStageInFirestore(activeBoardId, cardId, targetStageId);
      markAsRecentlyModified(cardId);
      if (targetStage) {
        showToast(`Déplacé vers « ${targetStage.label} »`);
      }
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleCardDrop = (cardId: string, targetStageId: StageId) => {
    void handleMoveStage(cardId, targetStageId);
  };

  const handleDuplicateCard = async (card: ContentCard) => {
    if (!currentUser) return;
    try {
      const { id: _ignored, createdAt: _c, updatedAt: _u, ownerId: _o, ...rest } = card;
      const newId = await createCardInFirestore(
        activeBoardId,
        {
          ...rest,
          title: `${card.title} (Copie)`,
        },
        currentUser.uid,
        card.order + 1
      );
      markAsRecentlyModified(newId);
      showToast(`Carte dupliquée : « ${card.title} (Copie) »`);
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const cardToDelete = cards.find((c) => c.id === cardId);
    try {
      await deleteCardInFirestore(activeBoardId, cardId);
      setRecentModifiedIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      showToast(`« ${cardToDelete?.title || 'Contenu'} » supprimé.`);
    } catch (err) {
      setFatalError(err as Error);
    }
  };

  const handleResetData = async () => {
    if (!currentUser) return;
    if (
      window.confirm(
        'Voulez-vous réinitialiser ce tableau Firestore partagé avec les contenus de démonstration par défaut ?'
      )
    ) {
      try {
        await resetBoardToDefaults(activeBoardId, currentUser.uid);
        setRecentModifiedIds(new Set());
        showToast('Tableau Firestore réinitialisé avec les contenus par défaut.');
      } catch (err) {
        setFatalError(err as Error);
      }
    }
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `monks-social-flow-export-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Export JSON généré.');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const count = await importCardsBatchInFirestore(activeBoardId, imported, currentUser.uid);
            showToast(`${count} contenus importés dans Firestore.`);
          } else {
            showToast('Format de fichier invalide.');
          }
        } catch (err) {
          console.error(err);
          showToast('Erreur lors de l’importation JSON.');
        }
      };
    }
  };

  // Screen 1: Missing VITE_FIREBASE_* environment variables
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[#181b27] border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <h1 className="text-lg font-bold text-white">Configuration Firebase requise</h1>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            La synchronisation temps réel Firestore est initialisée exclusivement à partir des variables d'environnement Vite suivantes :
          </p>
          <ul className="bg-[#12141e] border border-zinc-750 rounded-xl p-3.5 space-y-1.5 font-mono text-xs text-emerald-300">
            {missingFirebaseEnvVars.map((envKey) => (
              <li key={envKey}>{envKey}</li>
            ))}
          </ul>
          <p className="text-[11px] text-zinc-400">
            Définissez ces variables dans votre environnement (ou Secrets AI Studio / fichier <code className="text-zinc-200">.env</code>), puis rechargez l'application.
          </p>
        </div>
      </div>
    );
  }

  // Screen 2: Auth initialization loading
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-zinc-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Initialisation de l'espace collaboratif...</span>
        </div>
      </div>
    );
  }

  // Screen 3: Google Sign-In Gate (before attaching Firestore onSnapshot listeners)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#161824] border border-zinc-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#1c2030] border border-zinc-700 px-4 py-2 rounded-xl shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-extrabold tracking-tighter text-lg text-white">.Monks</span>
            <span className="text-zinc-500 text-xs mx-0.5">/</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Social Flow</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Espace collaboratif temps réel
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connectez-vous avec votre compte Google pour accéder aux tableaux, projets, colonnes et contenus synchronisés en direct avec l'équipe.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/70 text-xs text-rose-200 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            id="btn-workspace-google-signin"
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm shadow-lg transition-all disabled:opacity-60"
          >
            {isSigningIn ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-800" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            )}
            <span>{isSigningIn ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Hidden file input for JSON import */}
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
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={(boardId) => {
          setActiveBoardId(boardId);
          setSelectedClient('all');
          setStageFilter('all');
        }}
        onCreateBoard={handleCreateBoard}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenNewCard={handleOpenNewCard}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onOpenDriveExplorer={() => setIsDriveExplorerOpen(true)}
        onSignOut={handleSignOut}
        userDisplayName={currentUser.displayName || currentUser.email || undefined}
        totalCards={cards.length}
      />

      {/* Validation Pipeline Summary Bar */}
      <WorkflowStats
        cards={filteredCards}
        stages={columns}
        activeStageFilter={stageFilter}
        onSelectStageFilter={setStageFilter}
      />

      {/* Sub-bar: Quick toggle for recently modified pastille & active filter reset */}
      <div className="px-4 sm:px-6 py-2 bg-[#12141f] border-b border-zinc-750 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
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

          {searchQuery ||
          selectedPlatform !== 'all' ||
          selectedClient !== 'all' ||
          stageFilter !== 'all' ||
          onlyRecentlyModified ? (
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                Filtre actif : {filteredCards.length} contenu(s) affiché(s) sur {cards.length}
              </span>
            </div>
          ) : (
            <span className="text-zinc-400 hidden sm:inline font-medium">
              PA actifs :{' '}
              <span className="text-emerald-400 font-semibold">{allClientsList.join(', ')}</span>
            </span>
          )}
        </div>

        {(searchQuery ||
          selectedPlatform !== 'all' ||
          selectedClient !== 'all' ||
          stageFilter !== 'all' ||
          onlyRecentlyModified) && (
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
        {isLoadingBoard ? (
          <div className="h-64 flex items-center justify-center gap-3 text-sm text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Chargement du tableau partagé...</span>
          </div>
        ) : (
          <>
            {viewMode === 'board' && (
              <div className="flex gap-4 items-start min-w-max pb-4">
                {columns.map((stage) => {
                  const stageCards = filteredCards.filter((c) => c.stageId === stage.id);
                  return (
                    <Column
                      key={stage.id}
                      stage={stage}
                      stages={columns}
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

                {/* Add New Column control */}
                <div className="w-72 shrink-0">
                  {isAddingColumn ? (
                    <form
                      onSubmit={handleCreateColumnSubmit}
                      className="p-3.5 bg-[#161824] border border-emerald-500/60 rounded-2xl space-y-2.5 shadow-md"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nom de la colonne..."
                        value={newColumnLabel}
                        onChange={(e) => setNewColumnLabel(e.target.value)}
                        className="w-full px-3 py-2 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-xs text-zinc-100 placeholder-zinc-400 outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Ajouter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingColumn(false);
                            setNewColumnLabel('');
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      id="btn-add-column"
                      onClick={() => setIsAddingColumn(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-zinc-700 hover:border-emerald-500/60 bg-[#161824]/60 hover:bg-[#1a1d2c] text-xs font-semibold text-zinc-300 hover:text-emerald-300 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une colonne</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'list' && (
              <div className="max-w-7xl mx-auto">
                <ListView
                  cards={filteredCards}
                  stages={columns}
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
                  stages={columns}
                  recentModifiedIds={recentModifiedIds}
                  onEditCard={handleEditCard}
                  onAddNewCardOnDate={handleAddNewCardOnDate}
                  onUpdateCardDate={handleUpdateCardDate}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-3 border-t border-zinc-800/60 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-3 bg-zinc-950">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-300">.Monks Social Flow</span>
          <span>•</span>
          <span>
            Pipeline : {columns.map((c) => c.shortLabel || c.label).join(' → ')}
          </span>
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
        stages={columns}
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
            id: '',
            title: file.name.replace(/\.[^/.]+$/, ''),
            client: allClientsList[0] || 'Brand',
            stageId: columns[0]?.id || 'briefe',
            platforms: ['instagram'],
            slideUrl: file.webViewLink,
            driveFile: file,
            order: 0,
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
