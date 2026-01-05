import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Bloodletting - Lancet/Fleam icon
export const BloodlettingIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="lancetMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d0d0d0" />
        <stop offset="50%" stopColor="#909090" />
        <stop offset="100%" stopColor="#606060" />
      </linearGradient>
    </defs>
    {/* Handle */}
    <rect x="17" y="18" width="6" height="18" rx="1.5" fill="#6b4423" />
    <rect x="18" y="20" width="4" height="14" rx="1" fill="#8b5a2b" opacity="0.5" />
    {/* Blade */}
    <path d="M 17 18 L 20 4 L 23 18 Z" fill="url(#lancetMetal)" />
    <line x1="20" y1="6" x2="20" y2="16" stroke="#e0e0e0" strokeWidth="0.5" opacity="0.6" />
    {/* Blood drops */}
    <ellipse cx="12" cy="32" rx="3" ry="4" fill="#8b0000" opacity="0.8" />
    <ellipse cx="28" cy="34" rx="2" ry="3" fill="#8b0000" opacity="0.6" />
  </svg>
);

// Cupping - Glass cup with suction mark
export const CuppingIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <radialGradient id="cupGlassIcon" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="rgba(200, 220, 255, 0.7)" />
        <stop offset="100%" stopColor="rgba(120, 150, 200, 0.4)" />
      </radialGradient>
    </defs>
    {/* Cup shape */}
    <path d="M 10 8 Q 8 20 12 32 Q 15 36 20 36 Q 25 36 28 32 Q 32 20 30 8 Z"
      fill="url(#cupGlassIcon)" stroke="rgba(150, 180, 220, 0.6)" strokeWidth="1" />
    {/* Cup rim */}
    <ellipse cx="20" cy="8" rx="10" ry="3" fill="rgba(180, 200, 230, 0.6)" />
    {/* Suction mark */}
    <ellipse cx="20" cy="26" rx="6" ry="5" fill="rgba(139, 0, 0, 0.4)" />
    <ellipse cx="20" cy="26" rx="4" ry="3" fill="rgba(128, 0, 128, 0.3)" />
  </svg>
);

// Lancing - Sharp blade with bubo
export const LancingIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <radialGradient id="buboIcon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8b0000" />
        <stop offset="60%" stopColor="#660066" />
        <stop offset="100%" stopColor="#c9a06a" />
      </radialGradient>
      <linearGradient id="bladeIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0e0e0" />
        <stop offset="100%" stopColor="#808080" />
      </linearGradient>
    </defs>
    {/* Bubo */}
    <ellipse cx="16" cy="24" rx="10" ry="8" fill="url(#buboIcon)" />
    {/* Blade */}
    <path d="M 28 8 L 32 8 L 18 28 L 16 26 Z" fill="url(#bladeIcon)" />
    <rect x="30" y="4" width="6" height="12" rx="1" fill="#5c3d2e" />
    {/* Incision */}
    <line x1="14" y1="24" x2="18" y2="24" stroke="#4a0000" strokeWidth="1.5" />
  </svg>
);

// Cauterization - Heated iron rod
export const CauterizationIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <radialGradient id="ironTipIcon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ff4500" />
        <stop offset="60%" stopColor="#ff6600" />
        <stop offset="100%" stopColor="#cc3300" />
      </radialGradient>
      <filter id="glowIcon">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Iron handle */}
    <rect x="26" y="12" width="6" height="24" rx="1" fill="#3d3d3d" />
    <rect x="24" y="10" width="10" height="4" rx="1" fill="#2d2d2d" />
    {/* Heated tip */}
    <ellipse cx="29" cy="6" rx="5" ry="6" fill="url(#ironTipIcon)" filter="url(#glowIcon)" />
    {/* Heat waves */}
    <path d="M 12 8 Q 14 6 12 4" stroke="#ff9900" strokeWidth="1" fill="none" opacity="0.6" />
    <path d="M 16 10 Q 18 8 16 6" stroke="#ff6600" strokeWidth="1" fill="none" opacity="0.5" />
    {/* Gangrene spot */}
    <ellipse cx="10" cy="30" rx="6" ry="5" fill="#1a1a1a" opacity="0.7" />
  </svg>
);

