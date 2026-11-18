import React, { useState } from 'react';
import { PlatformId, ViewMode } from '../types';
import { PLATFORMS } from '../data/constants';
import { 
  Plus, 
  Search, 
  Kanban, 
  ListFilter, 
  Calendar,
  RotateCcw, 
  Download,
  Layers,
  History,
  HardDrive,
  X
} from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPlatform: PlatformId | 'all';
  onSelectPlatform: (p: PlatformId | 'all') => void;
  selectedClient: string;
  onSelectClient: (c: string) => void;
  clientsList: string[];
  onAddClient?: (newClient: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenNewCard: () => void;
  onResetData: () => void;
  onRestoreData?: () => void;
  onExportData: () => void;
  onOpenDriveExplorer?: () => void;
  totalCards: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onSelectPlatform,
  selectedClient,
  onSelectClient,
  clientsList,
  viewMode,
  onViewModeChange,
  onOpenNewCard,
  onResetData,
  onRestoreData,
  onExportData,
  onOpenDriveExplorer,
  totalCards,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#141622]/95 backdrop-blur-md border-b border-zinc-750 px-4 sm:px-6 py-3 shadow-md">
      {/* Top row: Brand & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        {/* Monks Logo & App Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#1c2030] border border-zinc-700 px-3 py-1.5 rounded-xl shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold tracking-tighter text-base text-white">.Monks</span>
            <span className="text-zinc-500 text-xs mx-0.5">/</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Social Flow</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-300 pl-2 border-l border-zinc-750">
            <span>Workflow Réseaux Sociaux</span>
            <span className="px-2 py-0.5 rounded-full bg-[#1c2030] text-zinc-200 font-mono text-[11px] border border-zinc-700">
              {totalCards} contenus
            </span>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="flex items-center bg-[#181b28] border border-zinc-700 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              id="btn-view-board"
              onClick={() => onViewModeChange('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                viewMode === 'board'
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tableau Kanban</span>
            </button>
            <button
              type="button"
              id="btn-view-list"
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                viewMode === 'list'
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vue Liste</span>
            </button>
            <button
              type="button"
              id="btn-view-calendar"
              onClick={() => onViewModeChange('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                viewMode === 'calendar'
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendrier</span>
            </button>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={onExportData}
            title="Exporter les contenus (JSON)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-[#1c2030] hover:bg-[#222637] text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Restore Previous Cards button */}
          {onRestoreData && (
            <button
              type="button"
              id="btn-restore-cards"
              onClick={onRestoreData}
              title="Restaurer mes anciennes cartes (sauvegardes précédentes)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-600/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Restaurer cartes</span>
            </button>
          )}

          {/* Reset Demo button */}
          <button
            type="button"
            onClick={onResetData}
            title="Réinitialiser avec les contenus exemples"
            className="p-1.5 rounded-xl border border-zinc-700 bg-[#1c2030] hover:bg-[#222637] text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Google Drive Account & Explorer */}
          <div className="flex items-center gap-1.5 border-l border-zinc-750 pl-2">
            {onOpenDriveExplorer && (
              <button
                type="button"
                id="btn-nav-drive-explorer"
                onClick={onOpenDriveExplorer}
                title="Ouvrir l'explorateur Google Drive"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-colors"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Drive</span>
              </button>
            )}
            <GoogleAuthButton onOpenDriveExplorer={onOpenDriveExplorer} />
          </div>

          {/* Add New Content Button */}
          <button
            type="button"
            id="btn-new-content-main"
            onClick={onOpenNewCard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nouveau Contenu</span>
          </button>
        </div>
      </div>

      {/* Filter Row: Search, Platform Filter & Client Filter + Add Client */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-zinc-750">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            id="input-search-query"
            type="text"
            placeholder="Rechercher titre, PA, format, notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#181b28] border border-zinc-700 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Platform filters pills (Only Instagram, YouTube, X, Facebook) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full custom-scrollbar">
          <button
            type="button"
            onClick={() => onSelectPlatform('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              selectedPlatform === 'all'
                ? 'bg-zinc-100 text-zinc-950 font-bold'
                : 'bg-[#181b28] border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
            }`}
          >
            Toutes plateformes
          </button>

          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlatform(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center gap-1 border ${
                selectedPlatform === p.id
                  ? `${p.badgeBg} ${p.badgeBorder} ring-1 ring-emerald-500 font-bold text-white`
                  : 'bg-[#181b28] border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
              }`}
            >
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* PA filter dropdown */}
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <select
            id="select-client-filter"
            value={selectedClient}
            onChange={(e) => onSelectClient(e.target.value)}
            className="bg-[#181b28] border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-100 font-medium outline-none cursor-pointer hover:border-zinc-500"
          >
            <option value="all">Tous les PA ({clientsList.length})</option>
            {clientsList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
