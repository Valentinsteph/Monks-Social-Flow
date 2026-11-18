import React from 'react';
import { ContentCard, StageId } from '../types';
import { STAGES } from '../data/constants';
import { PlatformBadge } from './PlatformBadge';
import { formatFrenchDate, getDateStatus, getRecentlyModifiedInfo } from '../utils/dateUtils';
import { ExternalLink, Calendar, Edit3, Trash2, FileSpreadsheet } from 'lucide-react';

interface ListViewProps {
  cards: ContentCard[];
  recentModifiedIds?: Set<string>;
  onEditCard: (card: ContentCard) => void;
  onMoveStage: (cardId: string, targetStageId: StageId) => void;
  onDeleteCard: (cardId: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  cards,
  recentModifiedIds,
  onEditCard,
  onMoveStage,
  onDeleteCard,
}) => {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
        <p className="text-sm font-medium">Aucun contenu ne correspond aux filtres appliqués.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-zinc-750 bg-[#141622] shadow-xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-750 bg-[#1a1d2c] text-zinc-300 font-bold uppercase tracking-wider text-[10px]">
            <th className="py-3.5 px-4">Contenu & PA</th>
            <th className="py-3.5 px-4">Étape de validation</th>
            <th className="py-3.5 px-4">Plateformes</th>
            <th className="py-3.5 px-4">Slide liée</th>
            <th className="py-3.5 px-4">Date de publication</th>
            <th className="py-3.5 px-4">Assigné</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-750/70">
          {cards.map((card) => {
            const dateStatus = getDateStatus(card.publicationDate);
            const modifiedInfo = getRecentlyModifiedInfo(card.updatedAt, recentModifiedIds?.has(card.id));

            return (
              <tr
                key={card.id}
                onClick={() => onEditCard(card)}
                className={`cursor-pointer transition-colors group ${
                  card.stageId === 'kille'
                    ? 'hover:bg-rose-950/20 bg-rose-950/10'
                    : 'hover:bg-[#1c2030]'
                }`}
              >
                {/* Contenu & Client */}
                <td className="py-3.5 px-4 min-w-[260px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-semibold group-hover:text-white ${
                        card.stageId === 'kille' ? 'line-through text-zinc-400' : 'text-zinc-100'
                      }`}
                    >
                      {card.title}
                    </span>
                    {/* Badge Killé si applicable */}
                    {card.stageId === 'kille' && (
                      <span className="text-[9px] font-bold text-rose-300 bg-rose-950/90 border border-rose-600/70 px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">
                        KILLÉ
                      </span>
                    )}
                    {/* Pastille de modification récente */}
                    {modifiedInfo && (
                      <span
                        title={`${modifiedInfo.label} (${new Date(card.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`}
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-950/90 border border-amber-500/60 px-1.5 py-0.5 rounded-full shrink-0 shadow-sm"
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                        </span>
                        <span>{modifiedInfo.label}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                    <span className="text-emerald-400 font-bold">{card.client}</span>
                    {card.format && <span className="font-mono text-zinc-400">• {card.format}</span>}
                    {card.campaign && <span className="text-zinc-400">({card.campaign})</span>}
                  </div>
                </td>

                {/* Étape de validation */}
                <td className="py-3.5 px-4 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={card.stageId}
                    onChange={(e) => onMoveStage(card.id, e.target.value as StageId)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none cursor-pointer transition-colors ${
                      card.stageId === 'kille'
                        ? 'bg-rose-950/50 border border-rose-700/80 text-rose-300'
                        : 'bg-[#222637] border border-zinc-700 hover:border-emerald-500 text-zinc-100'
                    }`}
                  >
                    {STAGES.map((st) => (
                      <option key={st.id} value={st.id} className="bg-[#181b27] text-zinc-100">
                        {st.label} {st.id === 'kille' ? '✕ (Killé)' : ''}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Plateformes */}
                <td className="py-3.5 px-4 min-w-[170px]">
                  <div className="flex flex-wrap gap-1">
                    {card.platforms && card.platforms.length > 0 ? (
                      card.platforms.map((p) => (
                        <PlatformBadge key={p} platformId={p} size="sm" showLabel={card.platforms.length <= 2} />
                      ))
                    ) : (
                      <span className="text-zinc-500 italic text-[11px]">-</span>
                    )}
                  </div>
                </td>

                {/* Slide liée */}
                <td className="py-3.5 px-4 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                  {card.slideUrl ? (
                    <a
                      href={card.slideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-200 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 px-2.5 py-1 rounded-md transition-colors font-medium shadow-sm"
                      title={card.slideUrl}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ouvrir slide</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                    </a>
                  ) : (
                    <span className="text-zinc-500 text-[11px] italic">Aucune slide</span>
                  )}
                </td>

                {/* Date de publication */}
                <td className="py-3.5 px-4 min-w-[150px]">
                  {card.publicationDate ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {card.publicationDate.toUpperCase() === 'ASAP' ? (
                          <span className="text-[11px] px-2 py-0.5 rounded border font-bold bg-rose-950/90 text-rose-300 border-rose-600/70 animate-pulse">
                            ⚡ ASAP
                          </span>
                        ) : (
                          <span>{formatFrenchDate(card.publicationDate)}</span>
                        )}
                      </div>
                      {dateStatus && card.publicationDate.toUpperCase() !== 'ASAP' && (
                        <span className={`inline-block w-fit text-[10px] px-1.5 py-0.2 rounded border font-semibold ${dateStatus.badgeClass}`}>
                          {dateStatus.label}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-[11px] italic">Non définie</span>
                  )}
                </td>

                {/* Assigné */}
                <td className="py-3.5 px-4 min-w-[130px]">
                  {card.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#292d40] border border-zinc-650 text-[10px] font-bold flex items-center justify-center text-zinc-200">
                        {card.assignee.initials}
                      </span>
                      <span className="text-zinc-200 truncate max-w-[100px]">{card.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-[11px]">-</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditCard(card)}
                      className="p-1.5 rounded-lg hover:bg-zinc-700/60 text-zinc-300 hover:text-white transition-colors"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCard(card.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
