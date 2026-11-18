import React, { useState, useEffect } from 'react';
import { DriveFile } from '../types';
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
  Check,
  AlertTriangle,
  Loader2,
  HardDrive,
} from 'lucide-react';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: DriveFile) => void;
  selectedFileId?: string;
  defaultFilter?: DriveSearchFilters['typeFilter'];
  suggestedTitle?: string;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  selectedFileId,
  defaultFilter = 'presentation',
  suggestedTitle = '',
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<DriveSearchFilters['typeFilter']>(defaultFilter);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Quick slide creator state
  const [showCreateSlide, setShowCreateSlide] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState(suggestedTitle || '');
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);

  // Destructive delete confirmation state (Mandatory per Workspace Skill)
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
      setError(err?.message || 'Impossible de charger les fichiers Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      if (suggestedTitle && !newSlideTitle) {
        setNewSlideTitle(suggestedTitle);
      }
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
      setError(err?.message || 'Échec de connexion Google Drive');
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
      // Automatically add to list and select if callback provided
      setFiles((prev) => [created, ...prev]);
      if (onSelectFile) {
        onSelectFile(created);
        onClose();
      }
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
      setError(err?.message || 'Erreur lors de la mise à la corbeille');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-4xl bg-[#181b27] border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-750 bg-[#141622]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Google Drive</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                  {onSelectFile ? 'Sélectionner un fichier' : 'Explorateur'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Liez des présentations Google Slides, documents ou assets de création directement à vos contenus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateSlide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer une Slide</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Slide Creation Banner */}
        {showCreateSlide && (
          <div className="p-4 bg-amber-950/40 border-b border-amber-500/30 animate-fadeIn">
            <form onSubmit={handleCreateSlide} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold uppercase text-amber-300 mb-1">
                  Nom de la nouvelle présentation Google Slides
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Google Pixel 10 — Deck Campagne Vidéo"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12141e] border border-amber-500/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto self-end pt-2 sm:pt-0">
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

        {/* Search & Filters Toolbar */}
        <div className="p-4 border-b border-zinc-750 bg-[#141622]/60 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher dans Google Drive par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-20 py-2 bg-[#12141e] border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-400 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#1f2436] hover:bg-[#2a3048] text-zinc-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors"
              >
                Chercher
              </button>
            </form>

            <button
              type="button"
              onClick={fetchFiles}
              disabled={isLoading}
              title="Actualiser la liste"
              className="p-2 bg-[#1c2030] hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
            {(
              [
                { id: 'all', label: 'Tous les fichiers' },
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

        {/* Files Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
          {needsLogin ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <HardDrive className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Connexion à Google Drive requise</h3>
                <p className="text-xs text-zinc-400 max-w-sm mt-1">
                  Connectez votre compte Google pour accéder à vos présentations Slides, documents et créations.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
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
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs text-zinc-400">Chargement des fichiers Google Drive...</p>
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
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
              <File className="w-8 h-8 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">Aucun fichier trouvé</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                {searchTerm
                  ? `Aucun fichier ne correspond à "${searchTerm}". Essayez un autre mot-clé.`
                  : 'Aucun fichier ne correspond aux filtres sélectionnés dans votre Drive.'}
              </p>
              <button
                type="button"
                onClick={() => setShowCreateSlide(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer une nouvelle slide Google maintenant</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((file) => {
                const details = getMimeTypeDetails(file.mimeType);
                const isSelected = selectedFileId === file.id;

                return (
                  <div
                    key={file.id}
                    className={`group relative p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500/70 ring-1 ring-amber-500 shadow-md'
                        : 'bg-[#141622] border-zinc-750 hover:border-zinc-600 hover:bg-[#1c2030]'
                    }`}
                  >
                    {/* Top Row: Icon & Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
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
                      className="text-xs font-bold text-zinc-200 line-clamp-2 mb-2 title-hover group-hover:text-white"
                      title={file.name}
                    >
                      {file.name}
                    </p>

                    {/* Meta & Select Button */}
                    <div className="pt-2 border-t border-zinc-750/70 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : ''}
                        {file.size ? ` • ${formatFileSize(file.size)}` : ''}
                      </span>

                      {onSelectFile && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectFile(file);
                            onClose();
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-zinc-950'
                              : 'bg-zinc-700/60 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{isSelected ? 'Sélectionné' : 'Lier'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-750 bg-[#141622] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Google Drive API v3</span>
            <span>•</span>
            <span>{files.length} fichier(s) listé(s)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>

        {/* Mandatory User Confirmation Modal for Destructive Delete (Workspace Skill Requirement) */}
        {confirmDeleteFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1a1d2d] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Confirmation de mise à la corbeille</h4>
                  <p className="text-xs text-zinc-400">Action sur votre Google Drive</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Êtes-vous certain de vouloir déplacer le fichier{' '}
                <strong className="text-white font-semibold">« {confirmDeleteFile.name} »</strong>{' '}
                vers la corbeille de votre Google Drive ?
              </p>

              <div className="p-3 rounded-xl bg-[#12141e] border border-zinc-750 text-[11px] text-zinc-400">
                Type : {confirmDeleteFile.mimeType}
              </div>

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
