import React from 'react';

interface TreatmentAnimationProps {
  treatmentId: string;
  skinTone: string;
  buboLocation?: 'groin' | 'armpit' | 'neck' | 'none';
  isActivating?: boolean;
  onActivationComplete?: () => void;
}

// Helper to parse HSL and create variations
const parseHSL = (hsl: string): { h: number; s: number; l: number } => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
  }
  // Default warm skin tone if parsing fails
  return { h: 28, s: 35, l: 55 };
};

const getSkinShadow = (skinTone: string): string => {
  const { h, s, l } = parseHSL(skinTone);
  return `hsl(${h}, ${s}%, ${Math.max(20, l - 15)}%)`;
};

const getSkinHighlight = (skinTone: string): string => {
  const { h, s, l } = parseHSL(skinTone);
  return `hsl(${h}, ${Math.max(15, s - 5)}%, ${Math.min(85, l + 10)}%)`;
};

// ============================================
// BLOODLETTING ANIMATION
// ============================================
export const BloodlettingAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="armGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="50%" stopColor={skinTone} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
        <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c0c0c0" />
          <stop offset="50%" stopColor="#808080" />
          <stop offset="100%" stopColor="#606060" />
        </linearGradient>
        <linearGradient id="bloodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b0000" />
          <stop offset="100%" stopColor="#4a0000" />
        </linearGradient>
        <filter id="bloodGlow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Activation glow filter */}
        <filter id="activationGlowBlood">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feFlood floodColor="#8b0000" floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="healingAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139, 0, 0, 0.4)" />
          <stop offset="50%" stopColor="rgba(139, 0, 0, 0.2)" />
          <stop offset="100%" stopColor="rgba(139, 0, 0, 0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes lancetMove {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-5px, 3px); }
          50% { transform: translate(-8px, 5px); }
          75% { transform: translate(-5px, 3px); }
        }
        @keyframes lancetActivate {
          0% { transform: translate(0, 0); }
          15% { transform: translate(-12px, 8px); }
          30% { transform: translate(-8px, 5px); }
          100% { transform: translate(20px, -30px); opacity: 0.5; }
        }
        @keyframes bloodDrip1 {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(45px); opacity: 0; }
        }
        @keyframes bloodDrip2 {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @keyframes bloodDrip3 {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(35px); opacity: 0; }
        }
        @keyframes bloodDripFast {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(50px); opacity: 0; }
        }
        @keyframes bloodPool {
          0%, 30% { opacity: 0; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }
        @keyframes bloodPoolFill {
          0% { opacity: 0; rx: 5; }
          50% { opacity: 1; rx: 15; }
          100% { opacity: 1; rx: 22; }
        }
        @keyframes activationPulse {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes successGlow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(139, 0, 0, 0.5)); }
          50% { filter: drop-shadow(0 0 20px rgba(139, 0, 0, 0.8)); }
        }
        .lancet { animation: lancetMove 4s ease-in-out infinite; }
        .lancet-activating { animation: lancetActivate 2s ease-out forwards; }
        .blood-drop-1 { animation: bloodDrip1 2.5s ease-in infinite; }
        .blood-drop-2 { animation: bloodDrip2 2.5s ease-in infinite 0.3s; }
        .blood-drop-3 { animation: bloodDrip3 2.5s ease-in infinite 0.6s; }
        .blood-drop-fast { animation: bloodDripFast 0.8s ease-in infinite; }
        .blood-pool { animation: bloodPool 4s ease-out infinite; }
        .blood-pool-fill { animation: bloodPoolFill 2s ease-out forwards; }
        .activation-pulse { animation: activationPulse 1.5s ease-out infinite; }
        .success-glow { animation: successGlow 1s ease-in-out infinite; }
      `}</style>

      {/* Activation aura */}
      {isActivating && (
        <ellipse className="activation-pulse" cx="85" cy="80" rx="50" ry="40" fill="url(#healingAura)" style={{ transformOrigin: '85px 80px' }} />
      )}

      {/* Anatomical forearm - tapered shape */}
      <path
        d={`
          M 20 58
          C 40 48, 80 45, 120 50
          Q 150 54, 162 60
          L 165 70
          Q 162 80, 150 84
          Q 110 90, 60 88
          C 35 86, 20 78, 20 68
          Z
        `}
        fill="url(#armGradient)"
        className={isActivating ? 'success-glow' : ''}
      />

      {/* Inner forearm muscle shadow */}
      <path
        d="M 35 72 Q 70 68, 110 70 Q 140 72, 155 74"
        stroke={shadow}
        strokeWidth="6"
        fill="none"
        opacity="0.12"
        strokeLinecap="round"
      />

      {/* Radius bone highlight */}
      <path
        d="M 30 56 Q 80 50, 140 55"
        stroke={highlight}
        strokeWidth="4"
        fill="none"
        opacity="0.2"
        strokeLinecap="round"
      />

      {/* Wrist - narrowed transition */}
      <ellipse cx="162" cy="70" rx="8" ry="14" fill={skinTone} />
      <ellipse cx="162" cy="70" rx="6" ry="12" fill={highlight} opacity="0.15" />

      {/* Hand - palm and fingers */}
      <g>
        {/* Palm */}
        <path
          d={`
            M 168 58
            Q 178 56, 184 62
            L 188 72
            Q 190 82, 186 90
            Q 180 96, 172 94
            L 168 82
            Q 165 70, 168 58
          `}
          fill={skinTone}
        />
        {/* Palm shadow */}
        <ellipse cx="178" cy="76" rx="6" ry="10" fill={shadow} opacity="0.1" />

        {/* Thumb */}
        <path
          d="M 168 62 Q 162 56, 158 62 Q 160 70, 168 68"
          fill={skinTone}
        />

        {/* Fingers - as a grouped shape */}
        <path
          d={`
            M 184 64 Q 192 62, 195 70 Q 194 76, 188 74
            M 186 72 Q 196 72, 198 80 Q 196 88, 188 84
            M 186 82 Q 194 84, 195 92 Q 192 98, 186 94
            M 183 90 Q 188 94, 187 100 Q 182 104, 180 98
          `}
          fill={skinTone}
          stroke={skinTone}
          strokeWidth="1"
        />

        {/* Knuckle hints */}
        <circle cx="186" cy="72" r="1.5" fill={shadow} opacity="0.2" />
        <circle cx="188" cy="80" r="1.5" fill={shadow} opacity="0.2" />
        <circle cx="187" cy="88" r="1.5" fill={shadow} opacity="0.15" />
      </g>

      {/* Wrist tendons */}
      <g opacity="0.12">
        <line x1="158" y1="62" x2="170" y2="60" stroke={shadow} strokeWidth="1" />
        <line x1="159" y1="68" x2="172" y2="68" stroke={shadow} strokeWidth="1" />
        <line x1="158" y1="74" x2="170" y2="78" stroke={shadow} strokeWidth="1" />
      </g>

      {/* Veins - anatomically positioned */}
      {/* Cephalic vein (thumb side, superficial) */}
      <path
        d="M 30 54 Q 70 50, 100 52 Q 130 55, 155 60"
        stroke="rgba(90, 70, 130, 0.25)"
        strokeWidth="2"
        fill="none"
      />
      {/* Median cubital vein (elbow crease - main bloodletting target) */}
      <path
        d="M 45 68 Q 60 64, 85 66 Q 95 68, 100 70"
        stroke="rgba(100, 80, 140, 0.4)"
        strokeWidth="3.5"
        fill="none"
      />
      {/* Basilic vein (pinky side) */}
      <path
        d="M 40 80 Q 70 82, 100 80 Q 130 78, 150 76"
        stroke="rgba(90, 70, 130, 0.2)"
        strokeWidth="2"
        fill="none"
      />

      {/* Incision point - larger when activating */}
      <ellipse cx="85" cy="68" rx={isActivating ? 6 : 4} ry={isActivating ? 3 : 2} fill="#8b0000"
        filter={isActivating ? "url(#activationGlowBlood)" : undefined} />

      {/* Lancet tool */}
      <g className={isActivating ? "lancet-activating" : "lancet"}>
        <rect x="60" y="45" width="8" height="25" rx="2" fill="#8B4513" />
        <path d="M 62 45 L 66 35 L 70 45 Z" fill="url(#metalGradient)" />
      </g>

      {/* Blood drops - more and faster when activating */}
      <g filter="url(#bloodGlow)">
        {isActivating ? (
          <>
            <ellipse className="blood-drop-fast" cx="83" cy="75" rx="4" ry="5" fill="url(#bloodGradient)" style={{ animationDelay: '0s' }} />
            <ellipse className="blood-drop-fast" cx="86" cy="75" rx="3.5" ry="4.5" fill="url(#bloodGradient)" style={{ animationDelay: '0.15s' }} />
            <ellipse className="blood-drop-fast" cx="89" cy="75" rx="3" ry="4" fill="url(#bloodGradient)" style={{ animationDelay: '0.3s' }} />
            <ellipse className="blood-drop-fast" cx="84" cy="75" rx="3" ry="4" fill="url(#bloodGradient)" style={{ animationDelay: '0.45s' }} />
            <ellipse className="blood-drop-fast" cx="87" cy="75" rx="2.5" ry="3.5" fill="url(#bloodGradient)" style={{ animationDelay: '0.6s' }} />
          </>
        ) : (
          <>
            <ellipse className="blood-drop-1" cx="85" cy="85" rx="3" ry="4" fill="url(#bloodGradient)" />
            <ellipse className="blood-drop-2" cx="88" cy="85" rx="2.5" ry="3.5" fill="url(#bloodGradient)" />
            <ellipse className="blood-drop-3" cx="82" cy="85" rx="2" ry="3" fill="url(#bloodGradient)" />
          </>
        )}
      </g>

      {/* Collection basin */}
      <ellipse cx="85" cy="145" rx="30" ry="8" fill="#654321" />
      <ellipse cx="85" cy="142" rx="26" ry="6" fill="#4a3520" />

      {/* Blood in basin - fills up when activating */}
      <ellipse className={isActivating ? "blood-pool-fill" : "blood-pool"} cx="85" cy="141" rx="22" ry="4" fill="#6b0000" opacity={isActivating ? 1 : 0} />
    </svg>
  );
};

// ============================================
// CUPPING ANIMATION
// ============================================
export const CuppingAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="backGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="40%" stopColor={skinTone} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
        <radialGradient id="cupGlass" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(200, 220, 255, 0.6)" />
          <stop offset="70%" stopColor="rgba(150, 180, 220, 0.4)" />
          <stop offset="100%" stopColor="rgba(100, 130, 180, 0.3)" />
        </radialGradient>
        <radialGradient id="cupGlassActive" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(220, 240, 255, 0.8)" />
          <stop offset="70%" stopColor="rgba(180, 200, 240, 0.6)" />
          <stop offset="100%" stopColor="rgba(140, 170, 220, 0.5)" />
        </radialGradient>
        <radialGradient id="bruiseMark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139, 0, 0, 0.6)" />
          <stop offset="60%" stopColor="rgba(128, 0, 128, 0.4)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="bruiseMarkActive" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139, 0, 0, 0.9)" />
          <stop offset="60%" stopColor="rgba(128, 0, 128, 0.7)" />
          <stop offset="100%" stopColor="rgba(100, 0, 100, 0.2)" />
        </radialGradient>
        <radialGradient id="suctionAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(128, 0, 128, 0.4)" />
          <stop offset="50%" stopColor="rgba(139, 0, 0, 0.2)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="cupGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="activeCupGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#8080ff" floodOpacity="0.4" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes cupPlace {
          0%, 20% { transform: translateY(-20px); opacity: 0.5; }
          40%, 100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes cupSeal {
          0% { transform: translateY(-30px); opacity: 0; }
          50% { transform: translateY(-5px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes skinRise {
          0%, 40% { transform: scaleY(1); }
          60%, 100% { transform: scaleY(1.15); }
        }
        @keyframes skinRiseActive {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(1.35); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.9; }
          25% { transform: scaleY(1.2) translateY(-2px); opacity: 1; }
          50% { transform: scaleY(0.9) translateY(1px); opacity: 0.8; }
          75% { transform: scaleY(1.1) translateY(-1px); opacity: 1; }
        }
        @keyframes flameExtinguish {
          0% { opacity: 0.9; transform: scaleY(1); }
          50% { opacity: 0.5; transform: scaleY(0.5); }
          100% { opacity: 0; transform: scaleY(0); }
        }
        @keyframes bruiseAppear {
          0%, 60% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes bruiseDeepen {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes suctionPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes cupVibrate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(0.5deg); }
          75% { transform: rotate(-0.5deg); }
        }
        .cup-1 { animation: cupPlace 5s ease-out infinite; }
        .cup-2 { animation: cupPlace 5s ease-out infinite 0.5s; }
        .cup-3 { animation: cupPlace 5s ease-out infinite 1s; }
        .cup-active-1 { animation: cupSeal 0.8s ease-out forwards, cupVibrate 0.3s ease-in-out infinite 0.8s; }
        .cup-active-2 { animation: cupSeal 0.8s ease-out forwards 0.3s, cupVibrate 0.3s ease-in-out infinite 1.1s; }
        .cup-active-3 { animation: cupSeal 0.8s ease-out forwards 0.6s, cupVibrate 0.3s ease-in-out infinite 1.4s; }
        .skin-rise { animation: skinRise 5s ease-in-out infinite; transform-origin: center bottom; }
        .skin-rise-active { animation: skinRiseActive 1.5s ease-out forwards; transform-origin: center bottom; }
        .flame { animation: flameFlicker 0.4s ease-in-out infinite; }
        .flame-out { animation: flameExtinguish 0.5s ease-out forwards; }
        .bruise { animation: bruiseAppear 5s ease-out infinite; }
        .bruise-active { animation: bruiseDeepen 1.5s ease-out forwards; }
        .suction-pulse { animation: suctionPulse 1s ease-in-out infinite; transform-origin: center; }
      `}</style>

      {/* Suction aura when activating */}
      {isActivating && (
        <>
          <ellipse className="suction-pulse" cx="65" cy="75" rx="20" ry="18" fill="url(#suctionAura)" style={{ transformOrigin: '65px 75px' }} />
          <ellipse className="suction-pulse" cx="100" cy="90" rx="20" ry="18" fill="url(#suctionAura)" style={{ transformOrigin: '100px 90px', animationDelay: '0.3s' }} />
          <ellipse className="suction-pulse" cx="135" cy="75" rx="20" ry="18" fill="url(#suctionAura)" style={{ transformOrigin: '135px 75px', animationDelay: '0.6s' }} />
        </>
      )}

      {/* Back/torso shape */}
      <path
        d="M 30 140 Q 30 40 60 25 Q 100 10 140 25 Q 170 40 170 140 Z"
        fill="url(#backGradient)"
      />

      {/* Spine suggestion */}
      <path
        d="M 100 30 Q 100 80 100 130"
        stroke={shadow}
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />

      {/* Shoulder blade hints */}
      <ellipse cx="70" cy="55" rx="20" ry="15" fill={shadow} opacity="0.15" />
      <ellipse cx="130" cy="55" rx="20" ry="15" fill={shadow} opacity="0.15" />

      {/* Cup 1 */}
      <g className={isActivating ? "cup-active-1" : "cup-1"}>
        <ellipse className={isActivating ? "bruise-active" : "bruise"} cx="65" cy="75" rx="12" ry="10"
          fill={isActivating ? "url(#bruiseMarkActive)" : "url(#bruiseMark)"} />
        <g className={isActivating ? "skin-rise-active" : "skin-rise"}>
          <ellipse cx="65" cy="75" rx="10" ry="8" fill={skinTone} />
        </g>
        <path d="M 50 65 Q 48 50 55 45 L 75 45 Q 82 50 80 65 Q 80 80 65 82 Q 50 80 50 65 Z"
          fill={isActivating ? "url(#cupGlassActive)" : "url(#cupGlass)"}
          filter={isActivating ? "url(#activeCupGlow)" : "url(#cupGlow)"} />
        <ellipse cx="65" cy="45" rx="10" ry="3" fill="rgba(180, 200, 240, 0.5)" />
      </g>

      {/* Cup 2 */}
      <g className={isActivating ? "cup-active-2" : "cup-2"}>
        <ellipse className={isActivating ? "bruise-active" : "bruise"} cx="100" cy="90" rx="12" ry="10"
          fill={isActivating ? "url(#bruiseMarkActive)" : "url(#bruiseMark)"} style={{ animationDelay: '0.3s' }} />
        <g className={isActivating ? "skin-rise-active" : "skin-rise"} style={{ animationDelay: '0.3s' }}>
          <ellipse cx="100" cy="90" rx="10" ry="8" fill={skinTone} />
        </g>
        <path d="M 85 80 Q 83 65 90 60 L 110 60 Q 117 65 115 80 Q 115 95 100 97 Q 85 95 85 80 Z"
          fill={isActivating ? "url(#cupGlassActive)" : "url(#cupGlass)"}
          filter={isActivating ? "url(#activeCupGlow)" : "url(#cupGlow)"} />
        <ellipse cx="100" cy="60" rx="10" ry="3" fill="rgba(180, 200, 240, 0.5)" />
      </g>

      {/* Cup 3 */}
      <g className={isActivating ? "cup-active-3" : "cup-3"}>
        <ellipse className={isActivating ? "bruise-active" : "bruise"} cx="135" cy="75" rx="12" ry="10"
          fill={isActivating ? "url(#bruiseMarkActive)" : "url(#bruiseMark)"} style={{ animationDelay: '0.6s' }} />
        <g className={isActivating ? "skin-rise-active" : "skin-rise"} style={{ animationDelay: '0.6s' }}>
          <ellipse cx="135" cy="75" rx="10" ry="8" fill={skinTone} />
        </g>
        <path d="M 120 65 Q 118 50 125 45 L 145 45 Q 152 50 150 65 Q 150 80 135 82 Q 120 80 120 65 Z"
          fill={isActivating ? "url(#cupGlassActive)" : "url(#cupGlass)"}
          filter={isActivating ? "url(#activeCupGlow)" : "url(#cupGlow)"} />
        <ellipse cx="135" cy="45" rx="10" ry="3" fill="rgba(180, 200, 240, 0.5)" />
      </g>

      {/* Flame (for heating cups) - extinguishes when activating */}
      <g className={isActivating ? "flame-out" : "flame"} style={{ transformOrigin: '25px 130px' }}>
        <ellipse cx="25" cy="125" rx="6" ry="10" fill="#ff6600" opacity="0.8" />
        <ellipse cx="25" cy="120" rx="4" ry="7" fill="#ffcc00" opacity="0.9" />
        <ellipse cx="25" cy="117" rx="2" ry="4" fill="#fff8dc" />
      </g>
    </svg>
  );
};

