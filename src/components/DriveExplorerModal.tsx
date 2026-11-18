import React, { useState, useEffect } from 'react';
import { DriveFile, ContentCard } from '../types';
import {
  listDriveFiles,
  createGooglePresentation,
  trashDriveFile,
  formatFileSize,
  getMimeTypeDetails,
  DriveSearchFilters,
} from '../services/driveService';
import { getAccessToken, googleSignIn } from '../services/googleAuth';
import {
  X,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  Trash2,
  FileText,
  Presentation,
  FileSpreadsheet,
  Image as ImageIcon,
  Video as VideoIcon,
  Folder,
  File,
  HardDrive,
  AlertTriangle,
  Loader2,
  Check,
  Link as LinkIcon,
} from 'lucide-react';

interface DriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards?: ContentCard[];
  onOpenCard?: (card: ContentCard) => void;
}

export const DriveExplorerModal: React.FC<DriveExplorerModalProps> = ({
  isOpen,
  onClose,
  cards = [],
  onOpenCard,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<DriveSearchFilters['typeFilter']>('all');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // New slide creation
  const [showCreateSlide, setShowCreateSlide] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);

  // User confirmation for destructive trash operation (MANDATORY per Workspace Skill)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsLogin(true);
        setIsLoading(false);
        return;
      }
      setNeedsLogin(false);
      const res = await listDriveFiles({
        searchTerm,
        typeFilter,
      });
      setFiles(res.files);
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
      setError(err?.message || 'Impossible de charger Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setNeedsLogin(false);
        fetchFiles();
      }
    } catch (err: any) {
      setError(err?.message || 'Connexion échouée');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideTitle.trim()) return;

    setIsCreatingSlide(true);
    setError(null);
    try {
      const created = await createGooglePresentation(newSlideTitle.trim());
      setShowCreateSlide(false);
      setNewSlideTitle('');
      setFiles((prev) => [created, ...prev]);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création de la présentation');
    } finally {
      setIsCreatingSlide(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeleteFile) return;
    setIsDeleting(true);
    try {
      await trashDriveFile(confirmDeleteFile.id);
      setFiles((prev) => prev.filter((f) => f.id !== confirmDeleteFile.id));
      setConfirmDeleteFile(null);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderFileIcon = (mimeType: string) => {
    if (mimeType.includes('presentation')) {
      return <Presentation className="w-5 h-5 text-amber-400 shrink-0" />;
    }
    if (mimeType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-400 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (mimeType.includes('folder')) {
      return <Folder className="w-5 h-5 text-zinc-400 shrink-0" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />;
    }
    if (mimeType.startsWith('video/')) {
      return <VideoIcon className="w-5 h-5 text-pink-400 shrink-0" />;
    }
    return <File className="w-5 h-5 text-zinc-400 shrink-0" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-5xl bg-[#181b27] border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-750 bg-[#141622]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-sm">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Google Drive Workspace</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Connecté
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Parcourez vos fichiers, présentations Slides et assets créatifs pour Monks Social Flow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateSlide(!showCreateSlide)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Slide</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick New Slide Banner */}
        {showCreateSlide && (
          <div className="p-4 bg-amber-950/40 border-b border-amber-500/30 animate-fadeIn">
            <form onSubmit={handleCreateSlide} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold uppercase text-amber-300 mb-1">
                  Titre du deck Google Slides à créer dans Google Drive
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Google Brand — Campagne Q4 Decks"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#12141e] border border-amber-500/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto self-end">
                <button
                  type="submit"
                  disabled={isCreatingSlide || !newSlideTitle.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {isCreatingSlide ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Créer dans Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateSlide(false)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="p-4 border-b border-zinc-750 bg-[#141622]/70 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher des fichiers dans Google Drive..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-24 py-2 bg-[#12141e] border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-400 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#1f2436] hover:bg-[#2a3048] text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Chercher
              </button>
            </form>

            <button
              type="button"
              onClick={fetchFiles}
              disabled={isLoading}
              title="Rafraîchir"
              className="p-2.5 bg-[#1c2030] hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
            {(
              [
                { id: 'all', label: 'Tous' },
                { id: 'presentation', label: '📊 Google Slides' },
                { id: 'document', label: '📄 Google Docs' },
                { id: 'spreadsheet', label: '📈 Google Sheets' },
                { id: 'image', label: '🖼️ Images' },
                { id: 'video', label: '🎬 Vidéos' },
                { id: 'folder', label: '📁 Dossiers' },
              ] as const
            ).map((filter) => {
              const isActive = typeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setTypeFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all text-xs ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'bg-[#1c2030] text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-[350px]">
          {needsLogin ? (
            <div className="flex flex-col items-center justify-center h-80 text-center p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <HardDrive className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Connexion Google Drive</h3>
                <p className="text-xs text-zinc-400 max-w-md mt-1">
                  Connectez votre compte pour accéder et associer vos fichiers Drive à l'application.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-lg"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Se connecter avec Google</span>
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-80 text-center p-6 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs text-zinc-400">Chargement de votre Google Drive...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Erreur Google Drive</span>
              </p>
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchFiles}
                className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 rounded-lg text-rose-200 font-medium"
              >
                Réessayer
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center p-6 space-y-3">
              <File className="w-10 h-10 text-zinc-600" />
              <p className="text-base font-semibold text-zinc-300">Aucun fichier Drive trouvé</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Aucun fichier ne correspond à votre filtre actuel dans Google Drive.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {files.map((file) => {
                const details = getMimeTypeDetails(file.mimeType);
                // Check if any card is linked to this file
                const linkedCard = cards.find(
                  (c) => c.driveFile?.id === file.id || (file.webViewLink && c.slideUrl === file.webViewLink)
                );

                return (
                  <div
                    key={file.id}
                    className="group relative p-3.5 rounded-xl border border-zinc-750 bg-[#141622] hover:border-amber-500/60 hover:bg-[#1c2030] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 truncate">
                          {renderFileIcon(file.mimeType)}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border font-medium truncate ${details.badgeClass}`}
                          >
                            {details.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ouvrir dans Google Drive"
                              className="p-1 text-zinc-400 hover:text-amber-300 hover:bg-zinc-700/50 rounded-md transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFile(file)}
                            title="Mettre à la corbeille"
                            className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* File Name */}
                      <p
                        className="text-xs font-bold text-zinc-200 line-clamp-2 mb-2 group-hover:text-white"
                        title={file.name}
                      >
                        {file.name}
                      </p>

                      {/* Linked Card Indicator if present */}
                      {linkedCard && (
                        <div className="mb-2 p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center justify-between gap-1">
                          <span className="truncate">Lié à : {linkedCard.title}</span>
                          {onOpenCard && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenCard(linkedCard);
                                onClose();
                              }}
                              className="text-emerald-400 hover:underline shrink-0 font-bold"
                            >
                              Voir
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Metadata bottom */}
                    <div className="pt-2 border-t border-zinc-750/70 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-750 bg-[#141622] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Google Drive API v3</span>
            <span>•</span>
            <span>{files.length} fichiers trouvés</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>

        {/* Mandatory User Confirmation Modal for Destructive Delete */}
        {confirmDeleteFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1a1d2d] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Confirmation de mise à la corbeille</h4>
                  <p className="text-xs text-zinc-400">Action sur Google Drive</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Êtes-vous sûr de vouloir déplacer le fichier{' '}
                <strong className="text-white font-semibold">« {confirmDeleteFile.name} »</strong> vers la corbeille de votre Google Drive ?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteFile(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmer la suppression</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
