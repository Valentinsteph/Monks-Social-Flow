import React, { useState, useMemo } from 'react';
import { ContentCard, StageId } from '../types';
import { STAGES } from '../data/constants';
import { PlatformBadge } from './PlatformBadge';
import { formatFrenchDate, getDateStatus } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  List,
  Plus,
  Clock,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

interface CalendarViewProps {
  cards: ContentCard[];
  recentModifiedIds?: Set<string>;
  onEditCard: (card: ContentCard) => void;
  onAddNewCardOnDate?: (dateString: string) => void;
  onUpdateCardDate?: (cardId: string, newDateString: string) => void;
}

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Returns the Monday (at 00:00:00) of the week for a given Date
 */
function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Returns ISO week number
 */
function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Formats a week range in French (e.g. "Semaine du 14 au 20 Septembre 2026")
 */
function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const mDay = monday.getDate();
  const sDay = sunday.getDate();
  const mMonth = monthNames[monday.getMonth()];
  const sMonth = monthNames[sunday.getMonth()];
  const year = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
    return `${mDay} – ${sDay} ${sMonth} ${year}`;
  } else if (monday.getFullYear() === sunday.getFullYear()) {
    return `${mDay} ${mMonth} – ${sDay} ${sMonth} ${year}`;
  } else {
    return `${mDay} ${mMonth} ${monday.getFullYear()} – ${sDay} ${sMonth} ${year}`;
  }
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  cards,
  recentModifiedIds,
  onEditCard,
  onAddNewCardOnDate,
  onUpdateCardDate,
}) => {
  // Determine initial date: today or current date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Default mode is now 'week' (vue par semaine) as requested
  const [calendarMode, setCalendarMode] = useState<'week' | 'grid' | 'agenda'>('week');
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState<boolean>(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    if (calendarMode === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (calendarMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group cards into scheduled (YYYY-MM-DD) vs unscheduled/ASAP
  const { scheduledMap, unscheduledCards, currentMonthCardCount } = useMemo(() => {
    const map: Record<string, ContentCard[]> = {};
    const unscheduled: ContentCard[] = [];
    let monthCount = 0;

    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    cards.forEach((card) => {
      const pubDate = card.publicationDate?.trim();
      if (pubDate && /^\d{4}-\d{2}-\d{2}$/.test(pubDate)) {
        if (!map[pubDate]) {
          map[pubDate] = [];
        }
        map[pubDate].push(card);
        if (pubDate.startsWith(currentMonthPrefix)) {
          monthCount++;
        }
      } else {
        unscheduled.push(card);
      }
    });

    return { scheduledMap: map, unscheduledCards: unscheduled, currentMonthCardCount: monthCount };
  }, [cards, year, month]);

  // Week calculation: Monday to Sunday
  const mondayOfWeek = useMemo(() => getMonday(currentDate), [currentDate]);
  const weekNumber = useMemo(() => getWeekNumber(mondayOfWeek), [mondayOfWeek]);

  const weekDays = useMemo(() => {
    const days: {
      date: Date;
      dateString: string;
      dayName: string;
      dayShort: string;
      dayNumber: number;
      monthShort: string;
      isToday: boolean;
      cards: ContentCard[];
    }[] = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monthShorts = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayOfWeek.getTime() + i * 86400000);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        dateString,
        dayName: WEEKDAYS[i],
        dayShort: WEEKDAYS_SHORT[i],
        dayNumber: d.getDate(),
        monthShort: monthShorts[d.getMonth()],
        isToday: dateString === todayStr,
        cards: scheduledMap[dateString] || [],
      });
    }

    return days;
  }, [mondayOfWeek, scheduledMap]);

  const currentWeekCardCount = useMemo(() => {
    return weekDays.reduce((acc, day) => acc + day.cards.length, 0);
  }, [weekDays]);

  // Month grid calculation (Monday-based)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      cards: ContentCard[];
    }[] = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 1. Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 1, d);
      const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        cards: scheduledMap[dateStr] || [],
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        cards: scheduledMap[dateStr] || [],
      });
    }

    // 3. Next month leading days to complete grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(year, month + 1, d);
      const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        cards: scheduledMap[dateStr] || [],
      });
    }

    return cells;
  }, [year, month, scheduledMap]);

  // Agenda view: sorted list of dates that have cards
  const agendaList = useMemo(() => {
    const dates = Object.keys(scheduledMap).sort();
    return dates.map((dateStr) => {
      const dateObj = new Date(dateStr + 'T00:00:00');
      const items = scheduledMap[dateStr];
      return {
        dateStr,
        dateObj,
        items,
      };
    });
  }, [scheduledMap]);

  // Drag & Drop handlers to reschedule cards by dragging them onto a calendar day
  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== dateStr) {
      setDragOverDay(dateStr);
    }
  };

  const handleDragLeave = (dateStr: string) => {
    if (dragOverDay === dateStr) {
      setDragOverDay(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOverDay(null);
    const cardId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('cardId');
    if (cardId && onUpdateCardDate) {
      onUpdateCardDate(cardId, targetDate);
    }
  };

  // Month title formatted in French (e.g. "Septembre 2026")
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="space-y-4">
      {/* Calendar Navigation & Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161824] border border-zinc-750 p-4 rounded-2xl shadow-lg">
        {/* Left: Navigation & Date Title */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1c2030] border border-zinc-700 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              id="btn-calendar-prev"
              onClick={handlePrev}
              title={calendarMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-calendar-today"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors"
            >
              {calendarMode === 'week' ? 'Cette semaine' : "Aujourd'hui"}
            </button>
            <button
              type="button"
              id="btn-calendar-next"
              onClick={handleNext}
              title={calendarMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Title based on mode */}
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              {calendarMode === 'week' ? (
                <>
                  <CalendarRange className="w-5 h-5 text-emerald-400" />
                  <span>{formatWeekRange(mondayOfWeek)}</span>
                </>
              ) : calendarMode === 'grid' ? (
                <>
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  <span>{capitalizedMonthName}</span>
                </>
              ) : (
                <>
                  <List className="w-5 h-5 text-emerald-400" />
                  <span>Planning chronologique</span>
                </>
              )}
            </h2>

            {calendarMode === 'week' && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                S{weekNumber}
              </span>
            )}
          </div>
        </div>

        {/* Right: Stats, ASAP tray toggle & Mode switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Card counter pill */}
          <div className="text-xs text-zinc-300 bg-[#1c2030] border border-zinc-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              {calendarMode === 'week' ? (
                <>
                  <strong className="text-zinc-100 font-bold">{currentWeekCardCount}</strong> publication{currentWeekCardCount > 1 ? 's' : ''} cette semaine
                </>
              ) : calendarMode === 'grid' ? (
                <>
                  <strong className="text-zinc-100 font-bold">{currentMonthCardCount}</strong> publication{currentMonthCardCount > 1 ? 's' : ''} ce mois
                </>
              ) : (
                <>
                  <strong className="text-zinc-100 font-bold">{cards.length - unscheduledCards.length}</strong> programmée{cards.length - unscheduledCards.length > 1 ? 's' : ''}
                </>
              )}
            </span>
          </div>

          {/* Toggle Unscheduled / ASAP drawer */}
          {unscheduledCards.length > 0 && (
            <button
              type="button"
              id="btn-toggle-unscheduled"
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                showUnscheduled
                  ? 'bg-rose-950/60 border-rose-700/70 text-rose-200 hover:bg-rose-950/80'
                  : 'bg-[#1c2030] border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>
                Sans date / ASAP (<strong>{unscheduledCards.length}</strong>)
              </span>
            </button>
          )}

          {/* Mode switcher: Semaine (primary) | Mois | Planning */}
          <div className="flex items-center bg-[#1c2030] border border-zinc-700 rounded-xl p-1 text-xs">
            <button
              type="button"
              id="btn-cal-mode-week"
              onClick={() => setCalendarMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-bold ${
                calendarMode === 'week'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semaine</span>
            </button>
            <button
              type="button"
              id="btn-cal-mode-grid"
              onClick={() => setCalendarMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                calendarMode === 'grid'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mois</span>
            </button>
            <button
              type="button"
              id="btn-cal-mode-agenda"
              onClick={() => setCalendarMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                calendarMode === 'agenda'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Planning</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unscheduled / ASAP Drawer (drag & drop source) */}
      {unscheduledCards.length > 0 && showUnscheduled && (
        <div className="bg-[#1f1724] border border-rose-800/50 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold text-rose-200">
                Contenus sans date fixe ou marqués « ASAP » ({unscheduledCards.length})
              </span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                — Glissez une carte sur un jour de la semaine pour la planifier
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnscheduled(false)}
              className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
            >
              Masquer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {unscheduledCards.map((card) => {
              const stage = STAGES.find((s) => s.id === card.stageId);
              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', card.id);
                    e.dataTransfer.setData('cardId', card.id);
                  }}
                  onClick={() => onEditCard(card)}
                  className="group bg-[#222637] hover:bg-[#282d42] border border-zinc-700 hover:border-zinc-500 p-3 rounded-xl cursor-pointer transition-all shadow-sm flex flex-col justify-between gap-2 select-none"
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: stage?.accentColor || '#10b981',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                        {card.client}
                      </span>
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-950/90 border border-rose-700/60 px-1.5 py-0.5 rounded">
                        {card.publicationDate ? card.publicationDate : 'Sans date'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {card.platforms.map((p) => (
                        <PlatformBadge key={p} platformId={p} size="sm" showLabel={false} />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-zinc-100 line-clamp-1 group-hover:text-white">
                    {card.title}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-zinc-300 pt-1.5 border-t border-zinc-700/70">
                    {/* Pipeline status */}
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold truncate max-w-[140px]"
                      style={{
                        backgroundColor: `${stage?.accentColor || '#10b981'}25`,
                        color: stage?.accentColor || '#10b981',
                        border: `1px solid ${stage?.accentColor || '#10b981'}50`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.accentColor }} />
                      <span className="truncate">{stage?.shortLabel || stage?.label}</span>
                    </span>
                    <span className="text-emerald-400 group-hover:underline font-bold text-xs">Planifier →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WEEK VIEW (PRIMARY / DEFAULT MODE)                                      */}
      {/* ========================================================================= */}
      {calendarMode === 'week' && (
        <div className="space-y-3">
          {/* Week Grid: 7 days columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-start pb-4">
            {weekDays.map((day) => {
              const isOver = dragOverDay === day.dateString;

              return (
                <div
                  key={day.dateString}
                  onDragOver={(e) => handleDragOver(e, day.dateString)}
                  onDragLeave={() => handleDragLeave(day.dateString)}
                  onDrop={(e) => handleDrop(e, day.dateString)}
                  className={`flex flex-col bg-[#141622] border rounded-2xl overflow-hidden transition-all shadow-md min-h-[460px] ${
                    day.isToday
                      ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-emerald-950/20'
                      : 'border-zinc-750 hover:border-zinc-650'
                  } ${isOver ? 'ring-2 ring-emerald-400 bg-emerald-950/30 border-emerald-400' : ''}`}
                >
                  {/* Column Day Header */}
                  <div
                    className={`p-3 border-b flex items-center justify-between transition-colors ${
                      day.isToday
                        ? 'bg-gradient-to-r from-emerald-950/70 to-[#1c2230] border-emerald-500/40 text-emerald-300'
                        : 'bg-[#1a1d2c] border-zinc-750 text-zinc-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {day.dayName}
                        </span>
                        {day.isToday && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                        <span>{day.dayNumber} {day.monthShort}</span>
                        {day.isToday && (
                          <span className="text-[10px] font-bold text-emerald-400 ml-1">
                            (Aujourd'hui)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Day card count pill */}
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          day.isToday
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                            : day.cards.length > 0
                            ? 'bg-[#222637] text-zinc-200 border-zinc-700'
                            : 'bg-zinc-850/50 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {day.cards.length}
                      </span>

                      {/* Quick Add button on day */}
                      {onAddNewCardOnDate && (
                        <button
                          type="button"
                          onClick={() => onAddNewCardOnDate(day.dateString)}
                          title={`Planifier un contenu pour le ${day.dayName} ${day.dayNumber} ${day.monthShort}`}
                          className="p-1 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-750/70 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day Content Area (Drop Target & Cards List) */}
                  <div className="p-2.5 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[620px] custom-scrollbar">
                    {day.cards.length === 0 ? (
                      /* Empty state for the day */
                      <div
                        onClick={() => onAddNewCardOnDate && onAddNewCardOnDate(day.dateString)}
                        className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl text-center group/empty cursor-pointer transition-all hover:bg-[#181b28]/60 min-h-[140px]"
                      >
                        <span className="text-[11px] text-zinc-500 group-hover/empty:text-zinc-300 mb-1">
                          Aucune publication
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 group-hover/empty:text-emerald-400 transition-colors">
                          <Plus className="w-3 h-3" />
                          <span>Planifier</span>
                        </span>
                      </div>
                    ) : (
                      day.cards.map((card) => {
                        const stage = STAGES.find((s) => s.id === card.stageId);
                        const isRecent = recentModifiedIds?.has(card.id);

                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', card.id);
                              e.dataTransfer.setData('cardId', card.id);
                            }}
                            onClick={() => onEditCard(card)}
                            title={`${card.title} (${card.client}) - Statut : ${stage?.label}`}
                            className="group/card text-left p-3 rounded-xl bg-[#1e2232] hover:bg-[#252a3d] border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shadow-sm relative select-none flex flex-col gap-2"
                            style={{
                              borderLeftWidth: '3.5px',
                              borderLeftColor: stage?.accentColor || '#10b981',
                            }}
                          >
                            {/* Top row: Client / PA + Platform icons */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded truncate max-w-[90px]">
                                {card.client}
                              </span>

                              <div className="flex items-center gap-1">
                                {card.platforms.map((p) => (
                                  <PlatformBadge
                                    key={p}
                                    platformId={p}
                                    size="sm"
                                    showLabel={false}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Card Title */}
                            <p className="text-xs font-semibold text-zinc-100 group-hover/card:text-white line-clamp-2 leading-snug">
                              {card.title}
                            </p>

                            {/* PIPELINE STATUS (Affiché en évidence comme demandé) */}
                            <div className="pt-1 border-t border-zinc-700/60">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold truncate max-w-full"
                                style={{
                                  backgroundColor: `${stage?.accentColor || '#10b981'}25`,
                                  color: stage?.accentColor || '#10b981',
                                  border: `1px solid ${stage?.accentColor || '#10b981'}50`,
                                }}
                                title={`Statut pipeline : ${stage?.label}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: stage?.accentColor || '#10b981' }}
                                />
                                <span className="truncate">{stage?.shortLabel || stage?.label || 'Sans étape'}</span>
                              </span>
                            </div>

                            {/* Bottom row: Assignee, slide link & recent modification dot */}
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                              {card.assignee ? (
                                <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                  <span className="w-4 h-4 rounded-full bg-[#292d40] border border-zinc-650 text-[9px] font-bold text-zinc-300 flex items-center justify-center shrink-0">
                                    {card.assignee.initials}
                                  </span>
                                  <span className="truncate text-zinc-400 text-[10px]">
                                    {card.assignee.name.split(' ')[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-500">Non assigné</span>
                              )}

                              <div className="flex items-center gap-1.5 shrink-0">
                                {card.slideUrl && (
                                  <a
                                    href={card.slideUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/50 transition-colors"
                                    title="Ouvrir la slide Google Docs"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {isRecent && (
                                  <span
                                    title="Modifié récemment"
                                    className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONTH GRID VIEW (MODE MOIS)                                            */}
      {/* ========================================================================= */}
      {calendarMode === 'grid' && (
        <div className="bg-[#141622] border border-zinc-750 rounded-2xl overflow-hidden shadow-2xl">
          {/* Weekday column headers */}
          <div className="grid grid-cols-7 border-b border-zinc-750 bg-[#1a1d2c] text-center text-xs font-semibold text-zinc-300">
            {WEEKDAYS.map((dayName, idx) => (
              <div key={dayName} className="py-2.5 border-r border-zinc-750 last:border-r-0">
                <span className="hidden sm:inline">{dayName}</span>
                <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
              </div>
            ))}
          </div>

          {/* Calendar Month Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-750 auto-rows-fr">
            {calendarCells.map((cell) => {
              const isOver = dragOverDay === cell.dateString;
              return (
                <div
                  key={cell.dateString}
                  onDragOver={(e) => handleDragOver(e, cell.dateString)}
                  onDragLeave={() => handleDragLeave(cell.dateString)}
                  onDrop={(e) => handleDrop(e, cell.dateString)}
                  className={`min-h-[120px] sm:min-h-[145px] p-2 flex flex-col justify-between transition-colors relative group ${
                    !cell.isCurrentMonth
                      ? 'bg-[#11131b]/60 text-zinc-500'
                      : cell.isToday
                      ? 'bg-emerald-950/25 text-zinc-100'
                      : 'bg-[#181b27] hover:bg-[#1c2030] text-zinc-200'
                  } ${isOver ? 'ring-2 ring-emerald-400 bg-emerald-950/40' : ''}`}
                >
                  {/* Cell Header: Day number + Add content button */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-semibold rounded-lg ${
                        cell.isToday
                          ? 'w-6 h-6 bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/30'
                          : cell.isCurrentMonth
                          ? 'text-zinc-100 font-bold'
                          : 'text-zinc-500'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add button on day hover */}
                    {onAddNewCardOnDate && (
                      <button
                        type="button"
                        onClick={() => onAddNewCardOnDate(cell.dateString)}
                        title={`Créer un contenu pour le ${formatFrenchDate(cell.dateString)}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/60 rounded-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Scheduled cards in this day */}
                  <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[150px] custom-scrollbar pr-0.5">
                    {cell.cards.map((card) => {
                      const stage = STAGES.find((s) => s.id === card.stageId);
                      const isRecent = recentModifiedIds?.has(card.id);

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', card.id);
                            e.dataTransfer.setData('cardId', card.id);
                          }}
                          onClick={() => onEditCard(card)}
                          title={`${card.title} (${card.client}) - Statut : ${stage?.label}`}
                          className="group/card text-left p-1.5 rounded-lg bg-[#222637] hover:bg-[#282d42] border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shadow-sm relative select-none"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: stage?.accentColor || '#10b981',
                          }}
                        >
                          {/* PA & Platform row */}
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[10px] font-semibold text-emerald-400 truncate max-w-[70px]">
                              {card.client}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {card.platforms.map((p) => (
                                <PlatformBadge
                                  key={p}
                                  platformId={p}
                                  size="sm"
                                  showLabel={false}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Title */}
                          <p className="text-[11px] font-medium text-zinc-200 group-hover/card:text-white line-clamp-2 leading-snug">
                            {card.title}
                          </p>

                          {/* Bottom meta: Pipeline Status Badge & Recent dot */}
                          <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-zinc-700/60">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold truncate max-w-[130px]"
                              style={{
                                backgroundColor: `${stage?.accentColor || '#10b981'}25`,
                                color: stage?.accentColor || '#10b981',
                                border: `1px solid ${stage?.accentColor || '#10b981'}50`,
                              }}
                              title={`Statut pipeline : ${stage?.label}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: stage?.accentColor || '#10b981' }}
                              />
                              <span className="truncate">{stage?.shortLabel || stage?.label || 'Sans étape'}</span>
                            </span>

                            {isRecent && (
                              <span
                                title="Modifié récemment"
                                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-auto shrink-0"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AGENDA MODE (PLANNING CHRONOLOGIQUE)                                   */}
      {/* ========================================================================= */}
      {calendarMode === 'agenda' && (
        <div className="bg-[#141622] border border-zinc-750 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-750 bg-[#1a1d2c] flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>Planning chronologique des publications</span>
            </h3>
            <span className="text-xs text-zinc-300 font-medium bg-[#222637] px-2.5 py-1 rounded-lg border border-zinc-700">
              {agendaList.reduce((acc, curr) => acc + curr.items.length, 0)} contenus programmés
            </span>
          </div>

          {agendaList.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-sm">
              Aucun contenu n'a de date de publication définie.
            </div>
          ) : (
            <div className="divide-y divide-zinc-750/80">
              {agendaList.map(({ dateStr, items }) => {
                const dateStatus = getDateStatus(dateStr);
                const fullFrenchDate = formatFrenchDate(dateStr);

                return (
                  <div key={dateStr} className="p-4 hover:bg-[#1a1d2c]/40 transition-colors">
                    {/* Date Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#222637] border border-zinc-700 text-zinc-200">
                          <CalendarIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-100">{fullFrenchDate}</h4>
                          <span className="text-xs text-zinc-400">
                            {items.length} contenu{items.length > 1 ? 's' : ''} prévu{items.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {dateStatus && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border ${dateStatus.badgeClass}`}
                        >
                          {dateStatus.label}
                        </span>
                      )}
                    </div>

                    {/* Cards on this date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 sm:pl-11">
                      {items.map((card) => {
                        const stage = STAGES.find((s) => s.id === card.stageId);
                        const isRecent = recentModifiedIds?.has(card.id);

                        return (
                          <div
                            key={card.id}
                            onClick={() => onEditCard(card)}
                            className="p-3.5 bg-[#222637] hover:bg-[#282d42] border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all cursor-pointer shadow-sm group flex flex-col justify-between gap-2.5"
                            style={{
                              borderLeftWidth: '3px',
                              borderLeftColor: stage?.accentColor || '#10b981',
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                                  {card.client}
                                </span>
                                {/* Statut pipeline visible */}
                                <span
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: `${stage?.accentColor || '#10b981'}25`,
                                    color: stage?.accentColor || '#10b981',
                                    border: `1px solid ${stage?.accentColor || '#10b981'}50`,
                                  }}
                                  title={`Statut pipeline : ${stage?.label}`}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: stage?.accentColor || '#10b981' }}
                                  />
                                  <span>{stage?.label}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {card.platforms.map((p) => (
                                  <PlatformBadge
                                    key={p}
                                    platformId={p}
                                    size="sm"
                                    showLabel={false}
                                  />
                                ))}
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-zinc-100 group-hover:text-white line-clamp-2">
                              {card.title}
                            </p>

                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-700/70 text-zinc-400">
                              <span className="font-medium text-zinc-400">
                                {card.campaign ? `Campagne : ${card.campaign}` : 'Contenu standard'}
                              </span>

                              <div className="flex items-center gap-2">
                                {card.slideUrl && (
                                  <a
                                    href={card.slideUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-zinc-400 hover:text-emerald-400 flex items-center gap-1 text-[10px]"
                                    title="Ouvrir la slide"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Slide</span>
                                  </a>
                                )}
                                {isRecent && (
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
