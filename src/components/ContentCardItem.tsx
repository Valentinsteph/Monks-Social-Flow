import React, { useState } from 'react';
import { ContentCard, StageConfig, StageId } from '../types';
import { STAGES } from '../data/constants';
import { PlatformBadge } from './PlatformBadge';
import { getDateStatus, formatFrenchDate, getRecentlyModifiedInfo, isAsapDate, isNoDatePlanned } from '../utils/dateUtils';
import { 
  ExternalLink, 
  Calendar,
  CalendarOff,
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit3,
  FileSpreadsheet,
  Clock,
  Ban,
  RotateCcw
} from 'lucide-react';

interface ContentCardItemProps {
  card: ContentCard;
  stages?: StageConfig[];
  isSessionModified?: boolean;
  onEdit: (card: ContentCard) => void;
  onMoveStage: (cardId: string, targetStageId: StageId) => void;
  onDuplicate: (card: ContentCard) => void;
  onDelete: (cardId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export const ContentCardItem: React.FC<ContentCardItemProps> = ({
  card,
  stages = STAGES,
  isSessionModified,
  onEdit,
  onMoveStage,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isKilled = card.stageId === 'kille';
  const linearStages = stages.filter((s) => s.id !== 'kille');
  const currentLinearIndex = linearStages.findIndex((s) => s.id === card.stageId);
  const prevStage = currentLinearIndex > 0 ? linearStages[currentLinearIndex - 1] : null;
  const nextStage = currentLinearIndex >= 0 && currentLinearIndex < linearStages.length - 1 ? linearStages[currentLinearIndex + 1] : null;

  const dateStatus = getDateStatus(card.publicationDate);
  const modifiedInfo = getRecentlyModifiedInfo(card.updatedAt, isSessionModified);

  const handleSlideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = card.driveFile?.webViewLink || card.slideUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      id={`content-card-${card.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(card)}
      className={`group relative border rounded-xl p-3.5 mb-3 transition-all duration-200 shadow-md hover:shadow-xl cursor-pointer select-none ${
        isKilled
          ? 'bg-[#18151f] hover:bg-[#201a27] border-rose-900/50 hover:border-rose-600/60 opacity-90'
          : 'bg-[#202334] hover:bg-[#272b3e] border-zinc-700 hover:border-zinc-500'
      }`}
    >
      {/* Top Header: Client & Format & Recently Modified Pastille */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-md truncate max-w-[130px]">
            {card.client}
          </span>
          {card.format && (
            <span className="text-[11px] text-zinc-300 bg-[#292d40] border border-zinc-650/80 px-1.5 py-0.5 rounded-md font-mono">
              {card.format}
            </span>
          )}
          {/* Badge statut Killé */}
          {isKilled && (
            <span
              id={`badge-kille-${card.id}`}
              title="Ce contenu est en statut Killé (abandonné / annulé)"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/90 border border-rose-600/70 px-1.5 py-0.5 rounded-md shadow-sm"
            >
              <Ban className="w-3 h-3 text-rose-400" />
              <span>KILLÉ</span>
            </span>
          )}
          {/* Pastille pour ceux qui viennent d'être modifiés */}
          {modifiedInfo && (
            <span
              id={`badge-modified-${card.id}`}
              title={`${modifiedInfo.label} (${new Date(card.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/90 border border-amber-500/60 px-1.5 py-0.5 rounded-md shadow-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
              </span>
              <span>{modifiedInfo.label}</span>
            </span>
          )}
        </div>

        {/* Menu toggle */}
        <div className="relative">
          <button
            id={`btn-menu-${card.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-700/60 transition-colors"
            title="Options de la carte"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }} 
              />
              <div className="absolute right-0 top-6 z-30 w-48 bg-[#1c2030] border border-zinc-700 rounded-lg shadow-2xl py-1 text-xs text-zinc-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(card);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-700/60 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-300" />
                  Modifier le contenu
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDuplicate(card);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-700/60 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-300" />
                  Dupliquer la carte
                </button>
                <div className="border-t border-zinc-700 my-1" />
                {/* Option Rapide Killé / Restaurer */}
                {isKilled ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onMoveStage(card.id, 'briefe');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-950/60 text-sky-300 flex items-center gap-2 font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    Restaurer en Briefé
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onMoveStage(card.id, 'kille');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-950/60 text-rose-400 flex items-center gap-2 font-medium"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    Marquer comme Killé
                  </button>
                )}
                <div className="border-t border-zinc-700 my-1" />
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Déplacer vers
                </div>
                {stages.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={st.id === card.stageId}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onMoveStage(card.id, st.id);
                    }}
                    className={`w-full text-left px-3 py-1 text-[11px] flex items-center justify-between ${
                      st.id === card.stageId 
                        ? 'text-emerald-400 bg-emerald-950/40 font-semibold' 
                        : 'hover:bg-zinc-700/60 text-zinc-200'
                    }`}
                  >
                    <span className="truncate">{st.label}</span>
                    {st.id === card.stageId && <span className="text-[10px]">● Actif</span>}
                  </button>
                ))}
                <div className="border-t border-zinc-700 my-1" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete(card.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-950/50 text-rose-300 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card Title */}
      <h4
        className={`text-sm font-semibold mb-2 leading-snug group-hover:text-white line-clamp-2 ${
          isKilled ? 'line-through text-zinc-400' : 'text-zinc-100'
        }`}
      >
        {card.title}
      </h4>

      {/* Platforms row (1 or multiple) */}
      <div className="mb-2.5">
        <div className="flex flex-wrap gap-1">
          {card.platforms && card.platforms.length > 0 ? (
            card.platforms.map((p) => (
              <PlatformBadge key={p} platformId={p} size="sm" showLabel={card.platforms.length <= 3} />
            ))
          ) : (
            <span className="text-[10px] text-zinc-500 italic">Plateforme non définie</span>
          )}
        </div>
      </div>

      {/* Slide link section & Publication Date */}
      <div className="flex flex-col gap-1.5 mb-3 pt-1.5 border-t border-zinc-700/60">
        {/* Slide corresponding link */}
        {card.slideUrl || card.driveFile ? (
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              id={`btn-slide-${card.id}`}
              onClick={handleSlideClick}
              className="inline-flex items-center gap-1.5 text-xs text-amber-200 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 px-2.5 py-1 rounded-md transition-colors w-full font-medium shadow-sm"
              title={`Ouvrir dans Google Drive / Slide : ${card.driveFile?.name || card.slideUrl}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{card.driveFile ? card.driveFile.name : 'Slide correspondante'}</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-80 shrink-0" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span>Aucune slide liée</span>
          </div>
        )}

        {/* Publication date (optional) */}
        {card.publicationDate && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              {isNoDatePlanned(card.publicationDate) ? (
                <CalendarOff className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="text-[11px] font-medium">
                {isAsapDate(card.publicationDate) || isNoDatePlanned(card.publicationDate)
                  ? 'Publication :'
                  : formatFrenchDate(card.publicationDate)}
              </span>
            </div>
            {isAsapDate(card.publicationDate) ? (
              <span className="text-[10px] px-2 py-0.5 rounded border font-bold bg-rose-950/90 text-rose-300 border-rose-600/70 animate-pulse flex items-center gap-1">
                ⚡ ASAP
              </span>
            ) : isNoDatePlanned(card.publicationDate) ? (
              <span className="text-[10px] px-2 py-0.5 rounded border font-medium bg-zinc-800/90 text-zinc-300 border-zinc-600/70">
                Pas de date prévue
              </span>
            ) : (
              dateStatus && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${dateStatus.badgeClass}`}>
                  {dateStatus.label}
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* Footer: Assignee & Stage quick jump buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-700/60 text-xs">
        {/* Assignee */}
        {card.assignee ? (
          <div
            className="flex items-center gap-1.5"
            title={card.assignee.role ? `${card.assignee.name} (${card.assignee.role})` : card.assignee.name}
          >
            <span className="w-5 h-5 rounded-full bg-[#292d40] border border-zinc-650 text-zinc-200 flex items-center justify-center text-[10px] font-bold">
              {card.assignee.initials}
            </span>
            <span className="text-[11px] text-zinc-300 font-medium truncate max-w-[90px]">
              {card.assignee.name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-400 italic">Non assigné</span>
        )}

        {/* Quick advance / rewind buttons */}
        {isKilled ? (
          <button
            type="button"
            id={`btn-restore-${card.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onMoveStage(card.id, 'briefe');
            }}
            className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 text-rose-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Restaurer le contenu en Briefé"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Restaurer en Briefé</span>
          </button>
        ) : (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {prevStage && (
              <button
                type="button"
                id={`btn-prev-${card.id}`}
                onClick={() => onMoveStage(card.id, prevStage.id)}
                className="p-1 rounded bg-[#292d40] hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-650"
                title={`Reculer vers : ${prevStage.label}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {nextStage && (
              <button
                type="button"
                id={`btn-next-${card.id}`}
                onClick={() => onMoveStage(card.id, nextStage.id)}
                className="px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-800/90 border border-emerald-600/70 text-emerald-200 hover:text-white text-[10px] font-semibold flex items-center gap-0.5 transition-colors shadow-sm"
                title={`Avancer vers : ${nextStage.label}`}
              >
                <span>{nextStage.shortLabel || nextStage.label}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
