import React from 'react';
import { PlatformId } from '../types';
import { PLATFORMS } from '../data/constants';
import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook 
} from 'lucide-react';

interface PlatformBadgeProps {
  platformId: PlatformId;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const getPlatformIcon = (id: PlatformId, sizeClass: string) => {
  switch (id) {
    case 'instagram':
      return <Instagram className={sizeClass} />;
    case 'youtube':
      return <Youtube className={sizeClass} />;
    case 'x':
      return <Twitter className={sizeClass} />;
    case 'facebook':
      return <Facebook className={sizeClass} />;
    default:
      return null;
  }
};

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platformId,
  size = 'sm',
  showLabel = true,
}) => {
  const config = PLATFORMS.find((p) => p.id === platformId);
  if (!config) return null;

  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-2.5 py-1.5 gap-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      id={`platform-badge-${platformId}`}
      title={config.name}
      className={`inline-flex items-center font-medium rounded border tracking-tight transition-all duration-150 ${config.badgeBg} ${sizeClasses[size]}`}
    >
      {getPlatformIcon(platformId, iconSizeClasses[size])}
      {showLabel && <span>{config.name}</span>}
    </span>
  );
};