// Purging - Chalice/cup with liquid
export const PurgingIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="chaliceIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d4a574" />
        <stop offset="50%" stopColor="#b8956e" />
        <stop offset="100%" stopColor="#8b7355" />
      </linearGradient>
    </defs>
    {/* Chalice/cup */}
    <path d="M 12 10 L 10 28 Q 10 34 20 34 Q 30 34 30 28 L 28 10 Z" fill="url(#chaliceIcon)" />
    <ellipse cx="20" cy="10" rx="8" ry="3" fill="#c9a06a" />
    {/* Dark liquid */}
    <ellipse cx="20" cy="13" rx="6" ry="2" fill="#2d1f0f" />
    {/* Steam wisps */}
    <path d="M 16 6 Q 18 4 16 2" stroke="rgba(200,200,200,0.5)" strokeWidth="1" fill="none" />
    <path d="M 20 5 Q 22 3 20 1" stroke="rgba(200,200,200,0.4)" strokeWidth="1" fill="none" />
    <path d="M 24 6 Q 26 4 24 2" stroke="rgba(200,200,200,0.5)" strokeWidth="1" fill="none" />
    {/* Decorative band */}
    <rect x="11" y="18" width="18" height="3" fill="#6b5344" opacity="0.6" />
  </svg>
);

// Theriac - Ornate vessel with glow
export const TheriakIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="goldIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="50%" stopColor="#daa520" />
        <stop offset="100%" stopColor="#b8860b" />
      </linearGradient>
      <radialGradient id="glowInside" cx="50%" cy="30%" r="50%">
        <stop offset="0%" stopColor="#fffacd" />
        <stop offset="100%" stopColor="#daa520" />
      </radialGradient>
      <filter id="theriakGlowIcon">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Vessel body */}
    <path d="M 14 34 Q 10 28 12 18 Q 14 10 20 8 Q 26 10 28 18 Q 30 28 26 34 Z" fill="#5a4030" />
    {/* Gold trim */}
    <ellipse cx="20" cy="34" rx="8" ry="3" fill="url(#goldIcon)" />
    <ellipse cx="20" cy="18" rx="7" ry="2" fill="url(#goldIcon)" opacity="0.8" />
    {/* Neck */}
    <rect x="17" y="4" width="6" height="5" fill="#5a4030" />
    <ellipse cx="20" cy="4" rx="4" ry="1.5" fill="url(#goldIcon)" />
    {/* Lid */}
    <path d="M 16 4 Q 14 0 20 -2 Q 26 0 24 4 Z" fill="url(#goldIcon)" />
    {/* Glow */}
    <ellipse cx="20" cy="12" rx="5" ry="4" fill="url(#glowInside)" filter="url(#theriakGlowIcon)" opacity="0.8" />
    {/* Decorative dots */}
    <circle cx="16" cy="24" r="1.5" fill="url(#goldIcon)" opacity="0.9" />
    <circle cx="24" cy="24" r="1.5" fill="url(#goldIcon)" opacity="0.9" />
  </svg>
);

// Fumigation - Incense brazier with smoke
export const FumigationIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="brazierIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d4a574" />
        <stop offset="100%" stopColor="#8b6914" />
      </linearGradient>
      <linearGradient id="coalIconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff4500" />
        <stop offset="100%" stopColor="#8b0000" />
      </linearGradient>
    </defs>
    {/* Brazier */}
    <path d="M 12 34 L 14 22 Q 15 18 20 16 L 20 16 Q 25 18 26 22 L 28 34 Z" fill="url(#brazierIconGrad)" />
    <ellipse cx="20" cy="34" rx="8" ry="3" fill="#654321" />
    <ellipse cx="20" cy="16" rx="6" ry="3" fill="#c9a06a" />
    {/* Coals */}
    <ellipse cx="20" cy="15" rx="4" ry="2" fill="url(#coalIconGrad)" />
    {/* Smoke wisps */}
    <path d="M 18 12 Q 16 8 18 4" stroke="rgba(150, 140, 130, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M 22 10 Q 24 6 22 2" stroke="rgba(140, 130, 120, 0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M 20 11 Q 19 7 21 3" stroke="rgba(160, 150, 140, 0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

