import React from 'react';

interface ItemIconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * SVG-based 2D icons for items - performant at small sizes
 * Use for hotbar, tooltips, loot lists, and other UI where 3D is overkill
 */
export const ItemIcon: React.FC<ItemIconProps> = ({ name, size = 32, className }) => {
  const n = name.toLowerCase();

  // Common style for all icons
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    className,
    style: { display: 'block' } as React.CSSProperties,
  };

  // ============== APOTHECARY / MEDICINES ==============

  // Camphor Oil - glass bottle with pale liquid
  if (n.includes('camphor')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="camphor-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f8ff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e0f0f8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d0e8f0" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="camphor-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d5e8f0" />
            <stop offset="100%" stopColor="#a8c8d8" />
          </linearGradient>
        </defs>
        <rect x="9" y="10" width="14" height="16" rx="2" fill="url(#camphor-glass)" stroke="#b8d0e0" strokeWidth="0.5" />
        <rect x="10" y="14" width="12" height="10" rx="1" fill="url(#camphor-liquid)" />
        <rect x="12" y="5" width="8" height="6" rx="1.5" fill="url(#camphor-glass)" stroke="#b8d0e0" strokeWidth="0.5" />
        <ellipse cx="16" cy="4" rx="4" ry="2" fill="#8b7355" />
        <rect x="10" y="10" width="2" height="8" fill="#fff" opacity="0.4" rx="1" />
      </svg>
    );
  }

  // Honey - jar with golden liquid
  if (n.includes('honey')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="honey-jar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8e8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f0e8d0" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="honey-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0b020" />
            <stop offset="50%" stopColor="#d49010" />
            <stop offset="100%" stopColor="#b07808" />
          </linearGradient>
          <radialGradient id="honey-glow" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#ffe060" />
            <stop offset="100%" stopColor="#d4a012" />
          </radialGradient>
        </defs>
        <rect x="7" y="10" width="18" height="17" rx="3" fill="url(#honey-jar)" stroke="#d0c0a0" strokeWidth="0.5" />
        <rect x="8" y="13" width="16" height="12" rx="2" fill="url(#honey-liquid)" />
        <ellipse cx="12" cy="16" rx="3" ry="2" fill="url(#honey-glow)" opacity="0.6" />
        <ellipse cx="16" cy="7" rx="9" ry="3" fill="#f5e6c8" />
        <path d="M12 7 Q16 4 20 7" stroke="#8b7355" strokeWidth="1.5" fill="none" />
        <circle cx="23" cy="18" r="2.5" fill="url(#honey-liquid)" opacity="0.9" />
        <path d="M23 15 L23 18" stroke="#d4a012" strokeWidth="1" />
      </svg>
    );
  }

  // Rose Water - elegant bottle with pink liquid
  if (n.includes('rose water')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="rose-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8fa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffe8f0" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="rose-liquid" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#ffd0e0" />
            <stop offset="100%" stopColor="#f0a0c0" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="18" rx="9" ry="10" fill="url(#rose-glass)" stroke="#e8c0d0" strokeWidth="0.5" />
        <ellipse cx="16" cy="18" rx="7" ry="8" fill="url(#rose-liquid)" />
        <ellipse cx="13" cy="15" rx="2" ry="3" fill="#fff" opacity="0.4" />
        <rect x="14" y="5" width="4" height="8" rx="1" fill="url(#rose-glass)" stroke="#e8c0d0" strokeWidth="0.5" />
        <ellipse cx="16" cy="3" rx="3" ry="2" fill="#fff0f5" stroke="#e8c0d0" strokeWidth="0.5" />
      </svg>
    );
  }

  // Musk Perfume - ornate bottle
  if (n.includes('perfume') || n.includes('musk')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="musk-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8f0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f8e8d8" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="musk-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4a030" />
            <stop offset="100%" stopColor="#906010" />
          </linearGradient>
          <linearGradient id="gold-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0d080" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#a08020" />
          </linearGradient>
        </defs>
        <polygon points="10,25 11,10 21,10 22,25" fill="url(#musk-glass)" stroke="#d8c8a8" strokeWidth="0.5" />
        <polygon points="11,23 12,12 20,12 21,23" fill="url(#musk-liquid)" />
        <rect x="10" y="10" width="12" height="2" fill="url(#gold-accent)" rx="0.5" />
        <rect x="14" y="5" width="4" height="6" rx="1" fill="url(#musk-glass)" stroke="#d8c8a8" strokeWidth="0.5" />
        <polygon points="16,2 14,5 18,5" fill="url(#gold-accent)" />
        <rect x="11" y="10" width="1.5" height="10" fill="#fff" opacity="0.3" />
      </svg>
    );
  }

  // Henna Powder - bowl with orange powder
  if (n.includes('henna')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="henna-bowl" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4a070" />
            <stop offset="100%" stopColor="#a07040" />
          </linearGradient>
          <radialGradient id="henna-powder" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#e06830" />
            <stop offset="70%" stopColor="#c04820" />
            <stop offset="100%" stopColor="#a03818" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="24" rx="11" ry="5" fill="url(#henna-bowl)" />
        <ellipse cx="16" cy="22" rx="10" ry="6" fill="#8a6040" />
        <ellipse cx="16" cy="18" rx="8" ry="5" fill="url(#henna-powder)" />
        <ellipse cx="14" cy="16" rx="2" ry="1.5" fill="#e87848" opacity="0.7" />
        <ellipse cx="19" cy="17" rx="1.5" ry="1" fill="#d05828" opacity="0.6" />
      </svg>
    );
  }

  // Kohl Powder - small pot with black powder
  if (n.includes('kohl') && !n.includes('container')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="kohl-pot" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a3530" />
            <stop offset="100%" stopColor="#1a1510" />
          </linearGradient>
          <radialGradient id="kohl-powder" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
        </defs>
        <rect x="9" y="12" width="14" height="15" rx="2" fill="url(#kohl-pot)" />
        <ellipse cx="16" cy="12" rx="7" ry="2.5" fill="#4a4035" />
        <ellipse cx="16" cy="13" rx="5.5" ry="2" fill="url(#kohl-powder)" />
        <line x1="20" y1="8" x2="25" y2="3" stroke="#3a3530" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="25" cy="3" r="1" fill="#1a1a1a" />
        <rect x="10" y="18" width="1" height="6" fill="#5a5045" opacity="0.5" rx="0.5" />
      </svg>
    );
  }

  // Silver Kohl Container
  if (n.includes('kohl container')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="silver-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8e8e8" />
            <stop offset="30%" stopColor="#c0c0c0" />
            <stop offset="70%" stopColor="#a8a8a8" />
            <stop offset="100%" stopColor="#909090" />
          </linearGradient>
          <linearGradient id="silver-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="9" y="10" width="14" height="17" rx="2" fill="url(#silver-body)" />
        <rect x="10" y="12" width="3" height="12" fill="url(#silver-highlight)" rx="1" />
        <ellipse cx="16" cy="10" rx="7" ry="2.5" fill="#d0d0d0" />
        <rect x="11" y="4" width="10" height="7" rx="2" fill="url(#silver-body)" />
        <ellipse cx="16" cy="3" rx="2" ry="1.5" fill="#e8e8e8" />
        <line x1="9" y1="17" x2="23" y2="17" stroke="#808080" strokeWidth="0.5" />
      </svg>
    );
  }

  // Opium Paste - round pot with dark paste
  if (n.includes('opium')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="opium-pot" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a07820" />
            <stop offset="100%" stopColor="#705010" />
          </linearGradient>
          <radialGradient id="opium-paste" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#3a2518" />
            <stop offset="100%" stopColor="#1a0808" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="22" rx="11" ry="7" fill="url(#opium-pot)" />
        <ellipse cx="16" cy="18" rx="9" ry="8" fill="#8a6014" />
        <ellipse cx="16" cy="15" rx="7" ry="4" fill="url(#opium-paste)" />
        <ellipse cx="14" cy="14" rx="2" ry="1" fill="#4a3020" opacity="0.8" />
        <ellipse cx="26" cy="24" rx="4" ry="3" fill="url(#opium-pot)" />
      </svg>
    );
  }

  // Theriac Compound - fancy medicine bottle
  if (n.includes('theriac')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="theriac-jar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a6090" />
            <stop offset="50%" stopColor="#1a4a6e" />
            <stop offset="100%" stopColor="#103050" />
          </linearGradient>
          <linearGradient id="gold-band" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f0d080" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#a08020" />
          </linearGradient>
        </defs>
        <rect x="7" y="8" width="18" height="20" rx="2" fill="url(#theriac-jar)" />
        <rect x="7" y="12" width="18" height="2" fill="url(#gold-band)" />
        <rect x="7" y="22" width="18" height="2" fill="url(#gold-band)" />
        <circle cx="16" cy="17" r="3.5" fill="url(#gold-band)" />
        <rect x="12" y="4" width="8" height="5" rx="1" fill="url(#theriac-jar)" />
        <ellipse cx="16" cy="3" rx="5" ry="2" fill="#8b0000" />
        <circle cx="16" cy="3" r="2" fill="#6a0000" />
        <rect x="8" y="8" width="2" height="16" fill="#4080b0" opacity="0.3" rx="1" />
      </svg>
    );
  }

  // Saffron Threads - glass jar with red threads
  if (n.includes('saffron')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="saffron-jar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8f0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f8f0e8" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="saffron-thread" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e04010" />
            <stop offset="100%" stopColor="#a02008" />
          </linearGradient>
        </defs>
        <rect x="9" y="10" width="14" height="18" rx="2" fill="url(#saffron-jar)" stroke="#d8c8a8" strokeWidth="0.5" />
        <rect x="10" y="14" width="12" height="12" rx="1" fill="#c83010" opacity="0.9" />
        {[[12,11], [15,10], [18,11], [14,12], [17,12]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="5" fill="url(#saffron-thread)" rx="0.5" />
        ))}
        <ellipse cx="16" cy="8" rx="5" ry="2.5" fill="#a08060" />
        <rect x="10" y="10" width="1.5" height="14" fill="#fff" opacity="0.3" rx="0.5" />
      </svg>
    );
  }

  // Aloe Vera - green succulent leaves
  if (n.includes('aloe')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="aloe-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7ab060" />
            <stop offset="50%" stopColor="#5a9048" />
            <stop offset="100%" stopColor="#407030" />
          </linearGradient>
          <linearGradient id="aloe-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#90c878" />
            <stop offset="100%" stopColor="#5a9048" />
          </linearGradient>
        </defs>
        <polygon points="16,2 11,28 21,28" fill="url(#aloe-leaf)" />
        <polygon points="16,4 13,26 19,26" fill="url(#aloe-highlight)" opacity="0.5" />
        <polygon points="8,6 4,26 12,26" fill="url(#aloe-leaf)" opacity="0.9" />
        <polygon points="24,6 20,26 28,26" fill="url(#aloe-leaf)" opacity="0.9" />
        <polygon points="6,10 4,24 10,24" fill="#6aa858" opacity="0.7" />
        <polygon points="26,10 22,24 28,24" fill="#6aa858" opacity="0.7" />
      </svg>
    );
  }

  // Pomegranate Seeds - bowl with ruby seeds
  if (n.includes('pomegranate')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="pom-bowl" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a07820" />
            <stop offset="100%" stopColor="#604810" />
          </linearGradient>
          <radialGradient id="pom-seed" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#d03030" />
            <stop offset="100%" stopColor="#801010" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="25" rx="11" ry="5" fill="url(#pom-bowl)" />
        <ellipse cx="16" cy="23" rx="10" ry="6" fill="#5a3810" />
        {[[11,18], [16,16], [21,18], [13,20], [19,20], [16,22], [10,21], [22,21]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2.5" ry="2" fill="url(#pom-seed)" />
        ))}
        {[[12,17], [17,15], [14,19]].map(([x, y], i) => (
          <ellipse key={`h${i}`} cx={x} cy={y} rx="0.8" ry="0.6" fill="#ff6060" opacity="0.6" />
        ))}
      </svg>
    );
  }

  // Bezoar Stone - rough layered stone
  if (n.includes('bezoar')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="bezoar-stone" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#7a6a55" />
            <stop offset="100%" stopColor="#3a3025" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="17" rx="11" ry="10" fill="url(#bezoar-stone)" />
        <ellipse cx="18" cy="14" rx="6" ry="4" fill="#8a7a65" opacity="0.6" />
        <ellipse cx="12" cy="20" rx="5" ry="3" fill="#6a5a45" opacity="0.5" />
        <ellipse cx="20" cy="12" rx="2" ry="1.5" fill="#9a8a75" opacity="0.7" />
        <path d="M10 15 Q14 12 18 15" stroke="#5a4a35" strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M12 20 Q16 18 20 21" stroke="#5a4a35" strokeWidth="1" fill="none" opacity="0.5" />
      </svg>
    );
  }

  // Ambergris - waxy irregular lump
  if (n.includes('ambergris')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="amber-lump" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#6a6560" />
            <stop offset="100%" stopColor="#3a3530" />
          </radialGradient>
          <linearGradient id="amber-streak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9a9590" />
            <stop offset="100%" stopColor="#6a6560" />
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="18" rx="12" ry="10" fill="url(#amber-lump)" />
        <rect x="8" y="13" width="10" height="3" rx="1.5" fill="url(#amber-streak)" transform="rotate(-15 13 14)" />
        <rect x="14" y="18" width="8" height="2.5" rx="1" fill="url(#amber-streak)" transform="rotate(10 18 19)" />
        <ellipse cx="20" cy="11" rx="2.5" ry="2" fill="#5a5550" />
        <ellipse cx="10" cy="20" rx="2" ry="1.5" fill="#7a7570" opacity="0.6" />
      </svg>
    );
  }

  // Mint Leaves - fresh green bundle
  if (n.includes('mint')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="mint-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#50a850" />
            <stop offset="100%" stopColor="#308030" />
          </linearGradient>
          <linearGradient id="mint-stem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#408040" />
            <stop offset="100%" stopColor="#306030" />
          </linearGradient>
        </defs>
        <rect x="14" y="20" width="4" height="10" rx="1" fill="url(#mint-stem)" />
        <ellipse cx="16" cy="21" rx="3" ry="1.5" fill="#8b7355" />
        {[
          [10, 12, 5, 6, -15], [16, 8, 5, 7, 0], [22, 12, 5, 6, 15],
          [12, 6, 4, 5, -10], [20, 6, 4, 5, 10], [16, 14, 4, 5, 5]
        ].map(([cx, cy, rx, ry, rot], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#mint-leaf)" transform={`rotate(${rot} ${cx} ${cy})`} />
        ))}
        {[[11, 11], [17, 7], [21, 11]].map(([x, y], i) => (
          <ellipse key={`h${i}`} cx={x} cy={y} rx="1.5" ry="2" fill="#70c070" opacity="0.5" />
        ))}
      </svg>
    );
  }

  // Incense / Resin / Myrrh - box with chunks
  if (n.includes('incense') || n.includes('resin') || n.includes('myrrh')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="incense-box" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6a4020" />
            <stop offset="100%" stopColor="#3a2010" />
          </linearGradient>
          <radialGradient id="resin-chunk" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#c06030" />
            <stop offset="100%" stopColor="#803018" />
          </radialGradient>
        </defs>
        <rect x="5" y="18" width="22" height="11" rx="1" fill="url(#incense-box)" />
        <rect x="6" y="16" width="20" height="4" fill="#4a2e18" />
        {[[9,13], [15,11], [21,13], [12,15], [18,14]].map(([x, y], i) => (
          <polygon key={i} points={`${x},${y} ${x-3},${y+5} ${x+3},${y+5}`} fill="url(#resin-chunk)" />
        ))}
        {[[10,14], [16,12], [20,14]].map(([x, y], i) => (
          <ellipse key={`g${i}`} cx={x} cy={y} rx="1" ry="0.8" fill="#e08050" opacity="0.5" />
        ))}
      </svg>
    );
  }

  // Generic spices - cloth pouch
  if (n.includes('cumin') || n.includes('pepper') || n.includes('cardamom') || n.includes('coriander') || n.includes('spice')) {
    const spiceColor = n.includes('pepper') ? '#2a2a25' :
                       n.includes('cumin') ? '#8b6914' :
                       n.includes('cardamom') ? '#6b8e5a' : '#b8956a';
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="pouch-body" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#d4b896" />
            <stop offset="100%" stopColor="#a08060" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="20" rx="11" ry="9" fill="url(#pouch-body)" />
        <polygon points="11,11 16,5 21,11" fill="#b8986a" />
        <ellipse cx="16" cy="11" rx="5" ry="2.5" fill="#6a5a40" />
        <path d="M13 11 Q16 9 19 11" stroke="#8a7a60" strokeWidth="1" fill="none" />
        <ellipse cx="16" cy="7" rx="3.5" ry="2.5" fill={spiceColor} />
        <ellipse cx="14" cy="18" rx="4" ry="3" fill="#c4a882" opacity="0.4" />
      </svg>
    );
  }

  // ============== FOOD ==============

  // Sugar Loaf - white cone
  if (n.includes('sugar')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="sugar-cone" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8f8f0" />
            <stop offset="100%" stopColor="#f0f0e8" />
          </linearGradient>
          <linearGradient id="sugar-wrap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8d8b8" />
            <stop offset="100%" stopColor="#c4b090" />
          </linearGradient>
        </defs>
        <polygon points="16,3 7,28 25,28" fill="url(#sugar-cone)" />
        <rect x="8" y="22" width="16" height="7" rx="1" fill="url(#sugar-wrap)" />
        <rect x="17" y="8" width="2" height="2" fill="#fff" />
        <rect x="12" y="12" width="2" height="2" fill="#fff" />
        <rect x="15" y="16" width="1.5" height="1.5" fill="#fff" />
        <polygon points="16,3 12,15 20,15" fill="#fff" opacity="0.3" />
      </svg>
    );
  }

  // Pistachio Nuts
  if (n.includes('pistachio')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="pist-shell" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4b896" />
            <stop offset="100%" stopColor="#a08060" />
          </linearGradient>
          <radialGradient id="pist-nut" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#90c050" />
            <stop offset="100%" stopColor="#609030" />
          </radialGradient>
        </defs>
        {[[9,13], [16,10], [23,13], [11,20], [18,17], [14,15], [20,21]].map(([x, y], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="3.5" ry="3" fill="url(#pist-shell)" />
            <ellipse cx={x+1} cy={y-0.5} rx="2" ry="2" fill="url(#pist-nut)" />
          </g>
        ))}
      </svg>
    );
  }

  // Chickpeas
  if (n.includes('chickpea')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="chickpea" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#e8d0a8" />
            <stop offset="100%" stopColor="#c4a878" />
          </radialGradient>
        </defs>
        {[[9,13], [16,11], [23,13], [11,19], [17,17], [13,15], [21,20], [16,22], [7,17]].map(([x, y], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="3.5" ry="3" fill="url(#chickpea)" />
            <ellipse cx={x-0.5} cy={y-0.5} rx="1" ry="0.8" fill="#f0e0c0" opacity="0.5" />
          </g>
        ))}
      </svg>
    );
  }

  // Sesame Oil - ceramic bottle
  if (n.includes('sesame')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="sesame-pot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c09060" />
            <stop offset="50%" stopColor="#a07040" />
            <stop offset="100%" stopColor="#805028" />
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="24" rx="9" ry="5" fill="url(#sesame-pot)" />
        <rect x="8" y="12" width="16" height="14" rx="2" fill="url(#sesame-pot)" />
        <rect x="12" y="5" width="8" height="9" rx="1.5" fill="#8a6030" />
        <ellipse cx="16" cy="4" rx="4" ry="2" fill="#8b7355" />
        <line x1="8" y1="19" x2="24" y2="19" stroke="#6a4020" strokeWidth="1" />
        <rect x="9" y="13" width="2" height="10" fill="#d0a070" opacity="0.3" rx="1" />
      </svg>
    );
  }

  // Olives
  if (n.includes('olive') && !n.includes('oil')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="olive-fruit" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#5a7a48" />
            <stop offset="100%" stopColor="#3a5230" />
          </radialGradient>
        </defs>
        <ellipse cx="11" cy="15" rx="6" ry="5" fill="url(#olive-fruit)" />
        <ellipse cx="21" cy="17" rx="6" ry="5" fill="url(#olive-fruit)" />
        <ellipse cx="16" cy="22" rx="5" ry="4" fill="url(#olive-fruit)" />
        {[[9,13], [19,15], [14,20]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="1.5" ry="1" fill="#7a9a68" opacity="0.5" />
        ))}
      </svg>
    );
  }

  // Lemons
  if (n.includes('lemon')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="lemon-fruit" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#f0d060" />
            <stop offset="100%" stopColor="#c0a030" />
          </radialGradient>
        </defs>
        <ellipse cx="13" cy="16" rx="8" ry="7" fill="url(#lemon-fruit)" />
        <ellipse cx="22" cy="18" rx="6" ry="5" fill="url(#lemon-fruit)" />
        <ellipse cx="10" cy="13" rx="2" ry="1.5" fill="#ffe080" opacity="0.6" />
        <ellipse cx="20" cy="15" rx="1.5" ry="1" fill="#ffe080" opacity="0.5" />
      </svg>
    );
  }

  // Figs / Dates / Apricots
  if (n.includes('fig') || n.includes('dates') || n.includes('apricot')) {
    const color1 = n.includes('apricot') ? '#e0a060' : '#8a5030';
    const color2 = n.includes('apricot') ? '#c08040' : '#603820';
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="fruit-grad" cx="35%" cy="35%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </radialGradient>
        </defs>
        <ellipse cx="11" cy="15" rx="6" ry="7" fill="url(#fruit-grad)" />
        <ellipse cx="21" cy="17" rx="6" ry="6" fill="url(#fruit-grad)" />
        <ellipse cx="16" cy="23" rx="5" ry="5" fill="url(#fruit-grad)" opacity="0.9" />
        {[[9,13], [19,15]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="1.5" ry="2" fill="#fff" opacity="0.2" />
        ))}
      </svg>
    );
  }

  // ============== TOOLS & OBJECTS ==============

  // Iron Key
  if (n.includes('key')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="key-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a0a0a0" />
            <stop offset="50%" stopColor="#707070" />
            <stop offset="100%" stopColor="#505050" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="7" r="5" fill="none" stroke="url(#key-metal)" strokeWidth="3" />
        <rect x="14" y="11" width="4" height="16" rx="1" fill="url(#key-metal)" />
        <rect x="18" y="23" width="5" height="2.5" rx="0.5" fill="url(#key-metal)" />
        <rect x="9" y="20" width="5" height="2.5" rx="0.5" fill="url(#key-metal)" />
        <ellipse cx="16" cy="7" rx="2" ry="2" fill="none" stroke="#909090" strokeWidth="1" />
      </svg>
    );
  }

  // Copper Amulet
  if (n.includes('amulet')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="copper-disc" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#d49050" />
            <stop offset="100%" stopColor="#905020" />
          </radialGradient>
          <radialGradient id="copper-center" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#f0c080" />
            <stop offset="100%" stopColor="#c08040" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="18" r="10" fill="url(#copper-disc)" />
        <circle cx="16" cy="18" r="7" fill="url(#copper-center)" />
        <circle cx="16" cy="18" r="3.5" fill="#d4af37" />
        <circle cx="16" cy="5" r="3.5" fill="none" stroke="url(#copper-disc)" strokeWidth="2" />
        <ellipse cx="13" cy="15" rx="2" ry="3" fill="#f0d090" opacity="0.3" />
      </svg>
    );
  }

  // Prayer Beads
  if (n.includes('prayer bead') || n.includes('beads')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="bead" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#7a5030" />
            <stop offset="100%" stopColor="#3a2010" />
          </radialGradient>
        </defs>
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const x = 16 + Math.cos(angle) * 9;
          const y = 16 + Math.sin(angle) * 9;
          return <circle key={i} cx={x} cy={y} r="3" fill="url(#bead)" />;
        })}
        <circle cx="16" cy="5" r="3.5" fill="#2a1508" />
        <rect x="15" y="0" width="2" height="6" fill="#8b4513" rx="0.5" />
        <polygon points="14,0 16,-2 18,0" fill="#a05520" />
      </svg>
    );
  }

  // Writing Reed / Calamus
  if (n.includes('writing reed') || n.includes('reed') || n.includes('calamus')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="reed-shaft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4b888" />
            <stop offset="50%" stopColor="#c4a878" />
            <stop offset="100%" stopColor="#a08858" />
          </linearGradient>
        </defs>
        <rect x="14" y="3" width="4" height="24" rx="1.5" fill="url(#reed-shaft)" transform="rotate(8 16 16)" />
        <polygon points="14,27 16,31 18,27" fill="#705838" transform="rotate(8 16 16)" />
        <ellipse cx="16" cy="9" rx="2.5" ry="1" fill="#b09868" transform="rotate(8 16 16)" />
        <ellipse cx="16" cy="17" rx="2.5" ry="1" fill="#b09868" transform="rotate(8 16 16)" />
        <rect x="14.5" y="4" width="1" height="20" fill="#e0c898" opacity="0.4" transform="rotate(8 16 16)" />
      </svg>
    );
  }

  // Geometric Compass
  if (n.includes('compass') || n.includes('geometric')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="compass-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4b080" />
            <stop offset="50%" stopColor="#b09050" />
            <stop offset="100%" stopColor="#806030" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="5" r="3.5" fill="url(#compass-metal)" />
        <line x1="16" y1="7" x2="9" y2="28" stroke="url(#compass-metal)" strokeWidth="3" strokeLinecap="round" />
        <line x1="16" y1="7" x2="23" y2="28" stroke="url(#compass-metal)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="9" cy="28" r="1.5" fill="#404040" />
        <rect x="21" y="26" width="4" height="3" rx="1" fill="#8a6b4f" />
        <circle cx="16" cy="5" r="1.5" fill="#e0c090" />
      </svg>
    );
  }

  // Aleppo Soap
  if (n.includes('soap')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="soap-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c0a878" />
            <stop offset="100%" stopColor="#908058" />
          </linearGradient>
          <linearGradient id="soap-laurel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7a9a60" />
            <stop offset="100%" stopColor="#5a7a40" />
          </linearGradient>
        </defs>
        <rect x="5" y="11" width="22" height="14" rx="2" fill="url(#soap-body)" />
        <rect x="5" y="21" width="22" height="4" rx="1" fill="url(#soap-laurel)" />
        <ellipse cx="16" cy="16" rx="5" ry="4" fill="#8a7a5a" opacity="0.5" />
        <rect x="6" y="12" width="3" height="10" fill="#d0c098" opacity="0.3" rx="1" />
      </svg>
    );
  }

  // Indigo Dye Cake
  if (n.includes('indigo') || n.includes('dye cake')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="indigo-block" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a3890" />
            <stop offset="50%" stopColor="#1a2870" />
            <stop offset="100%" stopColor="#101850" />
          </linearGradient>
        </defs>
        <rect x="5" y="11" width="22" height="14" rx="1" fill="url(#indigo-block)" />
        <rect x="7" y="8" width="8" height="5" fill="#303898" rx="0.5" />
        <rect x="17" y="9" width="6" height="4" fill="#3848a8" rx="0.5" />
        <ellipse cx="16" cy="27" rx="11" ry="2" fill="#4050b0" opacity="0.6" />
        <rect x="6" y="12" width="2" height="10" fill="#4050b0" opacity="0.3" rx="0.5" />
      </svg>
    );
  }

  // Leather Sandals
  if (n.includes('sandal')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="sandal-sole" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9a6838" />
            <stop offset="100%" stopColor="#6a4828" />
          </linearGradient>
          <linearGradient id="sandal-strap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#705028" />
            <stop offset="100%" stopColor="#4a3018" />
          </linearGradient>
        </defs>
        <ellipse cx="10" cy="18" rx="5.5" ry="10" fill="url(#sandal-sole)" />
        <ellipse cx="22" cy="18" rx="5.5" ry="10" fill="url(#sandal-sole)" />
        <rect x="6" y="12" width="8" height="2.5" rx="1" fill="url(#sandal-strap)" />
        <rect x="18" y="12" width="8" height="2.5" rx="1" fill="url(#sandal-strap)" />
        <rect x="6" y="20" width="8" height="2.5" rx="1" fill="url(#sandal-strap)" />
        <rect x="18" y="20" width="8" height="2.5" rx="1" fill="url(#sandal-strap)" />
      </svg>
    );
  }

  // ============== TEXTILES & CLOTHING ==============

  // Rug / Carpet
  if (n.includes('rug') || n.includes('carpet')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="rug-base" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a878" />
            <stop offset="100%" stopColor="#a07848" />
          </linearGradient>
        </defs>
        <rect x="3" y="9" width="26" height="18" rx="1" fill="url(#rug-base)" />
        <rect x="5" y="11" width="22" height="14" fill="#8a5838" />
        <rect x="7" y="13" width="18" height="10" fill="#c09058" />
        <line x1="3" y1="13" x2="29" y2="13" stroke="#5a3828" strokeWidth="1" />
        <line x1="3" y1="23" x2="29" y2="23" stroke="#5a3828" strokeWidth="1" />
        {[9, 14, 19, 24].map((x, i) => (
          <line key={i} x1={x} y1="11" x2={x} y2="25" stroke="#7a4838" strokeWidth="0.5" />
        ))}
      </svg>
    );
  }

  // Cloth / Linen / Headscarf / Cloak
  if (n.includes('linen') || n.includes('cloth') || n.includes('headscarf') || n.includes('cloak') || n.includes('shroud')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="cloth-fold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0d0b8" />
            <stop offset="50%" stopColor="#c8b8a0" />
            <stop offset="100%" stopColor="#b0a088" />
          </linearGradient>
        </defs>
        <rect x="3" y="7" width="26" height="20" rx="1" fill="url(#cloth-fold)" />
        <rect x="12" y="11" width="14" height="12" fill="#a09078" opacity="0.6" />
        <path d="M3 13 Q10 11 17 13" stroke="#b8a890" strokeWidth="1" fill="none" />
        <path d="M3 19 Q12 17 21 19" stroke="#b8a890" strokeWidth="1" fill="none" />
        <rect x="4" y="8" width="3" height="16" fill="#f0e0c8" opacity="0.3" rx="1" />
      </svg>
    );
  }

  // ============== CONTAINERS ==============

  // Waterskin
  if (n.includes('waterskin')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="waterskin-body" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#c4a878" />
            <stop offset="100%" stopColor="#806040" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="19" rx="11" ry="10" fill="url(#waterskin-body)" />
        <rect x="12" y="5" width="8" height="8" rx="2" fill="#8a6848" />
        <ellipse cx="16" cy="14" rx="7" ry="3" fill="#8a6848" opacity="0.6" />
        <ellipse cx="12" cy="16" rx="3" ry="4" fill="#d4b898" opacity="0.3" />
      </svg>
    );
  }

  // Satchel / Bag
  if (n.includes('satchel') || n.includes('bag')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="bag-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4a878" />
            <stop offset="100%" stopColor="#907050" />
          </linearGradient>
        </defs>
        <rect x="5" y="12" width="22" height="16" rx="2" fill="url(#bag-body)" />
        <rect x="5" y="10" width="22" height="6" rx="2" fill="#8a6848" />
        <ellipse cx="16" cy="5" rx="9" ry="4" fill="none" stroke="#8a6848" strokeWidth="2.5" />
        <rect x="6" y="13" width="3" height="12" fill="#d4b898" opacity="0.3" rx="1" />
      </svg>
    );
  }

  // Coin Purse
  if (n.includes('coin purse')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="purse-body" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#d4b898" />
            <stop offset="100%" stopColor="#907858" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="19" rx="10" ry="9" fill="url(#purse-body)" />
        <rect x="11" y="7" width="10" height="7" rx="2" fill="#8a6848" />
        <path d="M13 10 Q16 8 19 10" stroke="#5a4030" strokeWidth="1.5" fill="none" />
        <ellipse cx="12" cy="17" rx="3" ry="4" fill="#e4c8a8" opacity="0.3" />
      </svg>
    );
  }

  // Basket
  if (n.includes('basket')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="basket-weave" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4b888" />
            <stop offset="100%" stopColor="#a08858" />
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="26" rx="12" ry="4" fill="url(#basket-weave)" />
        <rect x="5" y="11" width="22" height="16" rx="1" fill="#c0a070" />
        <ellipse cx="16" cy="11" rx="11" ry="4" fill="url(#basket-weave)" />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={i} x1={7 + i * 4} y1="11" x2={7 + i * 4} y2="26" stroke="#8a7048" strokeWidth="1" />
        ))}
        {[0, 1, 2].map(i => (
          <line key={`h${i}`} x1="5" y1={15 + i * 5} x2="27" y2={15 + i * 5} stroke="#8a7048" strokeWidth="0.5" />
        ))}
      </svg>
    );
  }

  // ============== WEAPONS ==============

  // Dagger
  if (n.includes('dagger')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d0d0d0" />
            <stop offset="50%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>
          <linearGradient id="handle" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5a3a20" />
            <stop offset="100%" stopColor="#3a2010" />
          </linearGradient>
        </defs>
        <polygon points="16,1 13,18 19,18" fill="url(#blade)" />
        <rect x="12" y="18" width="8" height="3.5" rx="0.5" fill="#8a6848" />
        <rect x="14" y="20" width="4" height="10" rx="1" fill="url(#handle)" />
        <line x1="16" y1="3" x2="16" y2="16" stroke="#e8e8e8" strokeWidth="0.5" opacity="0.5" />
      </svg>
    );
  }

  // Scimitar
  if (n.includes('scimitar')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="scim-blade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d0d0d0" />
            <stop offset="50%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>
        </defs>
        <path d="M 6 3 Q 18 8 22 20 L 20 21 Q 16 10 6 6 Z" fill="url(#scim-blade)" />
        <rect x="18" y="19" width="9" height="3.5" rx="0.5" fill="#8a6848" />
        <rect x="20" y="21" width="4" height="9" rx="1" fill="#5a3a20" />
        <path d="M 7 4 Q 17 8 20 18" stroke="#e8e8e8" strokeWidth="0.5" fill="none" opacity="0.4" />
      </svg>
    );
  }

  // ============== LIGHT SOURCES ==============

  // Candles
  if (n.includes('candle')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="candle-wax" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8f0e0" />
            <stop offset="100%" stopColor="#e8e0d0" />
          </linearGradient>
          <radialGradient id="flame" cx="50%" cy="70%">
            <stop offset="0%" stopColor="#fff8e0" />
            <stop offset="40%" stopColor="#ffc040" />
            <stop offset="100%" stopColor="#ff6010" />
          </radialGradient>
        </defs>
        {[[9, 14], [16, 11], [23, 14]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 2.5} y={y} width="5" height="15" rx="1" fill="url(#candle-wax)" />
            <ellipse cx={x} cy={y - 3} rx="2.5" ry="4" fill="url(#flame)" />
          </g>
        ))}
      </svg>
    );
  }

  // Lamp
  if (n.includes('lamp')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="lamp-body" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#d4b080" />
            <stop offset="100%" stopColor="#907040" />
          </radialGradient>
          <radialGradient id="lamp-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fff0c0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffa030" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="18" rx="10" ry="8" fill="url(#lamp-body)" />
        <rect x="20" y="15" width="9" height="5" rx="1" fill="#8a6848" />
        <rect x="12" y="7" width="8" height="7" rx="2" fill="#8a6848" />
        <ellipse cx="16" cy="5" rx="4" ry="3" fill="url(#lamp-glow)" />
        <ellipse cx="12" cy="15" rx="3" ry="4" fill="#e4c898" opacity="0.3" />
      </svg>
    );
  }

  // ============== MISC ==============

  // Manuscript / Book
  if (n.includes('manuscript') || n.includes('book') || n.includes('ledger')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="book-cover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a6040" />
            <stop offset="100%" stopColor="#5a3820" />
          </linearGradient>
          <linearGradient id="book-pages" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8f0e0" />
            <stop offset="100%" stopColor="#e8e0d0" />
          </linearGradient>
        </defs>
        <rect x="5" y="9" width="22" height="18" rx="1" fill="url(#book-cover)" />
        <rect x="7" y="7" width="20" height="18" rx="1" fill="url(#book-pages)" />
        <line x1="9" y1="11" x2="25" y2="11" stroke="#a08060" strokeWidth="0.7" />
        <line x1="9" y1="15" x2="23" y2="15" stroke="#a08060" strokeWidth="0.7" />
        <line x1="9" y1="19" x2="21" y2="19" stroke="#a08060" strokeWidth="0.7" />
        <rect x="5" y="9" width="3" height="18" fill="#6a4030" rx="0.5" />
      </svg>
    );
  }

  // Mirror
  if (n.includes('mirror')) {
    return (
      <svg {...svgProps}>
        <defs>
          <radialGradient id="mirror-face" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e0e8f0" />
            <stop offset="100%" stopColor="#c0c8d0" />
          </radialGradient>
          <linearGradient id="mirror-frame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4b080" />
            <stop offset="100%" stopColor="#906030" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="13" r="11" fill="url(#mirror-frame)" />
        <circle cx="16" cy="13" r="9" fill="url(#mirror-face)" />
        <ellipse cx="12" cy="10" rx="3" ry="4" fill="#fff" opacity="0.5" />
        <rect x="14" y="22" width="4" height="9" rx="1" fill="url(#mirror-frame)" />
      </svg>
    );
  }

  // Bell
  if (n.includes('bell')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="bell-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4b080" />
            <stop offset="50%" stopColor="#b09060" />
            <stop offset="100%" stopColor="#806030" />
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="7" rx="4" ry="4" fill="url(#bell-body)" />
        <path d="M 7 25 Q 7 11 16 9 Q 25 11 25 25 Z" fill="url(#bell-body)" />
        <ellipse cx="16" cy="22" rx="3" ry="2.5" fill="#705030" />
        <ellipse cx="16" cy="3" rx="2.5" ry="2" fill="#c0a070" />
        <ellipse cx="11" cy="16" rx="2" ry="5" fill="#e8d0a0" opacity="0.3" />
      </svg>
    );
  }

  // Pottery / Ceramic
  if (n.includes('pottery') || n.includes('ceramic')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="pottery-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a878" />
            <stop offset="100%" stopColor="#906848" />
          </linearGradient>
        </defs>
        <rect x="7" y="13" width="18" height="13" rx="2" fill="url(#pottery-body)" transform="rotate(-5 16 20)" />
        <rect x="11" y="9" width="10" height="7" rx="1" fill="#a07848" transform="rotate(-5 16 12)" />
        <rect x="8" y="14" width="3" height="10" fill="#e4c8a8" opacity="0.3" rx="1" />
      </svg>
    );
  }

  // Rope / Twine
  if (n.includes('rope') || n.includes('twine')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="rope-fiber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b09060" />
            <stop offset="100%" stopColor="#806040" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="11" fill="none" stroke="url(#rope-fiber)" strokeWidth="5" />
        <circle cx="16" cy="16" r="11" fill="none" stroke="#c0a070" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    );
  }

  // ============== FALLBACK BY CATEGORY ==============

  // Default Apothecary item - jar
  if (n.includes('apothecary') || n.includes('medicine') || n.includes('remedy')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="jar-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4b898" />
            <stop offset="100%" stopColor="#a08868" />
          </linearGradient>
        </defs>
        <rect x="7" y="10" width="18" height="18" rx="2" fill="url(#jar-body)" />
        <ellipse cx="16" cy="8" rx="7" ry="3" fill="#8a6848" />
        <rect x="9" y="14" width="14" height="10" rx="1" fill="#8a6848" opacity="0.3" />
      </svg>
    );
  }

  // Default Metalsmith item - tool
  if (n.includes('metal') || n.includes('iron') || n.includes('steel') || n.includes('bronze')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="metal-tool" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#606060" />
          </linearGradient>
        </defs>
        <rect x="14" y="3" width="4" height="20" rx="1" fill="url(#metal-tool)" />
        <rect x="10" y="21" width="12" height="8" rx="1" fill="#5a3a20" />
      </svg>
    );
  }

  // Default Textile item - folded cloth
  if (n.includes('textile') || n.includes('silk') || n.includes('cotton') || n.includes('wool') || n.includes('belt') || n.includes('sash')) {
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id="textile-fold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d8c8b0" />
            <stop offset="100%" stopColor="#a89878" />
          </linearGradient>
        </defs>
        <rect x="3" y="9" width="26" height="18" rx="1" fill="url(#textile-fold)" />
        <path d="M3 15 Q12 13 21 15" stroke="#c0b098" strokeWidth="1" fill="none" />
        <path d="M3 21 Q14 19 25 21" stroke="#c0b098" strokeWidth="1" fill="none" />
        <rect x="4" y="10" width="3" height="14" fill="#e8d8c0" opacity="0.4" rx="1" />
      </svg>
    );
  }

  // ============== GENERIC FALLBACK ==============
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="default-box" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4b898" />
          <stop offset="100%" stopColor="#a08868" />
        </linearGradient>
      </defs>
      <rect x="5" y="8" width="22" height="18" rx="2" fill="url(#default-box)" />
      <ellipse cx="16" cy="6" rx="7" ry="3" fill="#8a6848" />
      <ellipse cx="16" cy="16" rx="5" ry="4" fill="#c0a078" opacity="0.5" />
    </svg>
  );
};

export default ItemIcon;
