import React, { useState } from 'react';
import { ContentCard, StageConfig, StageId } from '../types';
import { ContentCardItem } from './ContentCardItem';
import { Plus, Info, Ban } from 'lucide-react';

interface ColumnProps {
  stage: StageConfig;
  stages?: StageConfig[];
  cards: ContentCard[];
  recentModifiedIds?: Set<string>;
  onAddCardToStage: (stageId: StageId) => void;
  onEditCard: (card: ContentCard) => void;
  onMoveStage: (cardId: string, targetStageId: StageId) => void;
  onDuplicateCard: (card: ContentCard) => void;
  onDeleteCard: (cardId: string) => void;
  onCardDrop: (cardId: string, targetStageId: StageId) => void;
}

export const Column: React.FC<ColumnProps> = ({
  stage,
  stages,
  cards,
  recentModifiedIds,
  onAddCardToStage,
  onEditCard,
  onMoveStage,
  onDuplicateCard,
  onDeleteCard,
  onCardDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      onCardDrop(cardId, stage.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragOver(false);
  };

  return (
    <div
      id={`column-${stage.id}`}
      className={`flex flex-col w-80 shrink-0 rounded-2xl border transition-all duration-200 shadow-md ${
        isDragOver
          ? 'border-emerald-500 bg-[#1e2334] shadow-lg shadow-emerald-500/10'
          : stage.id === 'kille'
          ? 'bg-[#17131b] border-rose-900/40 hover:border-rose-700/50'
          : 'bg-[#161824] border-zinc-750'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className={`p-3.5 pb-2.5 border-b rounded-t-2xl ${
        stage.id === 'kille'
          ? 'border-rose-900/40 bg-[#1e1520]/90'
          : 'border-zinc-750 bg-[#1a1d2c]/80'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {stage.id === 'kille' ? (
              <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${stage.indicatorBg}`} />
            )}
            <h3 className="font-bold text-sm text-zinc-100 tracking-tight truncate">
              {stage.label}
            </h3>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            stage.id === 'kille'
              ? 'bg-rose-950/60 border-rose-800 text-rose-300'
              : 'bg-[#222637] border-zinc-700 text-zinc-200'
          }`}>
            {cards.length}
          </span>
        </div>

        {/* Stage Subtext / Explanation */}
        <p className="text-[11px] text-zinc-400 line-clamp-1 flex items-center gap-1">
          <Info className="w-3 h-3 text-zinc-400 shrink-0" />
          <span title={stage.description}>{stage.description}</span>
        </p>
      </div>

      {/* Add button inside column */}
      <div className="px-3 pt-2">
        <button
          type="button"
          id={`btn-add-to-${stage.id}`}
          onClick={() => onAddCardToStage(stage.id)}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed transition-colors text-xs font-semibold ${
            stage.id === 'kille'
              ? 'border-rose-900/60 hover:border-rose-600 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300'
              : 'border-zinc-700 hover:border-zinc-500 bg-[#1b1e2c]/60 hover:bg-[#222637] text-zinc-300 hover:text-white'
          }`}
        >
          {stage.id === 'kille' ? <Ban className="w-3.5 h-3.5 text-rose-400" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{stage.id === 'kille' ? 'Ajouter un contenu killé' : 'Ajouter un contenu'}</span>
        </button>
      </div>

      {/* Cards Scrollable Area */}
      <div className="flex-1 p-3 overflow-y-auto min-h-[420px] max-h-[calc(100vh-230px)] custom-scrollbar">
        {cards.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-zinc-700/60 bg-[#1a1d2c]/30">
            <p className="text-xs text-zinc-300 font-medium mb-1">Aucun contenu à cette étape</p>
            <p className="text-[11px] text-zinc-400">Glissez une carte ici ou cliquez sur Ajouter</p>
          </div>
        ) : (
          cards.map((card) => (
            <ContentCardItem
              key={card.id}
              card={card}
              stages={stages}
              isSessionModified={recentModifiedIds?.has(card.id)}
              onEdit={onEditCard}
              onMoveStage={onMoveStage}
              onDuplicate={onDuplicateCard}
              onDelete={onDeleteCard}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
};
