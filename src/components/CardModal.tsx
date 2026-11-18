import React, { useState, useEffect } from 'react';
import { ContentCard, PlatformId, StageId, DriveFile } from '../types';
import { STAGES, PLATFORMS, CONTENT_FORMATS } from '../data/constants';
import { 
  X, 
  ExternalLink, 
  Calendar,
  CalendarOff,
  Trash2, 
  Save, 
  Link as LinkIcon, 
  Check,
  Building2,
  Plus,
  HardDrive,
  Presentation,
  Ban,
  RotateCcw
} from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';
import { DrivePickerModal } from './DrivePickerModal';
import { getMimeTypeDetails } from '../services/driveService';
import { NO_DATE_PLANNED_VALUE, isAsapDate, isNoDatePlanned } from '../utils/dateUtils';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Partial<ContentCard>) => void;
  onDelete?: (cardId: string) => void;
  initialCard?: ContentCard | null;
  defaultStageId?: StageId;
  clientsList?: string[];
  onAddNewClient?: (clientName: string) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialCard,
  defaultStageId = 'briefe',
  clientsList = ['Brand', 'Gemini', 'Pixel', 'Search', 'Partenariat Foot'],
  onAddNewClient,
}) => {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('Brand');
  const [campaign, setCampaign] = useState('');
  const [stageId, setStageId] = useState<StageId>(defaultStageId);
  const [platforms, setPlatforms] = useState<PlatformId[]>(['instagram']);
  const [slideUrl, setSlideUrl] = useState('');
  const [driveFile, setDriveFile] = useState<DriveFile | undefined>(undefined);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [publicationDate, setPublicationDate] = useState('');
  const [format, setFormat] = useState('vidéo verticale');
  const [customFormat, setCustomFormat] = useState('');
  const [assigneeName, setAssigneeName] = useState('Stéphan Valentin');

  useEffect(() => {
    const knownFormats = ['vidéo verticale', 'video verticale', 'carrousel 4:5', 'carroussel 4:5', 'carrousel 1:1', 'carroussel 1:1', 'image fixe', 'pure copy'];

    if (initialCard) {
      setTitle(initialCard.title || '');
      const rawC = initialCard.client || 'Brand';
      const resolvedC = (rawC === 'Part. Foot.' || rawC === 'Part. Foot') ? 'Partenariat Foot' : rawC;
      setClient(resolvedC);
      setCampaign(initialCard.campaign || '');
      setStageId(initialCard.stageId || defaultStageId);
      setPlatforms(
        initialCard.platforms && initialCard.platforms.length > 0
          ? (initialCard.platforms.filter((p) => p !== ('tiktok' as any)) as PlatformId[])
          : ['instagram']
      );
      setSlideUrl(initialCard.slideUrl || '');
      setDriveFile(initialCard.driveFile);
      setPublicationDate(initialCard.publicationDate || '');

      let initialFmt = initialCard.format || 'vidéo verticale';
      if (initialFmt === 'video verticale') initialFmt = 'vidéo verticale';
      if (initialFmt === 'carroussel 4:5') initialFmt = 'carrousel 4:5';
      if (initialFmt === 'carroussel 1:1') initialFmt = 'carrousel 1:1';

      if (['vidéo verticale', 'carrousel 4:5', 'carrousel 1:1', 'image fixe', 'pure copy'].includes(initialFmt)) {
        setFormat(initialFmt);
        setCustomFormat('');
      } else if (initialFmt === 'Autre (préciser)') {
        setFormat('Autre (préciser)');
        setCustomFormat('');
      } else {
        setFormat('Autre (préciser)');
        setCustomFormat(initialFmt);
      }

      setAssigneeName(initialCard.assignee?.name || 'Stéphan Valentin');
    } else {
      setTitle('');
      setClient('Gemini');
      setCampaign('');
      setStageId(defaultStageId);
      setPlatforms(['instagram']);
      setSlideUrl('');
      setDriveFile(undefined);
      setPublicationDate('');
      setFormat('vidéo verticale');
      setCustomFormat('');
      setAssigneeName('Stéphan Valentin');
    }
  }, [initialCard, defaultStageId, isOpen]);

  if (!isOpen) return null;

  const togglePlatform = (id: PlatformId) => {
    if (platforms.includes(id)) {
      setPlatforms(platforms.filter((p) => p !== id));
    } else {
      setPlatforms([...platforms, id]);
    }
  };

  const selectAllPlatforms = () => {
    setPlatforms(PLATFORMS.map((p) => p.id));
  };

  const clearPlatforms = () => {
    setPlatforms([]);
  };

  const setDatePreset = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const iso = d.toISOString().split('T')[0];
    setPublicationDate(iso);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const trimmedClient = client.trim() || 'Brand';

    // Register new client if unknown
    if (onAddNewClient && trimmedClient && !clientsList.includes(trimmedClient)) {
      onAddNewClient(trimmedClient);
    }

    const initials = assigneeName
      ? assigneeName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'MK';

    const resolvedFormat =
      format === 'Autre (préciser)'
        ? customFormat.trim() || 'Autre'
        : format;

    onSave({
      id: initialCard?.id,
      title: title.trim(),
      client: trimmedClient,
      campaign: campaign.trim() || undefined,
      stageId,
      platforms: platforms.length > 0 ? platforms : ['instagram'],
      slideUrl: slideUrl.trim() || undefined,
      driveFile: driveFile || undefined,
      publicationDate: publicationDate || undefined,
      format: resolvedFormat,
      assignee: assigneeName
        ? {
            name: assigneeName.trim(),
            role: initialCard?.assignee?.role || undefined,
            initials,
          }
        : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-[#181b27] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-750 bg-[#141622]">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <h2 className="text-base font-bold text-white tracking-tight">
              {initialCard ? 'Modifier le contenu social' : 'Nouveau contenu réseaux sociaux'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto custom-scrollbar">
          {/* Titre du contenu */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Titre du contenu <span className="text-rose-400">*</span>
            </label>
            <input
              id="input-card-title"
              type="text"
              required
              placeholder="ex: Google Pixel 10 — Teaser Vidéo Nuit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-all shadow-inner"
            />
          </div>

          {/* PA & Campagne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  PA (Product Area) <span className="text-rose-400">*</span>
                </label>
              </div>

              {/* PA selection strictly limited to allowed PAs */}
              <div className="space-y-2">
                <select
                  id="input-card-client"
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-sm text-zinc-100 font-medium outline-none transition-all cursor-pointer"
                >
                  {clientsList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Quick PA chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-zinc-400 mr-0.5">Accès rapide :</span>
                  {clientsList.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setClient(c)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        client.toLowerCase() === c.toLowerCase()
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                          : 'bg-[#1c2030] border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Campagne (Optionnel)
              </label>
              <input
                id="input-card-campaign"
                type="text"
                placeholder="ex: Spring Launch, AI Innovations..."
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Étape de validation & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Étape de validation
                </label>
                {stageId === 'kille' ? (
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <Ban className="w-2.5 h-2.5" />
                    <span>Statut Killé</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStageId('kille')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-semibold flex items-center gap-1"
                    title="Marquer directement ce contenu comme abandonné / annulé"
                  >
                    <Ban className="w-2.5 h-2.5" />
                    <span>Option Killé</span>
                  </button>
                )}
              </div>
              <select
                id="select-card-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value as StageId)}
                className={`w-full px-3 py-2 bg-[#12141e] border rounded-xl text-sm font-medium outline-none cursor-pointer transition-colors ${
                  stageId === 'kille'
                    ? 'border-rose-500/80 text-rose-300 bg-rose-950/30'
                    : 'border-zinc-700 focus:border-emerald-400 text-zinc-100'
                }`}
              >
                {STAGES.map((st) => (
                  <option key={st.id} value={st.id} className="bg-[#181b27] text-zinc-100">
                    {st.label} {st.id === 'kille' ? '✕ (Abandonné / Annulé)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Format créatif
              </label>
              <select
                id="select-card-format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-sm text-zinc-100 font-medium outline-none cursor-pointer"
              >
                {CONTENT_FORMATS.map((f) => (
                  <option key={f} value={f} className="bg-[#181b27] text-zinc-100">
                    {f}
                  </option>
                ))}
              </select>

              {/* Précision du format si Autre (préciser) */}
              {format === 'Autre (préciser)' && (
                <div className="mt-2 animate-fadeIn">
                  <input
                    id="input-card-custom-format"
                    type="text"
                    required
                    autoFocus
                    placeholder="Préciser le format (ex: Story 9:16, Banner, Motion...)"
                    value={customFormat}
                    onChange={(e) => setCustomFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#12141e] border border-emerald-500 focus:border-emerald-400 rounded-xl text-xs text-zinc-100 placeholder-zinc-400 outline-none transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Indiquez le nom ou le ratio du format sur-mesure.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bannière d'état Killé */}
          {stageId === 'kille' && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-600/50 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-300 animate-fadeIn shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-rose-900/60 text-rose-300 shrink-0">
                  <Ban className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-bold text-rose-200">Ce contenu est marqué comme « Killé »</p>
                  <p className="text-[11px] text-rose-300/80">Projet annulé, abandonné ou mis de côté pour le moment.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStageId('briefe')}
                className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurer en Briefé</span>
              </button>
            </div>
          )}

          {/* Plateformes (1 ou plusieurs) - Retiré LinkedIn, Threads, Pinterest */}
          <div className="p-4 bg-[#141622] rounded-xl border border-zinc-750">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <span>Plateformes cibles</span>
                <span className="text-[11px] font-normal text-zinc-400 lowercase">(1 ou plusieurs)</span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllPlatforms}
                  className="text-emerald-400 hover:underline text-[11px] font-semibold"
                >
                  Tout cocher
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={clearPlatforms}
                  className="text-zinc-400 hover:text-zinc-200 text-[11px]"
                >
                  Effacer
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Indiquez les réseaux sociaux de diffusion pour ce contenu (Instagram, YouTube, X, Facebook).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLATFORMS.map((p) => {
                const isSelected = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    id={`toggle-platform-${p.id}`}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? `${p.badgeBg} ${p.badgeBorder} ring-1 ring-emerald-500 shadow-sm text-white`
                        : 'bg-[#1c2030] border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PlatformBadge platformId={p.id} size="sm" showLabel={false} />
                      <span className="truncate font-medium">{p.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lien vers la slide correspondante & Google Drive */}
          <div className="p-4 bg-[#141622] rounded-xl border border-zinc-750 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Lien vers la slide / Document Google Drive</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-open-drive-picker"
                  onClick={() => setIsDrivePickerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Drive</span>
                </button>

                {slideUrl && (
                  <a
                    href={slideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:underline font-medium px-2 py-1 bg-amber-950/40 rounded-lg border border-amber-500/30"
                  >
                    <span>Ouvrir</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Attached Drive File Card */}
            {driveFile ? (
              <div className="p-3 bg-[#181c2b] border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  <Presentation className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate" title={driveFile.name}>
                      {driveFile.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <span className="text-amber-300 font-medium">
                        {getMimeTypeDetails(driveFile.mimeType).label}
                      </span>
                      <span>•</span>
                      <span>Google Drive ID: {driveFile.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDrivePickerOpen(true)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-750 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
                  >
                    Changer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriveFile(undefined);
                      setSlideUrl('');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Détacher le fichier Drive"
                  >
                    Détacher
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <input
                id="input-card-slide"
                type="url"
                placeholder="https://docs.google.com/presentation/d/... ou sélectionnez depuis Google Drive ci-dessus"
                value={slideUrl}
                onChange={(e) => setSlideUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#12141e] border border-zinc-700 focus:border-amber-400 rounded-xl text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-all"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Lien direct vers la présentation Google Slides, le deck ou le fichier de travail créatif.
              </p>
            </div>
          </div>

          {/* Date de publication (optionnelle) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date de publication</span>
                <span className="text-[11px] font-normal text-zinc-400 lowercase">(optionnelle)</span>
              </label>
              <div className="flex items-center flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  id="btn-preset-asap"
                  onClick={() => setPublicationDate('ASAP')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                    isAsapDate(publicationDate)
                      ? 'bg-rose-500 text-zinc-950 shadow-md shadow-rose-500/20'
                      : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/70'
                  }`}
                >
                  ⚡ ASAP
                </button>
                <button
                  type="button"
                  id="btn-preset-no-date"
                  onClick={() => setPublicationDate(NO_DATE_PLANNED_VALUE)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    isNoDatePlanned(publicationDate)
                      ? 'bg-zinc-200 text-zinc-950 shadow-md'
                      : 'bg-[#222637] hover:bg-zinc-700 text-zinc-300 border border-zinc-600'
                  }`}
                >
                  <CalendarOff className="w-3 h-3" />
                  <span>Pas de date prévue</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset(1)}
                  className="px-2 py-0.5 rounded bg-[#222637] hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px]"
                >
                  Demain
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset(3)}
                  className="px-2 py-0.5 rounded bg-[#222637] hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px]"
                >
                  Dans 3j
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset(7)}
                  className="px-2 py-0.5 rounded bg-[#222637] hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px]"
                >
                  Dans 1 sem
                </button>
                {publicationDate && (
                  <button
                    type="button"
                    onClick={() => setPublicationDate('')}
                    className="text-rose-400 hover:underline text-[10px] ml-1"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {isAsapDate(publicationDate) ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-950/50 border border-rose-600/70 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-rose-200">
                    ⚡ ASAP — Publication prioritaire / immédiate
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicationDate('')}
                  className="text-xs text-zinc-300 hover:text-white underline shrink-0 ml-2"
                >
                  Choisir une date
                </button>
              </div>
            ) : isNoDatePlanned(publicationDate) ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1c2030] border border-zinc-600/80 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                    Pas de date prévue — Publication non planifiée
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicationDate('')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline shrink-0 ml-2 font-medium"
                >
                  Choisir une date
                </button>
              </div>
            ) : (
              <input
                id="input-card-date"
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-sm text-zinc-100 outline-none"
              />
            )}
          </div>

          {/* Assigné */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Responsable / Assigné
            </label>
            <input
              id="input-card-assignee"
              type="text"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              placeholder="ex: Stéphan Valentin"
              className="w-full px-3.5 py-2.5 bg-[#12141e] border border-zinc-700 focus:border-emerald-400 rounded-xl text-sm text-zinc-100 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-750">
            {initialCard && onDelete ? (
              <button
                type="button"
                id="btn-modal-delete"
                onClick={() => {
                  onDelete(initialCard.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-rose-800/60 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-modal-cancel"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-700/60 text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                id="btn-modal-submit"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>{initialCard ? 'Enregistrer les modifications' : 'Créer le contenu'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Google Drive Picker Modal */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        selectedFileId={driveFile?.id}
        suggestedTitle={title ? `${title} — Deck` : undefined}
        onSelectFile={(file) => {
          setDriveFile(file);
          if (file.webViewLink) {
            setSlideUrl(file.webViewLink);
          }
        }}
      />
    </div>
  );
};