// ============================================
// LANCING (BUBO) ANIMATION
// ============================================
export const LancingAnimation: React.FC<{ skinTone: string; location?: string; isActivating?: boolean }> = ({ skinTone, location = 'groin', isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <radialGradient id="buboGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b0000" />
          <stop offset="40%" stopColor="#660066" />
          <stop offset="80%" stopColor={shadow} />
          <stop offset="100%" stopColor={skinTone} />
        </radialGradient>
        <linearGradient id="bladeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0e0e0" />
          <stop offset="50%" stopColor="#a0a0a0" />
          <stop offset="100%" stopColor="#707070" />
        </linearGradient>
        <filter id="pusGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="lancingHealingAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
          <stop offset="50%" stopColor="rgba(16, 185, 129, 0.2)" />
          <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes buboPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes bladeApproach {
          0%, 30% { transform: translate(30px, -20px) rotate(-30deg); opacity: 0.7; }
          50%, 70% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(30px, -20px) rotate(-30deg); opacity: 0.7; }
        }
        @keyframes bladeStrike {
          0% { transform: translate(30px, -20px) rotate(-30deg); }
          30% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-5px, 5px) rotate(5deg); }
          100% { transform: translate(40px, -40px) rotate(-45deg); opacity: 0.3; }
        }
        @keyframes drainageFlow {
          0%, 50% { opacity: 0; transform: translateY(0); }
          60% { opacity: 1; }
          100% { opacity: 0.3; transform: translateY(30px); }
        }
        @keyframes drainageGush {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          20% { opacity: 1; transform: translateY(5px) scale(1); }
          100% { opacity: 0.3; transform: translateY(50px) scale(1.5); }
        }
        @keyframes buboShrink {
          0%, 70% { transform: scale(1); }
          100% { transform: scale(0.85); }
        }
        @keyframes buboDeflate {
          0% { transform: scale(1); }
          30% { transform: scale(1.1); }
          100% { transform: scale(0.6); }
        }
        @keyframes reliefGlow {
          0% { opacity: 0; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        .bubo { animation: buboPulse 2s ease-in-out infinite, buboShrink 4s ease-out infinite; transform-origin: center; }
        .bubo-active { animation: buboDeflate 2s ease-out forwards; transform-origin: center; }
        .blade { animation: bladeApproach 4s ease-in-out infinite; transform-origin: right center; }
        .blade-active { animation: bladeStrike 1.5s ease-out forwards; transform-origin: right center; }
        .drainage { animation: drainageFlow 4s ease-out infinite; }
        .drainage-active { animation: drainageGush 1.5s ease-out infinite; }
        .relief-glow { animation: reliefGlow 2s ease-out forwards; }
      `}</style>

      {/* Relief glow when activating */}
      {isActivating && (
        <ellipse className="relief-glow" cx="100" cy="85" rx="45" ry="35" fill="url(#lancingHealingAura)" style={{ transformOrigin: '100px 85px' }} />
      )}

      {/* Body area - thigh/groin region */}
      <ellipse cx="100" cy="100" rx="80" ry="50" fill={skinTone} />
      <ellipse cx="100" cy="100" rx="70" ry="40" fill={highlight} opacity="0.3" />

      {/* Leg crease suggestion */}
      <path d="M 30 80 Q 60 100 100 105 Q 140 100 170 80" stroke={shadow} strokeWidth="2" fill="none" opacity="0.3" />

      {/* Bubo (swollen lymph node) */}
      <g className={isActivating ? "bubo-active" : "bubo"}>
        <ellipse cx="100" cy="85" rx="25" ry="20" fill="url(#buboGradient)" />
        <ellipse cx="95" cy="80" rx="8" ry="6" fill="rgba(139, 0, 0, 0.5)" />
      </g>

      {/* Blade */}
      <g className={isActivating ? "blade-active" : "blade"}>
        <rect x="125" y="70" width="6" height="20" rx="1" fill="#5c3d2e" />
        <path d="M 127 70 L 130 55 L 133 70 Z" fill="url(#bladeGradient)" />
        <line x1="130" y1="60" x2="130" y2="68" stroke="#d0d0d0" strokeWidth="0.5" />
      </g>

      {/* Incision line - larger when active */}
      <line x1={isActivating ? 92 : 95} y1="85" x2={isActivating ? 108 : 105} y2="85"
        stroke="#4a0000" strokeWidth={isActivating ? 3 : 2} opacity="0.8" />

      {/* Drainage - more intense when activating */}
      <g className={isActivating ? "drainage-active" : "drainage"} filter="url(#pusGlow)">
        <ellipse cx="100" cy="95" rx={isActivating ? 6 : 4} ry={isActivating ? 8 : 6} fill="#8b6914" opacity="0.7" />
        <ellipse cx="97" cy="100" rx={isActivating ? 5 : 3} ry={isActivating ? 7 : 5} fill="#7a5c12" opacity="0.6" />
        <ellipse cx="103" cy="98" rx={isActivating ? 4 : 2.5} ry={isActivating ? 6 : 4} fill="#8b6914" opacity="0.5" />
        {isActivating && (
          <>
            <ellipse cx="95" cy="105" rx="3" ry="5" fill="#7a5c12" opacity="0.4" style={{ animationDelay: '0.2s' }} />
            <ellipse cx="105" cy="103" rx="2.5" ry="4" fill="#8b6914" opacity="0.4" style={{ animationDelay: '0.4s' }} />
          </>
        )}
      </g>

      {/* Label */}
      <text x="100" y="150" textAnchor="middle" fill="rgba(245, 158, 11, 0.6)" fontSize="10" fontFamily="serif">
        {location === 'groin' ? 'Inguinal bubo' : location === 'armpit' ? 'Axillary bubo' : 'Cervical bubo'}
      </text>
    </svg>
  );
};

// ============================================
// CAUTERIZATION ANIMATION
// ============================================
export const CauterizationAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="legGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={shadow} />
          <stop offset="50%" stopColor={skinTone} />
          <stop offset="100%" stopColor={highlight} />
        </linearGradient>
        <linearGradient id="ironGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3d3d3d" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
        <radialGradient id="ironTip" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff4500" />
          <stop offset="50%" stopColor="#ff6600" />
          <stop offset="100%" stopColor="#cc3300" />
        </radialGradient>
        <radialGradient id="gangrene" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="60%" stopColor="#2d2d2d" />
          <stop offset="100%" stopColor={shadow} />
        </radialGradient>
        <filter id="heatGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="smokeBlur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <style>{`
        @keyframes ironGlow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 8px #ff6600); }
          50% { filter: brightness(1.3) drop-shadow(0 0 15px #ff9900); }
        }
        @keyframes ironGlowIntense {
          0%, 100% { filter: brightness(1.2) drop-shadow(0 0 15px #ff6600); }
          50% { filter: brightness(1.6) drop-shadow(0 0 30px #ffcc00); }
        }
        @keyframes ironApproach {
          0%, 20% { transform: translate(40px, -30px); }
          40%, 80% { transform: translate(0, 0); }
          100% { transform: translate(40px, -30px); }
        }
        @keyframes ironBrand {
          0% { transform: translate(40px, -30px); }
          25% { transform: translate(0, 0); }
          50% { transform: translate(-5px, 5px); }
          75% { transform: translate(0, 0); }
          100% { transform: translate(50px, -40px); opacity: 0.5; }
        }
        @keyframes smokeRise {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          20% { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(-40px) scale(1.5); }
        }
        @keyframes smokeBillowActive {
          0% { opacity: 0; transform: translateY(0) scale(0.8); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-60px) scale(2.5); }
        }
        @keyframes sizzle {
          0%, 30%, 100% { opacity: 0; }
          40%, 80% { opacity: 1; }
        }
        @keyframes sizzleIntense {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes tissueHeal {
          0% { fill: #1a1a1a; }
          50% { fill: #4a3520; }
          100% { fill: #5a4530; }
        }
        .iron { animation: ironApproach 4s ease-in-out infinite; }
        .iron-active { animation: ironBrand 2s ease-out forwards; }
        .iron-tip { animation: ironGlow 1s ease-in-out infinite; }
        .iron-tip-active { animation: ironGlowIntense 0.5s ease-in-out infinite; }
        .smoke-1 { animation: smokeRise 3s ease-out infinite 0.5s; }
        .smoke-2 { animation: smokeRise 3s ease-out infinite 1s; }
        .smoke-3 { animation: smokeRise 3s ease-out infinite 1.5s; }
        .smoke-active { animation: smokeBillowActive 1.5s ease-out infinite; }
        .sizzle { animation: sizzle 4s ease-in-out infinite; }
        .sizzle-active { animation: sizzleIntense 0.3s ease-in-out infinite; }
        .tissue-heal { animation: tissueHeal 2s ease-out forwards; }
      `}</style>

      {/* Foot/lower leg */}
      <path
        d="M 40 60 Q 35 80 40 100 L 50 130 Q 60 145 90 145 L 110 145 Q 130 145 135 135 L 140 100 Q 145 80 140 60 Z"
        fill="url(#legGradient)"
      />

      {/* Toes suggestion */}
      <ellipse cx="100" cy="148" rx="25" ry="8" fill={skinTone} />

      {/* Gangrenous tissue - heals when activating */}
      <ellipse cx="80" cy="100" rx="20" ry="15" fill="url(#gangrene)" className={isActivating ? "tissue-heal" : ""} />
      <ellipse cx="75" cy="95" rx="8" ry="6" fill={isActivating ? "#3a2a20" : "#0d0d0d"} />

      {/* Cauterizing iron */}
      <g className={isActivating ? "iron-active" : "iron"}>
        <rect x="130" y="75" width="8" height="50" fill="url(#ironGradient)" rx="2" />
        <rect x="125" y="68" width="18" height="10" fill="#2d2d2d" rx="2" />
        <ellipse className={isActivating ? "iron-tip-active" : "iron-tip"} cx="134" cy="60" rx="8" ry="12" fill="url(#ironTip)" filter="url(#heatGlow)" />
      </g>

      {/* Sizzle effect at contact point - intense when activating */}
      <g className={isActivating ? "sizzle-active" : "sizzle"} style={{ transformOrigin: '80px 95px' }}>
        <circle cx="80" cy="95" r={isActivating ? 16 : 12} fill="none" stroke="#ff9900" strokeWidth={isActivating ? 3 : 2} opacity={isActivating ? 0.9 : 0.6} />
        <circle cx="80" cy="95" r={isActivating ? 10 : 8} fill="none" stroke="#ffcc00" strokeWidth={isActivating ? 2 : 1} opacity={isActivating ? 1 : 0.8} />
        {isActivating && <circle cx="80" cy="95" r="5" fill="#fff8dc" opacity="0.6" />}
      </g>

      {/* Smoke - billows more when activating */}
      <g filter="url(#smokeBlur)">
        {isActivating ? (
          <>
            <ellipse className="smoke-active" cx="80" cy="85" rx="12" ry="10" fill="rgba(180, 180, 180, 0.7)" style={{ transformOrigin: '80px 85px' }} />
            <ellipse className="smoke-active" cx="75" cy="80" rx="10" ry="8" fill="rgba(160, 160, 160, 0.6)" style={{ transformOrigin: '75px 80px', animationDelay: '0.3s' }} />
            <ellipse className="smoke-active" cx="85" cy="82" rx="11" ry="9" fill="rgba(170, 170, 170, 0.65)" style={{ transformOrigin: '85px 82px', animationDelay: '0.6s' }} />
            <ellipse className="smoke-active" cx="78" cy="78" rx="9" ry="7" fill="rgba(150, 150, 150, 0.55)" style={{ transformOrigin: '78px 78px', animationDelay: '0.9s' }} />
          </>
        ) : (
          <>
            <ellipse className="smoke-1" cx="80" cy="85" rx="8" ry="6" fill="rgba(150, 150, 150, 0.5)" />
            <ellipse className="smoke-2" cx="75" cy="80" rx="6" ry="5" fill="rgba(130, 130, 130, 0.4)" />
            <ellipse className="smoke-3" cx="85" cy="82" rx="7" ry="5" fill="rgba(140, 140, 140, 0.45)" />
          </>
        )}
      </g>
    </svg>
  );
};

// ============================================
// PURGING ANIMATION
// ============================================
export const PurgingAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="handGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="50%" stopColor={skinTone} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
        <linearGradient id="cupCeramic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="50%" stopColor="#b8956e" />
          <stop offset="100%" stopColor="#8b7355" />
        </linearGradient>
        <linearGradient id="bitterLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d1f0f" />
          <stop offset="100%" stopColor="#1a1005" />
        </linearGradient>
        <radialGradient id="purgeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(100, 80, 40, 0.4)" />
          <stop offset="100%" stopColor="rgba(100, 80, 40, 0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes cupRaise {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30%, 70% { transform: translateY(-15px) rotate(-20deg); }
        }
        @keyframes cupDrink {
          0% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-25px) rotate(-35deg); }
          60% { transform: translateY(-30px) rotate(-50deg); }
          100% { transform: translateY(-25px) rotate(-35deg); }
        }
        @keyframes liquidTilt {
          0%, 100% { transform: rotate(0deg); }
          30%, 70% { transform: rotate(-20deg); }
        }
        @keyframes liquidDrain {
          0% { transform: rotate(0deg) scaleY(1); }
          50% { transform: rotate(-40deg) scaleY(0.5); }
          100% { transform: rotate(-50deg) scaleY(0.1); }
        }
        @keyframes steamRise {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(-25px) scale(1.2); }
        }
        @keyframes swallowGulp {
          0%, 40%, 100% { transform: scaleY(1); }
          50%, 60% { transform: scaleY(0.9); }
        }
        @keyframes swallowActive {
          0%, 100% { transform: scaleY(1); }
          25% { transform: scaleY(0.85); }
          50% { transform: scaleY(1.02); }
          75% { transform: scaleY(0.88); }
        }
        @keyframes purgePulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        .cup-motion { animation: cupRaise 3s ease-in-out infinite; transform-origin: center bottom; }
        .cup-active { animation: cupDrink 2.5s ease-out forwards; transform-origin: center bottom; }
        .liquid { animation: liquidTilt 3s ease-in-out infinite; transform-origin: center; }
        .liquid-active { animation: liquidDrain 2.5s ease-out forwards; transform-origin: center; }
        .steam-1 { animation: steamRise 2s ease-out infinite; }
        .steam-2 { animation: steamRise 2s ease-out infinite 0.5s; }
        .steam-3 { animation: steamRise 2s ease-out infinite 1s; }
        .throat { animation: swallowGulp 3s ease-in-out infinite; transform-origin: center; }
        .throat-active { animation: swallowActive 0.8s ease-in-out infinite; transform-origin: center; }
        .purge-pulse { animation: purgePulse 1.5s ease-in-out infinite; transform-origin: center; }
      `}</style>

      {/* Purge glow when activating */}
      {isActivating && (
        <ellipse className="purge-pulse" cx="100" cy="50" rx="50" ry="40" fill="url(#purgeGlow)" style={{ transformOrigin: '100px 50px' }} />
      )}

      {/* Hands holding cup */}
      <g className={isActivating ? "cup-active" : "cup-motion"}>
        {/* Left hand */}
        <ellipse cx="70" cy="100" rx="20" ry="25" fill="url(#handGradient)" />
        <ellipse cx="60" cy="95" rx="6" ry="12" fill={skinTone} />
        <ellipse cx="65" cy="110" rx="5" ry="10" fill={skinTone} />
        <ellipse cx="72" cy="112" rx="5" ry="10" fill={skinTone} />
        <ellipse cx="79" cy="110" rx="5" ry="10" fill={skinTone} />

        {/* Right hand */}
        <ellipse cx="130" cy="100" rx="20" ry="25" fill="url(#handGradient)" />
        <ellipse cx="140" cy="95" rx="6" ry="12" fill={skinTone} />
        <ellipse cx="135" cy="110" rx="5" ry="10" fill={skinTone} />
        <ellipse cx="128" cy="112" rx="5" ry="10" fill={skinTone} />
        <ellipse cx="121" cy="110" rx="5" ry="10" fill={skinTone} />

        {/* Ceramic cup */}
        <path d="M 80 80 L 75 120 Q 75 130 100 130 Q 125 130 125 120 L 120 80 Q 120 70 100 70 Q 80 70 80 80 Z"
          fill="url(#cupCeramic)" />
        <ellipse cx="100" cy="70" rx="20" ry="8" fill="#c9a06a" />

        {/* Liquid inside - drains when activating */}
        <g className={isActivating ? "liquid-active" : "liquid"}>
          <ellipse cx="100" cy="75" rx="16" ry="5" fill="url(#bitterLiquid)" />
        </g>

        {/* Decorative band */}
        <rect x="78" y="90" width="44" height="5" fill="#6b5344" opacity="0.5" />

        {/* Steam */}
        <ellipse className="steam-1" cx="95" cy="60" rx="4" ry="3" fill="rgba(200, 200, 200, 0.4)" style={{ transformOrigin: '95px 60px' }} />
        <ellipse className="steam-2" cx="100" cy="55" rx="5" ry="4" fill="rgba(180, 180, 180, 0.35)" style={{ transformOrigin: '100px 55px' }} />
        <ellipse className="steam-3" cx="105" cy="58" rx="4" ry="3" fill="rgba(190, 190, 190, 0.4)" style={{ transformOrigin: '105px 58px' }} />
      </g>

      {/* Chin/throat area (partial face) - gulps more when activating */}
      <g className={isActivating ? "throat-active" : "throat"}>
        <ellipse cx="100" cy="35" rx="25" ry="20" fill={skinTone} />
        <path d="M 85 45 Q 100 55 115 45" stroke={shadow} strokeWidth="1.5" fill="none" opacity="0.4" />
      </g>
    </svg>
  );
};

// ============================================
// THERIAC ADMINISTRATION ANIMATION
// ============================================
export const TheriakAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="vesselGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="30%" stopColor="#daa520" />
          <stop offset="70%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="vesselBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4a3728" />
          <stop offset="50%" stopColor="#6b4423" />
          <stop offset="100%" stopColor="#4a3728" />
        </linearGradient>
        <radialGradient id="theriakGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffacd" />
          <stop offset="40%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#daa520" />
        </radialGradient>
        <filter id="magicGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes lidOpen {
          0%, 100% { transform: rotate(0deg); }
          30%, 70% { transform: rotate(-45deg); }
        }
        @keyframes lidFullOpen {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-90deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          30%, 70% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes glowIntense {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes spoonScoop {
          0%, 100% { transform: translate(40px, -20px) rotate(30deg); }
          40%, 60% { transform: translate(0, 10px) rotate(-10deg); }
        }
        @keyframes spoonAdminister {
          0% { transform: translate(40px, -20px) rotate(30deg); }
          30% { transform: translate(0, 10px) rotate(-10deg); }
          60% { transform: translate(-30px, -10px) rotate(-25deg); }
          100% { transform: translate(-50px, -30px) rotate(-30deg); opacity: 0.5; }
        }
        @keyframes particleFloat {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-30px) scale(1); }
        }
        @keyframes particleBurst {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.5); }
        }
        @keyframes magicAura {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        .lid { animation: lidOpen 4s ease-in-out infinite; transform-origin: left center; }
        .lid-active { animation: lidFullOpen 1s ease-out forwards; transform-origin: left center; }
        .glow { animation: glowPulse 4s ease-in-out infinite; }
        .glow-active { animation: glowIntense 0.8s ease-in-out infinite; }
        .spoon { animation: spoonScoop 4s ease-in-out infinite; }
        .spoon-active { animation: spoonAdminister 2s ease-out forwards; }
        .particle-1 { animation: particleFloat 2s ease-out infinite; }
        .particle-2 { animation: particleFloat 2s ease-out infinite 0.3s; }
        .particle-3 { animation: particleFloat 2s ease-out infinite 0.6s; }
        .particle-4 { animation: particleFloat 2s ease-out infinite 0.9s; }
        .particle-burst { animation: particleBurst 1.5s ease-out infinite; }
        .magic-aura { animation: magicAura 1.5s ease-in-out infinite; transform-origin: center; }
      `}</style>

      {/* Magic aura when activating */}
      {isActivating && (
        <ellipse className="magic-aura" cx="80" cy="80" rx="55" ry="50" fill="url(#theriakGlow)" opacity="0.3" filter="url(#magicGlow)" style={{ transformOrigin: '80px 80px' }} />
      )}

      {/* Physician's hand */}
      <ellipse cx="150" cy="90" rx="18" ry="22" fill={skinTone} />
      <ellipse cx="160" cy="85" rx="5" ry="10" fill={skinTone} />
      <ellipse cx="155" cy="105" rx="4" ry="9" fill={skinTone} />

      {/* Ornate vessel */}
      <g>
        {/* Base */}
        <ellipse cx="80" cy="135" rx="25" ry="8" fill="url(#vesselGold)" />

        {/* Body */}
        <path d="M 55 130 Q 50 100 55 70 Q 60 50 80 45 Q 100 50 105 70 Q 110 100 105 130 Z"
          fill="url(#vesselBody)" />

        {/* Gold trim */}
        <ellipse cx="80" cy="70" rx="22" ry="6" fill="url(#vesselGold)" />
        <ellipse cx="80" cy="100" rx="24" ry="5" fill="url(#vesselGold)" opacity="0.7" />

        {/* Neck */}
        <rect x="70" y="40" width="20" height="12" fill="url(#vesselBody)" />
        <ellipse cx="80" cy="40" rx="12" ry="4" fill="url(#vesselGold)" />

        {/* Lid - opens fully when activating */}
        <g className={isActivating ? "lid-active" : "lid"} style={{ transformOrigin: '68px 35px' }}>
          <path d="M 68 35 Q 65 25 80 20 Q 95 25 92 35 Z" fill="url(#vesselGold)" />
          <ellipse cx="80" cy="18" rx="6" ry="4" fill="#ffd700" />
        </g>

        {/* Decorative patterns */}
        <circle cx="70" cy="85" r="3" fill="url(#vesselGold)" opacity="0.8" />
        <circle cx="90" cy="85" r="3" fill="url(#vesselGold)" opacity="0.8" />
        <circle cx="80" cy="115" r="4" fill="url(#vesselGold)" opacity="0.8" />
      </g>

      {/* Theriac glow inside - more intense when activating */}
      <g className={isActivating ? "glow-active" : "glow"} filter="url(#magicGlow)" style={{ transformOrigin: '80px 55px' }}>
        <ellipse cx="80" cy="55" rx={isActivating ? 14 : 10} ry={isActivating ? 12 : 8} fill="url(#theriakGlow)" />
      </g>

      {/* Magical particles - more when activating */}
      <g filter="url(#magicGlow)">
        <circle className="particle-1" cx="75" cy="45" r="2" fill="#fffacd" style={{ transformOrigin: '75px 45px' }} />
        <circle className="particle-2" cx="85" cy="40" r="1.5" fill="#ffd700" style={{ transformOrigin: '85px 40px' }} />
        <circle className="particle-3" cx="70" cy="35" r="1" fill="#fffacd" style={{ transformOrigin: '70px 35px' }} />
        <circle className="particle-4" cx="90" cy="38" r="1.5" fill="#ffd700" style={{ transformOrigin: '90px 38px' }} />
        {isActivating && (
          <>
            <circle className="particle-burst" cx="80" cy="50" r="2.5" fill="#ffd700" style={{ '--dx': '-20px', '--dy': '-15px', transformOrigin: '80px 50px' } as React.CSSProperties} />
            <circle className="particle-burst" cx="80" cy="50" r="2" fill="#fffacd" style={{ '--dx': '25px', '--dy': '-20px', animationDelay: '0.2s', transformOrigin: '80px 50px' } as React.CSSProperties} />
            <circle className="particle-burst" cx="80" cy="50" r="1.5" fill="#ffd700" style={{ '--dx': '-15px', '--dy': '-25px', animationDelay: '0.4s', transformOrigin: '80px 50px' } as React.CSSProperties} />
            <circle className="particle-burst" cx="80" cy="50" r="2" fill="#fffacd" style={{ '--dx': '10px', '--dy': '-30px', animationDelay: '0.6s', transformOrigin: '80px 50px' } as React.CSSProperties} />
          </>
        )}
      </g>

      {/* Spoon - administers dose when activating */}
      <g className={isActivating ? "spoon-active" : "spoon"}>
        <ellipse cx="115" cy="60" rx="8" ry="5" fill="#daa520" />
        <rect x="118" y="55" width="35" height="4" rx="1" fill={shadow} />
        <ellipse cx="117" cy="58" rx="5" ry="3" fill="url(#theriakGlow)" opacity={isActivating ? 1 : 0.8} />
      </g>

      {/* Label */}
      <text x="80" y="155" textAnchor="middle" fill="rgba(218, 165, 32, 0.7)" fontSize="9" fontFamily="serif" fontStyle="italic">
        Tiryāq - The Universal Antidote
      </text>
    </svg>
  );
};

// ============================================
// FUMIGATION ANIMATION
// ============================================
export const FumigationAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="brazierGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8c896" />
          <stop offset="30%" stopColor="#d4a574" />
          <stop offset="70%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="brazierInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a3520" />
          <stop offset="100%" stopColor="#2a1a10" />
        </linearGradient>
        <radialGradient id="coalGlow2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff6600" />
          <stop offset="40%" stopColor="#ff4500" />
          <stop offset="70%" stopColor="#cc2200" />
          <stop offset="100%" stopColor="#661100" />
        </radialGradient>
        <radialGradient id="emberGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcc00" />
          <stop offset="50%" stopColor="#ff8800" />
          <stop offset="100%" stopColor="#ff4400" />
        </radialGradient>
        <linearGradient id="smokeGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(180, 165, 150, 0.7)" />
          <stop offset="50%" stopColor="rgba(160, 150, 140, 0.4)" />
          <stop offset="100%" stopColor="rgba(140, 135, 130, 0)" />
        </linearGradient>
        <linearGradient id="smokeGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(190, 175, 160, 0.6)" />
          <stop offset="60%" stopColor="rgba(170, 160, 150, 0.3)" />
          <stop offset="100%" stopColor="rgba(150, 145, 140, 0)" />
        </linearGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="coalGlowFilter">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="sparkGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes coalPulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
        @keyframes emberFlicker {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          25% { opacity: 1; transform: scale(1.1); }
          50% { opacity: 0.8; transform: scale(0.95); }
          75% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes smoke1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          10% { opacity: 0.6; }
          50% { opacity: 0.4; }
          100% { opacity: 0; transform: translate(3px, -70px) scale(1.8); }
        }
        @keyframes smoke2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          15% { opacity: 0.5; }
          60% { opacity: 0.3; }
          100% { opacity: 0; transform: translate(-5px, -80px) scale(2); }
        }
        @keyframes smoke3 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          20% { opacity: 0.55; }
          70% { opacity: 0.25; }
          100% { opacity: 0; transform: translate(2px, -65px) scale(1.6); }
        }
        @keyframes smoke4 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.45); }
          12% { opacity: 0.5; }
          55% { opacity: 0.3; }
          100% { opacity: 0; transform: translate(-3px, -75px) scale(1.9); }
        }
        @keyframes sparkRise1 {
          0% { opacity: 1; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(2px, -25px); }
        }
        @keyframes sparkRise2 {
          0% { opacity: 1; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(-3px, -30px); }
        }
        @keyframes sparkRise3 {
          0% { opacity: 1; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(1px, -22px); }
        }
        @keyframes swirlPath1 {
          0% { stroke-dashoffset: 100; opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.2; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes swirlPath2 {
          0% { stroke-dashoffset: 80; opacity: 0; }
          15% { opacity: 0.35; }
          85% { opacity: 0.15; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes incenseGlow {
          0%, 100% { fill: #deb887; }
          50% { fill: #f0d9a0; }
        }
        .coal-group { animation: coalPulse 1.5s ease-in-out infinite; }
        .ember { animation: emberFlicker 0.8s ease-in-out infinite; }
        .smoke-a { animation: smoke1 5s ease-out infinite; }
        .smoke-b { animation: smoke2 6s ease-out infinite 1s; }
        .smoke-c { animation: smoke3 5.5s ease-out infinite 2s; }
        .smoke-d { animation: smoke4 6.5s ease-out infinite 3s; }
        .smoke-e { animation: smoke1 5.2s ease-out infinite 4s; }
        .spark-a { animation: sparkRise1 1.2s ease-out infinite; }
        .spark-b { animation: sparkRise2 1.5s ease-out infinite 0.4s; }
        .spark-c { animation: sparkRise3 1s ease-out infinite 0.8s; }
        .spark-d { animation: sparkRise1 1.3s ease-out infinite 1.1s; }
        .swirl-1 { stroke-dasharray: 100; animation: swirlPath1 7s ease-out infinite; }
        .swirl-2 { stroke-dasharray: 80; animation: swirlPath2 8s ease-out infinite 1.5s; }
        .swirl-3 { stroke-dasharray: 90; animation: swirlPath1 7.5s ease-out infinite 3s; }
        .incense-chunk { animation: incenseGlow 2s ease-in-out infinite; }

        @keyframes smokeIntense {
          0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
          15% { opacity: 0.8; }
          100% { opacity: 0; transform: translate(5px, -90px) scale(2.5); }
        }
        @keyframes coalBlaze {
          0%, 100% { filter: brightness(1.2); }
          50% { filter: brightness(1.6); }
        }
        @keyframes purifyAura {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes sparkBurst {
          0% { opacity: 1; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(var(--sx), -40px); }
        }
        .smoke-intense { animation: smokeIntense 3s ease-out infinite; }
        .coal-blaze { animation: coalBlaze 0.5s ease-in-out infinite; }
        .purify-aura { animation: purifyAura 1.5s ease-in-out infinite; transform-origin: center; }
        .spark-burst { animation: sparkBurst 1s ease-out infinite; }
      `}</style>

      {/* Purification aura when activating */}
      {isActivating && (
        <ellipse className="purify-aura" cx="100" cy="60" rx="70" ry="50" fill="rgba(180, 165, 140, 0.15)" style={{ transformOrigin: '100px 60px' }} />
      )}

      {/* Shadow under brazier */}
      <ellipse cx="100" cy="148" rx="40" ry="6" fill="rgba(0,0,0,0.2)" />

      {/* Brazier base */}
      <ellipse cx="100" cy="142" rx="32" ry="8" fill="#5a4030" />

      {/* Brazier body */}
      <path d="M 68 142 L 72 108 Q 74 98 100 94 Q 126 98 128 108 L 132 142 Z" fill="url(#brazierGradient)" />

      {/* Brazier inner shadow */}
      <ellipse cx="100" cy="98" rx="22" ry="8" fill="url(#brazierInner)" />

      {/* Brazier rim */}
      <ellipse cx="100" cy="94" rx="26" ry="9" fill="#daa520" />
      <ellipse cx="100" cy="93" rx="23" ry="7" fill="#c9a06a" />

      {/* Decorative bands */}
      <path d="M 73 115 Q 100 120 127 115" stroke="#daa520" strokeWidth="3" fill="none" />
      <path d="M 70 128 Q 100 133 130 128" stroke="#b8860b" strokeWidth="2" fill="none" opacity="0.7" />

      {/* Handle loops */}
      <ellipse cx="62" cy="118" rx="6" ry="10" fill="none" stroke="#c9a06a" strokeWidth="3" />
      <ellipse cx="138" cy="118" rx="6" ry="10" fill="none" stroke="#c9a06a" strokeWidth="3" />

      {/* Coals and embers - blazes more when activating */}
      <g className={isActivating ? "coal-blaze" : "coal-group"} filter="url(#coalGlowFilter)">
        <ellipse cx="92" cy="90" rx="10" ry="6" fill="url(#coalGlow2)" />
        <ellipse cx="108" cy="88" rx="9" ry="5" fill="url(#coalGlow2)" />
        <ellipse cx="100" cy="92" rx="8" ry="5" fill="url(#coalGlow2)" />
      </g>

      {/* Hot embers on top */}
      <g filter="url(#sparkGlow)">
        <ellipse className="ember" cx="95" cy="87" rx="4" ry="2.5" fill="url(#emberGlow)" style={{ transformOrigin: '95px 87px' }} />
        <ellipse className="ember" cx="105" cy="85" rx="3" ry="2" fill="url(#emberGlow)" style={{ transformOrigin: '105px 85px', animationDelay: '0.3s' }} />
        <ellipse className="ember" cx="100" cy="89" rx="3.5" ry="2" fill="url(#emberGlow)" style={{ transformOrigin: '100px 89px', animationDelay: '0.6s' }} />
      </g>

      {/* Incense chunks */}
      <ellipse className="incense-chunk" cx="97" cy="86" rx="4" ry="2.5" fill="#deb887" />
      <rect x="103" y="83" width="3" height="5" rx="1" fill="#a0522d" transform="rotate(15 104 85)" />

      {/* Rising sparks */}
      <g filter="url(#sparkGlow)">
        <circle className="spark-a" cx="96" cy="82" r="1.2" fill="#ffcc00" style={{ transformOrigin: '96px 82px' }} />
        <circle className="spark-b" cx="103" cy="80" r="1" fill="#ff9900" style={{ transformOrigin: '103px 80px' }} />
        <circle className="spark-c" cx="99" cy="83" r="0.8" fill="#ffcc00" style={{ transformOrigin: '99px 83px' }} />
        <circle className="spark-d" cx="106" cy="82" r="0.9" fill="#ffaa00" style={{ transformOrigin: '106px 82px' }} />
      </g>

      {/* Smoke plumes - more intense when activating */}
      <g filter="url(#softBlur)">
        {isActivating ? (
          <>
            <ellipse className="smoke-intense" cx="100" cy="75" rx="16" ry="14" fill="url(#smokeGrad1)" style={{ transformOrigin: '100px 75px' }} />
            <ellipse className="smoke-intense" cx="95" cy="72" rx="18" ry="15" fill="url(#smokeGrad2)" style={{ transformOrigin: '95px 72px', animationDelay: '0.5s' }} />
            <ellipse className="smoke-intense" cx="105" cy="70" rx="14" ry="12" fill="url(#smokeGrad1)" style={{ transformOrigin: '105px 70px', animationDelay: '1s' }} />
            <ellipse className="smoke-intense" cx="100" cy="68" rx="20" ry="16" fill="url(#smokeGrad2)" style={{ transformOrigin: '100px 68px', animationDelay: '1.5s' }} />
            <ellipse className="smoke-intense" cx="98" cy="65" rx="15" ry="12" fill="url(#smokeGrad1)" style={{ transformOrigin: '98px 65px', animationDelay: '2s' }} />
            <ellipse className="smoke-intense" cx="102" cy="62" rx="17" ry="14" fill="url(#smokeGrad2)" style={{ transformOrigin: '102px 62px', animationDelay: '2.5s' }} />
          </>
        ) : (
          <>
            <ellipse className="smoke-a" cx="100" cy="75" rx="12" ry="10" fill="url(#smokeGrad1)" style={{ transformOrigin: '100px 75px' }} />
            <ellipse className="smoke-b" cx="95" cy="72" rx="14" ry="11" fill="url(#smokeGrad2)" style={{ transformOrigin: '95px 72px' }} />
            <ellipse className="smoke-c" cx="105" cy="70" rx="10" ry="9" fill="url(#smokeGrad1)" style={{ transformOrigin: '105px 70px' }} />
            <ellipse className="smoke-d" cx="100" cy="68" rx="16" ry="12" fill="url(#smokeGrad2)" style={{ transformOrigin: '100px 68px' }} />
            <ellipse className="smoke-e" cx="98" cy="65" rx="11" ry="9" fill="url(#smokeGrad1)" style={{ transformOrigin: '98px 65px' }} />
          </>
        )}
      </g>

      {/* Fragrant swirling trails */}
      <path className="swirl-1" d="M 100 70 Q 95 55 100 40 Q 105 25 98 10"
        stroke="rgba(180, 160, 140, 0.35)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path className="swirl-2" d="M 105 68 Q 112 50 105 35 Q 98 20 102 5"
        stroke="rgba(170, 150, 130, 0.3)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path className="swirl-3" d="M 95 72 Q 88 55 95 38 Q 102 22 96 8"
        stroke="rgba(175, 155, 135, 0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Ambient glow around coals */}
      <ellipse cx="100" cy="88" rx="18" ry="10" fill="rgba(255, 100, 0, 0.15)" />

      {/* Label */}
      <text x="100" y="158" textAnchor="middle" fill="rgba(218, 165, 32, 0.7)" fontSize="9" fontFamily="serif" fontStyle="italic">
        Frankincense & Myrrh
      </text>
    </svg>
  );
};

// ============================================
// LEECH THERAPY ANIMATION
// ============================================
export const LeechAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="armGradientLeech" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="40%" stopColor={skinTone} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
        <linearGradient id="leechBodyHungry" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3d2d22" />
          <stop offset="30%" stopColor="#5a4535" />
          <stop offset="70%" stopColor="#4a3a2d" />
          <stop offset="100%" stopColor="#2d1f1a" />
        </linearGradient>
        <linearGradient id="leechBodyFeeding" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a2020" />
          <stop offset="30%" stopColor="#6b2828" />
          <stop offset="70%" stopColor="#5a2222" />
          <stop offset="100%" stopColor="#3d1818" />
        </linearGradient>
        <linearGradient id="leechBodyFull" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5a1515" />
          <stop offset="30%" stopColor="#7a1e1e" />
          <stop offset="70%" stopColor="#6b1818" />
          <stop offset="100%" stopColor="#4a1010" />
        </linearGradient>
        <radialGradient id="biteMarkLeech" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#990000" />
          <stop offset="40%" stopColor="#6b0000" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="bloodPoolLeech" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139, 0, 0, 0.6)" />
          <stop offset="100%" stopColor="rgba(100, 0, 0, 0)" />
        </radialGradient>
        <filter id="leechShadow">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes peristalsis1 {
          0%, 100% {
            d: path("M 70 82 Q 66 72 68 62 Q 70 55 70 58");
          }
          25% {
            d: path("M 70 82 Q 64 74 67 64 Q 71 56 70 58");
          }
          50% {
            d: path("M 70 82 Q 68 70 70 60 Q 72 54 70 58");
          }
          75% {
            d: path("M 70 82 Q 72 72 71 62 Q 69 55 70 58");
          }
        }
        @keyframes leechFeed1 {
          0%, 100% { transform: scaleX(1) scaleY(1); }
          30% { transform: scaleX(0.92) scaleY(1.08); }
          60% { transform: scaleX(1.05) scaleY(0.96); }
        }
        @keyframes leechFeed2 {
          0%, 100% { transform: scaleX(1) scaleY(1); }
          25% { transform: scaleX(0.9) scaleY(1.1); }
          50% { transform: scaleX(1.08) scaleY(0.94); }
          75% { transform: scaleX(0.95) scaleY(1.04); }
        }
        @keyframes leechFeed3 {
          0%, 100% { transform: scaleX(1) scaleY(1); }
          35% { transform: scaleX(0.94) scaleY(1.06); }
          70% { transform: scaleX(1.03) scaleY(0.97); }
        }
        @keyframes suckMotion {
          0%, 100% { r: 4; }
          50% { r: 3.5; }
        }
        @keyframes bloodPulse1 {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes bloodPulse2 {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes headBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes bowlRipple {
          0%, 100% { transform: scaleX(1); opacity: 0.4; }
          50% { transform: scaleX(1.05); opacity: 0.5; }
        }
        @keyframes spareLeechMove {
          0%, 100% { d: path("M 38 138 Q 35 135 40 132 Q 48 130 52 134 Q 54 137 50 139"); }
          50% { d: path("M 36 137 Q 34 134 42 131 Q 50 129 54 133 Q 56 138 48 140"); }
        }
        .leech-body-1 { animation: leechFeed1 2.5s ease-in-out infinite; transform-origin: 70px 82px; }
        .leech-body-2 { animation: leechFeed2 2.8s ease-in-out infinite 0.4s; transform-origin: 95px 78px; }
        .leech-body-3 { animation: leechFeed3 2.2s ease-in-out infinite 0.8s; transform-origin: 125px 75px; }
        .sucker-1 { animation: suckMotion 1.5s ease-in-out infinite; }
        .sucker-2 { animation: suckMotion 1.7s ease-in-out infinite 0.3s; }
        .sucker-3 { animation: suckMotion 1.4s ease-in-out infinite 0.6s; }
        .blood-pulse-1 { animation: bloodPulse1 2s ease-in-out infinite; transform-origin: center; }
        .blood-pulse-2 { animation: bloodPulse2 2.3s ease-in-out infinite 0.5s; transform-origin: center; }
        .blood-pulse-3 { animation: bloodPulse1 1.9s ease-in-out infinite 1s; transform-origin: center; }
        .leech-head { animation: headBob 2s ease-in-out infinite; }
        .bowl-water { animation: bowlRipple 3s ease-in-out infinite; transform-origin: center; }
        .spare-leech { animation: spareLeechMove 4s ease-in-out infinite; }

        @keyframes leechEngorge {
          0% { transform: scaleX(1) scaleY(1); }
          50% { transform: scaleX(0.85) scaleY(1.2); }
          100% { transform: scaleX(1.15) scaleY(0.9); }
        }
        @keyframes bloodDrain {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.25); }
        }
        @keyframes healingPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }
        .leech-engorge { animation: leechEngorge 1.5s ease-in-out infinite; }
        .blood-drain { animation: bloodDrain 1s ease-in-out infinite; }
        .healing-pulse { animation: healingPulse 1.5s ease-in-out infinite; transform-origin: center; }
      `}</style>

      {/* Healing aura when activating */}
      {isActivating && (
        <ellipse className="healing-pulse" cx="100" cy="78" rx="90" ry="45" fill="rgba(139, 0, 0, 0.08)" style={{ transformOrigin: '100px 78px' }} />
      )}

      {/* Forearm with subtle muscle definition */}
      <ellipse cx="100" cy="85" rx="82" ry="38" fill="url(#armGradientLeech)" />

      {/* Wrist area */}
      <ellipse cx="25" cy="85" rx="18" ry="25" fill={skinTone} />
      <ellipse cx="175" cy="85" rx="18" ry="25" fill={skinTone} />

      {/* Subtle muscle shadows */}
      <ellipse cx="100" cy="78" rx="60" ry="20" fill={highlight} opacity="0.15" />
      <ellipse cx="100" cy="95" rx="50" ry="12" fill={shadow} opacity="0.12" />

      {/* Visible veins - more anatomically placed */}
      <path d="M 35 80 Q 55 75 75 78 Q 95 82 115 79 Q 135 75 165 82"
        stroke="rgba(90, 70, 130, 0.22)" strokeWidth="3" fill="none" />
      <path d="M 40 88 Q 60 92 80 89 Q 100 85 120 88 Q 140 92 155 88"
        stroke="rgba(100, 80, 140, 0.18)" strokeWidth="2.5" fill="none" />
      <path d="M 50 95 Q 80 98 110 95 Q 140 92 160 96"
        stroke="rgba(90, 70, 130, 0.15)" strokeWidth="2" fill="none" />

      {/* Bite marks with blood pooling */}
      <ellipse cx="70" cy="82" rx="5" ry="4" fill="url(#biteMarkLeech)" />
      <ellipse cx="95" cy="78" rx="5" ry="4" fill="url(#biteMarkLeech)" />
      <ellipse cx="125" cy="75" rx="5" ry="4" fill="url(#biteMarkLeech)" />

      {/* Pulsing blood around bites - more intense when activating */}
      <ellipse className={isActivating ? "blood-drain" : "blood-pulse-1"} cx="70" cy="82" rx={isActivating ? 10 : 8} ry={isActivating ? 8 : 6} fill="url(#bloodPoolLeech)" style={{ transformOrigin: '70px 82px' }} />
      <ellipse className={isActivating ? "blood-drain" : "blood-pulse-2"} cx="95" cy="78" rx={isActivating ? 11 : 9} ry={isActivating ? 9 : 7} fill="url(#bloodPoolLeech)" style={{ transformOrigin: '95px 78px', animationDelay: '0.3s' }} />
      <ellipse className={isActivating ? "blood-drain" : "blood-pulse-3"} cx="125" cy="75" rx={isActivating ? 9 : 7} ry={isActivating ? 7 : 5} fill="url(#bloodPoolLeech)" style={{ transformOrigin: '125px 75px', animationDelay: '0.6s' }} />

      {/* Leech 1 - Actively feeding, medium fullness */}
      <g className={isActivating ? "leech-engorge" : "leech-body-1"} filter="url(#leechShadow)" style={{ transformOrigin: '70px 70px' }}>
        {/* Body - segmented appearance */}
        <ellipse cx="70" cy="70" rx={isActivating ? 9 : 7} ry={isActivating ? 17 : 15} fill="url(#leechBodyFeeding)" />
        {/* Posterior sucker */}
        <ellipse cx="70" cy="57" rx="4" ry="3" fill="#3d2d22" />
        {/* Anterior sucker (mouth) attached to skin */}
        <ellipse className="sucker-1" cx="70" cy="82" rx="4" ry="3" fill="#4a3728" />
        {/* Segmentation lines */}
        <line x1="63" y1="62" x2="77" y2="62" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="64" y1="67" x2="76" y2="67" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="64" y1="72" x2="76" y2="72" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="63" y1="77" x2="77" y2="77" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        {/* Dorsal stripe */}
        <line x1="70" y1="58" x2="70" y2="80" stroke="#5a4a3d" strokeWidth="1.5" opacity="0.4" />
      </g>

      {/* Leech 2 - Most engorged, almost full */}
      <g className="leech-body-2" filter="url(#leechShadow)">
        <ellipse cx="95" cy="65" rx="9" ry="17" fill="url(#leechBodyFull)" />
        <ellipse cx="95" cy="50" rx="4" ry="3" fill="#3d2d22" />
        <ellipse className="sucker-2" cx="95" cy="78" rx="5" ry="3.5" fill="#4a3728" />
        <line x1="86" y1="54" x2="104" y2="54" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="87" y1="60" x2="103" y2="60" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="87" y1="66" x2="103" y2="66" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="86" y1="72" x2="104" y2="72" stroke="#2a1a14" strokeWidth="0.6" opacity="0.5" />
        <line x1="95" y1="52" x2="95" y2="76" stroke="#6a4a3d" strokeWidth="1.5" opacity="0.35" />
        {/* Visible blood inside (it's very full) */}
        <ellipse cx="95" cy="64" rx="5" ry="10" fill="rgba(100, 20, 20, 0.3)" />
      </g>

      {/* Leech 3 - Just attached, hungry/thin */}
      <g className="leech-body-3" filter="url(#leechShadow)">
        <ellipse cx="125" cy="65" rx="5" ry="12" fill="url(#leechBodyHungry)" />
        <ellipse className="leech-head" cx="125" cy="55" rx="3.5" ry="3" fill="#3d2d22" style={{ transformOrigin: '125px 55px' }} />
        <ellipse className="sucker-3" cx="125" cy="75" rx="4" ry="2.5" fill="#4a3728" />
        <line x1="120" y1="58" x2="130" y2="58" stroke="#2a1a14" strokeWidth="0.5" opacity="0.5" />
        <line x1="120" y1="63" x2="130" y2="63" stroke="#2a1a14" strokeWidth="0.5" opacity="0.5" />
        <line x1="120" y1="68" x2="130" y2="68" stroke="#2a1a14" strokeWidth="0.5" opacity="0.5" />
        <line x1="125" y1="56" x2="125" y2="73" stroke="#5a4a3d" strokeWidth="1" opacity="0.4" />
      </g>

      {/* Ceramic water bowl for leeches - more detailed */}
      <g transform="translate(0, 5)">
        {/* Bowl shadow */}
        <ellipse cx="40" cy="150" rx="28" ry="6" fill="rgba(0,0,0,0.15)" />
        {/* Bowl exterior */}
        <ellipse cx="40" cy="142" rx="26" ry="8" fill="#7a5d45" />
        <path d="M 14 142 Q 14 132 25 128 L 55 128 Q 66 132 66 142 Z" fill="#8b6d55" />
        {/* Bowl rim */}
        <ellipse cx="40" cy="128" rx="15" ry="5" fill="#9a7d65" />
        {/* Water surface */}
        <ellipse className="bowl-water" cx="40" cy="130" rx="12" ry="3.5" fill="rgba(120, 160, 200, 0.5)" />
        {/* Water reflection */}
        <ellipse cx="38" cy="129" rx="6" ry="2" fill="rgba(180, 200, 220, 0.4)" />

        {/* Spare leech swimming in bowl */}
        <path className="spare-leech"
          d="M 38 138 Q 35 135 40 132 Q 48 130 52 134 Q 54 137 50 139"
          fill="url(#leechBodyHungry)" stroke="none" />
        <ellipse cx="52" cy="134" rx="2" ry="1.5" fill="#3d2d22" /> {/* head */}
      </g>

      {/* Practitioner's forceps/tweezers holding a leech */}
      <g transform="translate(150, 115)">
        {/* Tweezers */}
        <path d="M 0 0 L 5 20 L 8 20 L 10 0 Z" fill="#a0a0a0" />
        <path d="M 2 0 L 6 15 L 7 15 L 9 0 Z" fill="#c0c0c0" />
        {/* Leech being held */}
        <ellipse cx="6.5" cy="25" rx="3" ry="8" fill="url(#leechBodyHungry)" />
        <ellipse cx="6.5" cy="18" rx="2" ry="2" fill="#3d2d22" />
        <ellipse cx="6.5" cy="32" rx="2.5" ry="2" fill="#4a3728" />
      </g>

      {/* Label */}
      <text x="100" y="158" textAnchor="middle" fill="rgba(100, 60, 30, 0.65)" fontSize="9" fontFamily="serif" fontStyle="italic">
        Hirudo medicinalis
      </text>
    </svg>
  );
};

// ============================================
// POULTICE APPLICATION ANIMATION
// ============================================
export const PoulticeAnimation: React.FC<{ skinTone: string; isActivating?: boolean }> = ({ skinTone, isActivating = false }) => {
  const shadow = getSkinShadow(skinTone);
  const highlight = getSkinHighlight(skinTone);

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="bodyGradPoultice" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="50%" stopColor={skinTone} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
        <radialGradient id="buboGradientPoultice" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#7a0505" />
          <stop offset="25%" stopColor="#650a30" />
          <stop offset="50%" stopColor="#5a1a45" />
          <stop offset="75%" stopColor={shadow} />
          <stop offset="100%" stopColor={skinTone} />
        </radialGradient>
        <linearGradient id="poulticeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4b896" />
          <stop offset="25%" stopColor="#c4a880" />
          <stop offset="50%" stopColor="#b09060" />
          <stop offset="75%" stopColor="#9a7a4a" />
          <stop offset="100%" stopColor="#7a5a30" />
        </linearGradient>
        <radialGradient id="warmthGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 180, 80, 0.35)" />
          <stop offset="50%" stopColor="rgba(255, 140, 50, 0.2)" />
          <stop offset="100%" stopColor="rgba(255, 100, 30, 0)" />
        </radialGradient>
        <radialGradient id="oilSheen" cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
        <linearGradient id="clothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5f5dc" />
          <stop offset="50%" stopColor="#e8e4c9" />
          <stop offset="100%" stopColor="#d4d0b8" />
        </linearGradient>
        <filter id="steamBlur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="warmGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dropShadow">
          <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
        </filter>
      </defs>

      <style>{`
        @keyframes buboThrob {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.02); }
          60% { transform: scale(0.98); }
        }
        @keyframes warmthPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
        @keyframes steamFloat1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.3); }
          15% { opacity: 0.5; }
          85% { opacity: 0.2; }
          100% { opacity: 0; transform: translate(2px, -35px) scale(1.5); }
        }
        @keyframes steamFloat2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          20% { opacity: 0.45; }
          80% { opacity: 0.15; }
          100% { opacity: 0; transform: translate(-3px, -40px) scale(1.6); }
        }
        @keyframes steamFloat3 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.35); }
          18% { opacity: 0.4; }
          82% { opacity: 0.1; }
          100% { opacity: 0; transform: translate(1px, -32px) scale(1.4); }
        }
        @keyframes handPress {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(0, 4px); }
        }
        @keyframes ingredientShimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes pestleGrind {
          0%, 100% { transform: rotate(0deg) translate(0, 0); }
          25% { transform: rotate(5deg) translate(2px, -1px); }
          50% { transform: rotate(0deg) translate(0, 2px); }
          75% { transform: rotate(-5deg) translate(-2px, 0); }
        }
        @keyframes honeyDrip {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(1px); }
        }
        .bubo-throb { animation: buboThrob 3s ease-in-out infinite; transform-origin: 100px 80px; }
        .warmth-pulse { animation: warmthPulse 2.5s ease-in-out infinite; transform-origin: center; }
        .steam-1 { animation: steamFloat1 4s ease-out infinite; transform-origin: center; }
        .steam-2 { animation: steamFloat2 4.5s ease-out infinite 0.8s; transform-origin: center; }
        .steam-3 { animation: steamFloat3 4.2s ease-out infinite 1.6s; transform-origin: center; }
        .steam-4 { animation: steamFloat1 4.8s ease-out infinite 2.4s; transform-origin: center; }
        .hand-pressing { animation: handPress 2.5s ease-in-out infinite; transform-origin: center; }
        .herb-shimmer { animation: ingredientShimmer 2s ease-in-out infinite; }
        .pestle-motion { animation: pestleGrind 2s ease-in-out infinite; transform-origin: 35px 10px; }
        .honey-drop { animation: honeyDrip 2s ease-in-out infinite; }

        @keyframes buboShrinkHeal {
          0% { transform: scale(1); }
          100% { transform: scale(0.7); }
        }
        @keyframes warmthIntense {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes handPressDeep {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(0, 8px); }
        }
        @keyframes steamBurst {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          20% { opacity: 0.7; }
          100% { opacity: 0; transform: translate(0, -50px) scale(2); }
        }
        @keyframes healGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .bubo-heal { animation: buboShrinkHeal 2.5s ease-out forwards; transform-origin: center; }
        .warmth-intense { animation: warmthIntense 1s ease-in-out infinite; transform-origin: center; }
        .hand-deep { animation: handPressDeep 1.5s ease-in-out infinite; transform-origin: center; }
        .steam-burst { animation: steamBurst 2s ease-out infinite; }
        .heal-glow { animation: healGlow 1.5s ease-in-out infinite; }
      `}</style>

      {/* Healing glow when activating */}
      {isActivating && (
        <ellipse className="heal-glow" cx="100" cy="78" rx="55" ry="45" fill="rgba(16, 185, 129, 0.12)" style={{ transformOrigin: '100px 78px' }} />
      )}

      {/* Body area - thigh/groin region */}
      <ellipse cx="100" cy="95" rx="88" ry="52" fill="url(#bodyGradPoultice)" />

      {/* Subtle anatomical details */}
      <ellipse cx="100" cy="88" rx="70" ry="35" fill={highlight} opacity="0.12" />
      <path d="M 20 80 Q 60 100 100 105 Q 140 100 180 80"
        stroke={shadow} strokeWidth="2.5" fill="none" opacity="0.25" />

      {/* Warmth radiating from poultice - more intense when activating */}
      <ellipse className={isActivating ? "warmth-intense" : "warmth-pulse"} cx="100" cy="78" rx={isActivating ? 45 : 40} ry={isActivating ? 36 : 32} fill="url(#warmthGlow)" filter="url(#warmGlow)" style={{ transformOrigin: '100px 78px' }} />

      {/* Bubo (swollen lymph node) - shrinks when activating */}
      <g className={isActivating ? "bubo-heal" : "bubo-throb"} style={{ transformOrigin: '100px 80px' }}>
        <ellipse cx="100" cy="80" rx="24" ry="20" fill="url(#buboGradientPoultice)" />
        {/* Inflamed center */}
        <ellipse cx="97" cy="77" rx="8" ry="6" fill="rgba(120, 10, 20, 0.35)" />
        {/* Tension highlight */}
        <ellipse cx="104" cy="74" rx="4" ry="3" fill="rgba(255, 200, 200, 0.15)" />
      </g>

      {/* Cloth bandage under poultice */}
      <g filter="url(#dropShadow)">
        <path d="M 72 68 Q 70 80 74 92 L 126 92 Q 130 80 128 68 Z" fill="url(#clothGrad)" opacity="0.85" />
        {/* Cloth texture */}
        <line x1="80" y1="72" x2="80" y2="88" stroke="#ccc8b0" strokeWidth="0.5" opacity="0.4" />
        <line x1="90" y1="70" x2="90" y2="90" stroke="#ccc8b0" strokeWidth="0.5" opacity="0.4" />
        <line x1="100" y1="68" x2="100" y2="92" stroke="#ccc8b0" strokeWidth="0.5" opacity="0.4" />
        <line x1="110" y1="70" x2="110" y2="90" stroke="#ccc8b0" strokeWidth="0.5" opacity="0.4" />
        <line x1="120" y1="72" x2="120" y2="88" stroke="#ccc8b0" strokeWidth="0.5" opacity="0.4" />
      </g>

      {/* Poultice mixture */}
      <ellipse cx="100" cy="76" rx="20" ry="13" fill="url(#poulticeGrad)" />
      <ellipse cx="100" cy="75" rx="18" ry="11" fill="url(#oilSheen)" />

      {/* Visible ingredients in poultice */}
      {/* Fig pieces */}
      <ellipse className="herb-shimmer" cx="94" cy="73" rx="3.5" ry="2.5" fill="#6b4423" opacity="0.75" style={{ animationDelay: '0s' }} />
      <ellipse className="herb-shimmer" cx="107" cy="78" rx="3" ry="2" fill="#7a5533" opacity="0.7" style={{ animationDelay: '0.3s' }} />
      {/* Onion pieces */}
      <ellipse className="herb-shimmer" cx="102" cy="71" rx="2.5" ry="2" fill="#e8dcc0" opacity="0.6" style={{ animationDelay: '0.6s' }} />
      <ellipse className="herb-shimmer" cx="92" cy="79" rx="2" ry="1.5" fill="#f0e8d8" opacity="0.55" style={{ animationDelay: '0.9s' }} />
      {/* Herb flecks */}
      <circle className="herb-shimmer" cx="98" cy="75" r="1.5" fill="#4a6030" opacity="0.65" style={{ animationDelay: '0.2s' }} />
      <circle className="herb-shimmer" cx="105" cy="74" r="1.2" fill="#5a7040" opacity="0.6" style={{ animationDelay: '0.5s' }} />
      <circle className="herb-shimmer" cx="96" cy="78" r="1" fill="#4a6030" opacity="0.55" style={{ animationDelay: '0.8s' }} />
      {/* Honey glaze spots */}
      <ellipse cx="100" cy="73" rx="4" ry="2" fill="rgba(218, 165, 32, 0.25)" />
      <ellipse cx="95" cy="77" rx="3" ry="1.5" fill="rgba(218, 165, 32, 0.2)" />

      {/* Practitioner's hand applying pressure - deeper when activating */}
      <g className={isActivating ? "hand-deep" : "hand-pressing"} filter="url(#dropShadow)">
        {/* Palm */}
        <ellipse cx="100" cy="55" rx="28" ry="22" fill={skinTone} />

        {/* Fingers - more anatomical */}
        <path d="M 78 58 Q 75 65 76 78 Q 78 82 80 78 Q 82 65 80 58" fill={skinTone} />
        <path d="M 86 60 Q 84 70 85 82 Q 87 86 89 82 Q 90 70 88 60" fill={skinTone} />
        <path d="M 96 62 Q 94 72 95 85 Q 97 89 99 85 Q 100 72 98 62" fill={skinTone} />
        <path d="M 106 61 Q 104 71 105 84 Q 107 88 109 84 Q 110 71 108 61" fill={skinTone} />
        <path d="M 116 58 Q 114 68 115 80 Q 117 84 119 80 Q 120 68 118 58" fill={skinTone} />

        {/* Thumb */}
        <ellipse cx="130" cy="50" rx="8" ry="12" fill={skinTone} transform="rotate(25 130 50)" />

        {/* Knuckle creases */}
        <path d="M 78 55 Q 85 52 92 54" stroke={shadow} strokeWidth="1" fill="none" opacity="0.25" />
        <path d="M 92 53 Q 100 51 108 53" stroke={shadow} strokeWidth="1" fill="none" opacity="0.25" />
        <path d="M 108 54 Q 115 52 120 55" stroke={shadow} strokeWidth="1" fill="none" opacity="0.25" />

        {/* Fingernails suggestion */}
        <ellipse cx="78" cy="79" rx="2.5" ry="1.5" fill="rgba(255,220,200,0.4)" />
        <ellipse cx="87" cy="83" rx="2.5" ry="1.5" fill="rgba(255,220,200,0.4)" />
        <ellipse cx="97" cy="86" rx="2.5" ry="1.5" fill="rgba(255,220,200,0.4)" />
        <ellipse cx="107" cy="85" rx="2.5" ry="1.5" fill="rgba(255,220,200,0.4)" />
        <ellipse cx="117" cy="81" rx="2.5" ry="1.5" fill="rgba(255,220,200,0.4)" />
      </g>

      {/* Steam rising - more intense when activating */}
      <g filter="url(#steamBlur)">
        {isActivating ? (
          <>
            <ellipse className="steam-burst" cx="95" cy="50" rx="8" ry="7" fill="rgba(220, 215, 210, 0.6)" style={{ transformOrigin: '95px 50px' }} />
            <ellipse className="steam-burst" cx="105" cy="48" rx="7" ry="6" fill="rgba(210, 205, 200, 0.55)" style={{ transformOrigin: '105px 48px', animationDelay: '0.4s' }} />
            <ellipse className="steam-burst" cx="100" cy="45" rx="9" ry="7" fill="rgba(215, 210, 205, 0.5)" style={{ transformOrigin: '100px 45px', animationDelay: '0.8s' }} />
            <ellipse className="steam-burst" cx="98" cy="42" rx="7" ry="5" fill="rgba(220, 215, 210, 0.45)" style={{ transformOrigin: '98px 42px', animationDelay: '1.2s' }} />
          </>
        ) : (
          <>
            <ellipse className="steam-1" cx="95" cy="50" rx="6" ry="5" fill="rgba(220, 215, 210, 0.5)" style={{ transformOrigin: '95px 50px' }} />
            <ellipse className="steam-2" cx="105" cy="48" rx="5" ry="4" fill="rgba(210, 205, 200, 0.45)" style={{ transformOrigin: '105px 48px' }} />
            <ellipse className="steam-3" cx="100" cy="45" rx="7" ry="5" fill="rgba(215, 210, 205, 0.4)" style={{ transformOrigin: '100px 45px' }} />
            <ellipse className="steam-4" cx="98" cy="42" rx="5" ry="4" fill="rgba(220, 215, 210, 0.35)" style={{ transformOrigin: '98px 42px' }} />
          </>
        )}
      </g>

      {/* Mortar and pestle with herbs */}
      <g transform="translate(18, 118)">
        {/* Mortar shadow */}
        <ellipse cx="22" cy="30" rx="20" ry="5" fill="rgba(0,0,0,0.15)" />
        {/* Mortar bowl */}
        <path d="M 2 25 Q 0 15 8 8 L 36 8 Q 44 15 42 25 Z" fill="#5a5a5a" />
        <ellipse cx="22" cy="8" rx="14" ry="5" fill="#6a6a6a" />
        <ellipse cx="22" cy="25" rx="18" ry="7" fill="#4a4a4a" />
        {/* Ground herb mixture */}
        <ellipse cx="22" cy="11" rx="10" ry="4" fill="#7a6840" />
        <ellipse cx="20" cy="10" rx="3" ry="1.5" fill="#5a5030" opacity="0.7" />
        {/* Pestle */}
        <g className="pestle-motion">
          <rect x="32" y="0" width="6" height="22" rx="3" fill="#8b7355" />
          <ellipse cx="35" cy="22" rx="5" ry="3" fill="#7a6345" />
        </g>
      </g>

      {/* Honey jar */}
      <g transform="translate(155, 125)">
        {/* Jar shadow */}
        <ellipse cx="12" cy="28" rx="14" ry="4" fill="rgba(0,0,0,0.12)" />
        {/* Jar body */}
        <path d="M 2 25 Q 0 15 4 10 L 20 10 Q 24 15 22 25 Z" fill="#c9a06a" />
        <ellipse cx="12" cy="10" rx="8" ry="3" fill="#d4aa7a" />
        {/* Jar rim */}
        <ellipse cx="12" cy="8" rx="6" ry="2" fill="#b89060" />
        {/* Honey visible */}
        <ellipse className="honey-drop" cx="12" cy="12" rx="5" ry="2.5" fill="#daa520" />
        <ellipse cx="10" cy="11" rx="2" ry="1" fill="rgba(255, 220, 120, 0.5)" />
      </g>

      {/* Label */}
      <text x="100" y="156" textAnchor="middle" fill="rgba(100, 60, 30, 0.65)" fontSize="9" fontFamily="serif" fontStyle="italic">
        Drawing Poultice — Figs, Onion & Honey
      </text>
    </svg>
  );
};

// ============================================
// MAIN SELECTOR COMPONENT
// ============================================
export const TreatmentAnimation: React.FC<TreatmentAnimationProps> = ({
  treatmentId,
  skinTone,
  buboLocation = 'groin',
  isActivating = false,
  onActivationComplete
}) => {
  switch (treatmentId) {
    case 'bloodletting':
      return <BloodlettingAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'cupping':
      return <CuppingAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'lancing':
      return <LancingAnimation skinTone={skinTone} location={buboLocation} isActivating={isActivating} />;
    case 'cauterization':
      return <CauterizationAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'purging':
      return <PurgingAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'theriac_admin':
      return <TheriakAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'fumigation':
      return <FumigationAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'leeches':
      return <LeechAnimation skinTone={skinTone} isActivating={isActivating} />;
    case 'poultice':
      return <PoulticeAnimation skinTone={skinTone} isActivating={isActivating} />;
    default:
      return <BloodlettingAnimation skinTone={skinTone} isActivating={isActivating} />;
  }
};

export default TreatmentAnimation;
