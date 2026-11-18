export function formatFrenchDate(dateString?: string): string {
  if (!dateString) return '';
  if (dateString.trim().toUpperCase() === 'ASAP') return 'ASAP';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getDateStatus(dateString?: string): {
  label: string;
  badgeClass: string;
  isPast: boolean;
  isToday: boolean;
} | null {
  if (!dateString) return null;

  if (dateString.trim().toUpperCase() === 'ASAP') {
    return {
      label: 'ASAP',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold animate-pulse',
      isPast: false,
      isToday: false,
    };
  }

  try {
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return null;

    const now = new Date();
    // Normalize to date start
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return {
        label: daysAgo === 1 ? 'Hier' : `Passé (${daysAgo}j)`,
        badgeClass: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
        isPast: true,
        isToday: false,
      };
    } else if (diffDays === 0) {
      return {
        label: "Aujourd'hui",
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold animate-pulse',
        isPast: false,
        isToday: true,
      };
    } else if (diffDays === 1) {
      return {
        label: 'Demain',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold',
        isPast: false,
        isToday: false,
      };
    } else if (diffDays <= 7) {
      return {
        label: `Dans ${diffDays}j`,
        badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        isPast: false,
        isToday: false,
      };
    } else {
      return {
        label: formatFrenchDate(dateString),
        badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
        isPast: false,
        isToday: false,
      };
    }
  } catch {
    return null;
  }
}

export function getRecentlyModifiedInfo(
  updatedAtString?: string,
  sessionModified?: boolean
): {
  isRecent: boolean;
  label: string;
  sublabel: string;
} | null {
  if (sessionModified) {
    return {
      isRecent: true,
      label: "Modifié à l'instant",
      sublabel: 'En direct',
    };
  }
  if (!updatedAtString) return null;
  try {
    const updated = new Date(updatedAtString).getTime();
    if (isNaN(updated)) return null;
    const now = Date.now();
    const diffMs = now - updated;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));

    if (diffMinutes < 0) return null;
    if (diffMinutes <= 3) {
      return { isRecent: true, label: "Modifié à l'instant", sublabel: 'Nouveau' };
    }
    if (diffMinutes <= 15) {
      return { isRecent: true, label: `Modifié il y a ${diffMinutes} min`, sublabel: `${diffMinutes}m` };
    }
    if (diffMinutes <= 60) {
      return { isRecent: true, label: `Modifié récemment`, sublabel: `${diffMinutes}m` };
    }
    return null;
  } catch {
    return null;
  }
}