// Leeches - Medicinal leech on skin
export const LeechIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="leechIconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4a3728" />
        <stop offset="50%" stopColor="#3d2d22" />
        <stop offset="100%" stopColor="#2d1f1a" />
      </linearGradient>
      <linearGradient id="leechFedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b2222" />
        <stop offset="100%" stopColor="#4a1a1a" />
      </linearGradient>
      <radialGradient id="biteMarkIcon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8b0000" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    {/* Skin background */}
    <ellipse cx="20" cy="24" rx="16" ry="12" fill="#c9a06a" />
    {/* Bite marks */}
    <ellipse cx="14" cy="22" rx="2" ry="1.5" fill="url(#biteMarkIcon)" />
    <ellipse cx="26" cy="24" rx="2" ry="1.5" fill="url(#biteMarkIcon)" />
    {/* Leech 1 - feeding */}
    <ellipse cx="14" cy="16" rx="3" ry="7" fill="url(#leechFedGrad)" />
    <ellipse cx="14" cy="11" rx="2" ry="3" fill="#2d1f1a" />
    <ellipse cx="14" cy="22" rx="2.5" ry="2" fill="#4a3728" />
    {/* Leech 2 - fresh */}
    <ellipse cx="26" cy="18" rx="2.5" ry="6" fill="url(#leechIconGrad)" />
    <ellipse cx="26" cy="13" rx="1.5" ry="2.5" fill="#2d1f1a" />
    <ellipse cx="26" cy="23" rx="2" ry="1.5" fill="#4a3728" />
    {/* Segments on leeches */}
    <line x1="11" y1="14" x2="17" y2="14" stroke="#1a1210" strokeWidth="0.5" opacity="0.4" />
    <line x1="11" y1="17" x2="17" y2="17" stroke="#1a1210" strokeWidth="0.5" opacity="0.4" />
  </svg>
);

// Poultice - Herbal mixture on wound
export const PoulticeIcon: React.FC<IconProps> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="poulticeIconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#c9a06a" />
        <stop offset="50%" stopColor="#a08050" />
        <stop offset="100%" stopColor="#6b5030" />
      </linearGradient>
      <radialGradient id="warmthIcon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(255, 150, 50, 0.4)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
      <radialGradient id="buboIcon2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8b0000" />
        <stop offset="60%" stopColor="#660066" />
        <stop offset="100%" stopColor="#c9a06a" />
      </radialGradient>
    </defs>
    {/* Skin/body area */}
    <ellipse cx="20" cy="22" rx="16" ry="14" fill="#c9a06a" />
    {/* Bubo underneath */}
    <ellipse cx="20" cy="20" rx="8" ry="6" fill="url(#buboIcon2)" />
    {/* Warmth radiating */}
    <ellipse cx="20" cy="20" rx="12" ry="9" fill="url(#warmthIcon)" />
    {/* Poultice */}
    <ellipse cx="20" cy="18" rx="7" ry="5" fill="url(#poulticeIconGrad)" />
    {/* Herb pieces visible in poultice */}
    <ellipse cx="17" cy="17" rx="1.5" ry="1" fill="#556b2f" opacity="0.7" />
    <ellipse cx="22" cy="19" rx="1" ry="0.8" fill="#6b8e23" opacity="0.6" />
    <circle cx="19" cy="18" r="0.8" fill="#8b4513" opacity="0.5" />
    {/* Steam wisps */}
    <path d="M 18 12 Q 17 9 18 6" stroke="rgba(200, 200, 200, 0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M 22 11 Q 23 8 22 5" stroke="rgba(180, 180, 180, 0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* Cloth bandage edges */}
    <path d="M 10 15 Q 9 20 11 25" stroke="#f5f5dc" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M 30 15 Q 31 20 29 25" stroke="#f5f5dc" strokeWidth="2" fill="none" opacity="0.6" />
  </svg>
);

// Icon selector by treatment ID
export const TreatmentIcon: React.FC<IconProps & { treatmentId: string }> = ({
  treatmentId,
  className = '',
  size = 40
}) => {
  switch (treatmentId) {
    case 'bloodletting':
      return <BloodlettingIcon className={className} size={size} />;
    case 'cupping':
      return <CuppingIcon className={className} size={size} />;
    case 'lancing':
      return <LancingIcon className={className} size={size} />;
    case 'cauterization':
      return <CauterizationIcon className={className} size={size} />;
    case 'purging':
      return <PurgingIcon className={className} size={size} />;
    case 'theriac_admin':
      return <TheriakIcon className={className} size={size} />;
    case 'fumigation':
      return <FumigationIcon className={className} size={size} />;
    case 'leeches':
      return <LeechIcon className={className} size={size} />;
    case 'poultice':
      return <PoulticeIcon className={className} size={size} />;
    default:
      return <BloodlettingIcon className={className} size={size} />;
  }
};

export default TreatmentIcon;
