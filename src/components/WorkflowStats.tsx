import React from 'react';
import { ContentCard, StageId } from '../types';
import { STAGES } from '../data/constants';
import { CheckCircle2, Send, Clock, ShieldCheck, Ban } from 'lucide-react';

interface WorkflowStatsProps {
  cards: ContentCard[];
  onSelectStageFilter?: (stageId: StageId | 'all') => void;
  activeStageFilter?: StageId | 'all';
}

export const WorkflowStats: React.FC<WorkflowStatsProps> = ({
  cards,
  onSelectStageFilter,
  activeStageFilter = 'all',
}) => {
  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage.id] = cards.filter((c) => c.stageId === stage.id).length;
    return acc;
  }, {} as Record<StageId, number>);

  const aFaireValiderClient = 
    (stageCounts['concept-a-faire-valider-client'] || 0) + 
    (stageCounts['prod-a-faire-valider-client'] || 0);

  const totalValide = stageCounts['valide'] || 0;
  const postedCount = stageCounts['poste'] || 0;
  const killeCount = stageCounts['kille'] || 0;

  const linearStages = STAGES.filter((s) => s.id !== 'kille');
  const killeStage = STAGES.find((s) => s.id === 'kille');

  return (
    <div className="px-4 sm:px-6 py-2.5 bg-[#141622] border-b border-zinc-750 overflow-x-auto custom-scrollbar shadow-inner">
      <div className="flex items-center justify-between gap-4 min-w-max">
        {/* Stage Funnel Stepper */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mr-1">
            Pipeline Monks :
          </span>
          {linearStages.map((stage, idx) => {
            const count = stageCounts[stage.id] || 0;
            const isFilterActive = activeStageFilter === stage.id;

            return (
              <React.Fragment key={stage.id}>
                <button
                  type="button"
                  onClick={() => onSelectStageFilter && onSelectStageFilter(isFilterActive ? 'all' : stage.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isFilterActive
                      ? 'bg-emerald-500 text-zinc-950 ring-1 ring-emerald-400 font-bold shadow-sm'
                      : 'hover:bg-[#1f2334] bg-[#181b28] border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title={`${stage.label} : ${count} contenus`}
                >
                  <span className={`w-2 h-2 rounded-full ${stage.indicatorBg}`} />
                  <span className="text-[11px]">{stage.shortLabel || stage.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isFilterActive ? 'bg-zinc-950 text-emerald-300' : 'bg-[#222637] text-zinc-200 border border-zinc-700'
                  }`}>
                    {count}
                  </span>
                </button>
                {idx < linearStages.length - 1 && (
                  <span className="text-zinc-500 text-xs select-none">→</span>
                )}
              </React.Fragment>
            );
          })}

          {/* Séparateur & Bouton Filtre Killé */}
          <span className="text-zinc-600 mx-1 select-none">|</span>
          {killeStage && (
            <button
              type="button"
              id="filter-stage-kille"
              onClick={() => onSelectStageFilter && onSelectStageFilter(activeStageFilter === 'kille' ? 'all' : 'kille')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStageFilter === 'kille'
                  ? 'bg-rose-600 text-white ring-1 ring-rose-400 font-bold shadow-sm'
                  : 'hover:bg-rose-950/50 bg-[#1e1720] border border-rose-900/60 text-rose-300 hover:text-rose-200'
              }`}
              title="Contenus en statut Killé (abandonnés / annulés)"
            >
              <Ban className="w-3 h-3 text-rose-400" />
              <span className="text-[11px]">Killé</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeStageFilter === 'kille' ? 'bg-zinc-950 text-rose-300' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {killeCount}
              </span>
            </button>
          )}
        </div>

        {/* Highlight metric pills */}
        <div className="flex items-center gap-2 pl-4 border-l border-zinc-750 text-xs">
          <div 
            className="flex items-center gap-1.5 text-orange-300 font-semibold px-2.5 py-1 rounded-lg bg-orange-950/40 border border-orange-700/50"
            title="Contenus en attente de validation (Client ou Chloé)"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En validation : {aFaireValiderClient}</span>
          </div>

          <div 
            className="flex items-center gap-1.5 text-emerald-300 font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-600/60"
            title="Contenus avec validation formelle reçue"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VALIDÉ : {totalValide}</span>
          </div>

          <div 
            className="flex items-center gap-1.5 text-pink-300 font-semibold px-2.5 py-1 rounded-lg bg-pink-950/40 border border-pink-700/50"
            title="Contenus publiés sur les réseaux"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Postés : {postedCount}</span>
          </div>

          {killeCount > 0 && (
            <div 
              onClick={() => onSelectStageFilter && onSelectStageFilter(activeStageFilter === 'kille' ? 'all' : 'kille')}
              className="flex items-center gap-1.5 text-rose-300 font-semibold px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/60 cursor-pointer hover:bg-rose-900/40 transition-colors"
              title="Cliquer pour afficher uniquement les contenus killés"
            >
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>Killés : {killeCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
