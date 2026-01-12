/**
 * Special NPC Modals
 * Simple interaction modals for Astrologer, Scribe, and Snake Charmer NPCs
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Star, Scroll, Send, Feather } from 'lucide-react';
import { NPCStats, PlayerStats } from '../types';

// ============================================================================
// ASTROLOGER MODAL - 2D Astrological Chart based on 14th century Islamic astrology
// ============================================================================

interface AstrologerModalProps {
  npc: NPCStats;
  player: PlayerStats;
  onClose: () => void;
}

// Zodiac signs in Arabic astronomical tradition
const ZODIAC_SIGNS = [
  { name: 'Aries', arabic: 'al-Hamal', symbol: '\u2648', element: 'fire' },
  { name: 'Taurus', arabic: 'al-Thawr', symbol: '\u2649', element: 'earth' },
  { name: 'Gemini', arabic: 'al-Jawza', symbol: '\u264A', element: 'air' },
  { name: 'Cancer', arabic: 'al-Saratan', symbol: '\u264B', element: 'water' },
  { name: 'Leo', arabic: 'al-Asad', symbol: '\u264C', element: 'fire' },
  { name: 'Virgo', arabic: 'al-Sunbula', symbol: '\u264D', element: 'earth' },
  { name: 'Libra', arabic: 'al-Mizan', symbol: '\u264E', element: 'air' },
  { name: 'Scorpio', arabic: 'al-Aqrab', symbol: '\u264F', element: 'water' },
  { name: 'Sagittarius', arabic: 'al-Qaws', symbol: '\u2650', element: 'fire' },
  { name: 'Capricorn', arabic: 'al-Jady', symbol: '\u2651', element: 'earth' },
  { name: 'Aquarius', arabic: 'al-Dalw', symbol: '\u2652', element: 'air' },
  { name: 'Pisces', arabic: 'al-Hut', symbol: '\u2653', element: 'water' },
];

// Planetary bodies in medieval Islamic astrology
const PLANETS = [
  { name: 'Sun', arabic: 'al-Shams', color: '#FFD700' },
  { name: 'Moon', arabic: 'al-Qamar', color: '#C0C0C0' },
  { name: 'Mercury', arabic: 'Utarid', color: '#B87333' },
  { name: 'Venus', arabic: 'al-Zuhara', color: '#FFF8E7' },
  { name: 'Mars', arabic: 'al-Mirrikh', color: '#CD5C5C' },
  { name: 'Jupiter', arabic: 'al-Mushtari', color: '#DAA520' },
  { name: 'Saturn', arabic: 'Zuhal', color: '#808080' },
];

// Astrological readings - fortune-cookie style interpretations
const READINGS = [
  "The conjunction of Mars and Saturn portends a time of trials. Yet from adversity springs wisdom, as the Prophet taught.",
  "Venus rises in your house of fortune. New friendships shall prove more valuable than gold.",
  "Mercury's swift passage through your natal sign suggests messages of great import shall reach you soon.",
  "The Moon waxes in your favor. What has been hidden shall be revealed in three days time.",
  "Jupiter's benevolent gaze falls upon your endeavors. Fortune favors the bold this season.",
  "Saturn's patient influence counsels deliberation. Haste shall be your enemy in the coming weeks.",
  "The fixed stars align in unusual patterns. Great changes stir in the heavens and on earth alike.",
  "Your natal chart shows strength in adversity. The pestilence that afflicts our city shall not claim you, if you heed wisdom.",
  "The ascendant indicates a journey. Whether of body or spirit, transformation awaits.",
  "I see the influence of Aldebaran upon your destiny. Courage and honor shall guide your path.",
];

// Islamic calendar month names
const ISLAMIC_MONTHS = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
];

export const AstrologerModal: React.FC<AstrologerModalProps> = ({ npc, player, onClose }) => {
  const [reading, setReading] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  // Seeded random function for deterministic generation
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Generate deterministic birth date from player name and age
  // Game is set in 748 AH (1348 CE)
  const birthDate = useMemo(() => {
    // Create a stable seed from player name
    let nameSeed = 0;
    for (let i = 0; i < player.name.length; i++) {
      nameSeed += player.name.charCodeAt(i) * (i + 1);
    }

    const birthYear = 748 - player.age; // 748 AH is 1348 CE
    const birthMonth = Math.floor(seededRandom(nameSeed * 13) * 12);
    const birthDay = 1 + Math.floor(seededRandom(nameSeed * 29) * 28);

    return {
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      monthName: ISLAMIC_MONTHS[birthMonth],
      formatted: `${birthDay} ${ISLAMIC_MONTHS[birthMonth]}, ${birthYear} AH`
    };
  }, [player.name, player.age]);

  // Generate deterministic planet positions based on birth date (stable, not simTime)
  const planetPositions = useMemo(() => {
    // Create stable seed from birth date
    const seed = birthDate.year * 1000 + birthDate.month * 100 + birthDate.day;

    return PLANETS.map((planet, i) => ({
      ...planet,
      sign: Math.floor(seededRandom(seed + i * 137) * 12),
      degree: Math.floor(seededRandom(seed + i * 251) * 30),
      house: Math.floor(seededRandom(seed + i * 389) * 12) + 1,
    }));
  }, [birthDate]);

  // Get the player's sun sign
  const sunSign = useMemo(() => {
    const sunPosition = planetPositions.find(p => p.name === 'Sun');
    return sunPosition ? ZODIAC_SIGNS[sunPosition.sign] : ZODIAC_SIGNS[0];
  }, [planetPositions]);

  // Select a reading based on birth date seed
  const selectedReading = useMemo(() => {
    const seed = birthDate.year * 100 + birthDate.month * 10 + birthDate.day;
    return READINGS[seed % READINGS.length];
  }, [birthDate]);

  useEffect(() => {
    // Show chart after a brief delay
    const timer = setTimeout(() => setShowChart(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleGetReading = () => {
    setReading(selectedReading);
  };

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full max-w-2xl bg-gradient-to-b from-slate-950 via-indigo-950/90 to-slate-950 border border-indigo-700/40 rounded-2xl shadow-[0_0_60px_rgba(99,102,241,0.15)] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-800/40 bg-indigo-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-900/50 border border-indigo-600/40 flex items-center justify-center">
                <Star className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg text-indigo-100 font-semibold">{npc.name}</h2>
                <p className="text-[10px] uppercase tracking-widest text-indigo-400/60">Astrologer & Astronomer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-indigo-400 hover:text-indigo-200 hover:bg-indigo-800/30 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Birth Chart Info */}
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-indigo-500/60 mb-1">Natal Chart for</p>
              <p className="text-indigo-100 font-medium">{player.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-indigo-500/60 mb-1">Birth Date</p>
              <p className="text-indigo-200 text-sm">{birthDate.formatted}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-indigo-500/60 mb-1">Sun Sign</p>
              <p className="text-indigo-200">
                <span className="text-lg mr-1">{sunSign.symbol}</span>
                <span className="text-sm">{sunSign.arabic}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Astrological Chart - SVG */}
          <div className={`relative aspect-square max-w-md mx-auto mb-6 transition-all duration-700 ${showChart ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {/* Background */}
              <circle cx="200" cy="200" r="195" fill="#0a0a1a" stroke="#4338ca" strokeWidth="2" />

              {/* Outer zodiac ring */}
              <circle cx="200" cy="200" r="180" fill="none" stroke="#312e81" strokeWidth="1" />
              <circle cx="200" cy="200" r="140" fill="none" stroke="#312e81" strokeWidth="1" />

              {/* Zodiac divisions */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x1 = 200 + Math.cos(angle) * 140;
                const y1 = 200 + Math.sin(angle) * 140;
                const x2 = 200 + Math.cos(angle) * 180;
                const y2 = 200 + Math.sin(angle) * 180;
                return <line key={`div-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4338ca" strokeWidth="1" />;
              })}

              {/* Zodiac symbols */}
              {ZODIAC_SIGNS.map((sign, i) => {
                const angle = ((i * 30) + 15 - 90) * (Math.PI / 180);
                const x = 200 + Math.cos(angle) * 160;
                const y = 200 + Math.sin(angle) * 160;
                return (
                  <text
                    key={sign.name}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={sign.element === 'fire' ? '#ef4444' : sign.element === 'earth' ? '#84cc16' : sign.element === 'air' ? '#60a5fa' : '#06b6d4'}
                    fontSize="16"
                    className="font-serif"
                  >
                    {sign.symbol}
                  </text>
                );
              })}

              {/* Inner house grid */}
              <circle cx="200" cy="200" r="100" fill="none" stroke="#1e1b4b" strokeWidth="1" />
              <circle cx="200" cy="200" r="60" fill="none" stroke="#1e1b4b" strokeWidth="1" />

              {/* House lines */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x1 = 200 + Math.cos(angle) * 60;
                const y1 = 200 + Math.sin(angle) * 60;
                const x2 = 200 + Math.cos(angle) * 100;
                const y2 = 200 + Math.sin(angle) * 100;
                return <line key={`house-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e1b4b" strokeWidth="1" />;
              })}

              {/* Planet positions */}
              {planetPositions.map((planet, i) => {
                const angle = ((planet.sign * 30) + planet.degree - 90) * (Math.PI / 180);
                const radius = 80 + (i % 3) * 15; // Stagger to avoid overlap
                const x = 200 + Math.cos(angle) * radius;
                const y = 200 + Math.sin(angle) * radius;
                return (
                  <g key={planet.name}>
                    <circle cx={x} cy={y} r="8" fill={planet.color} opacity="0.9" />
                    <circle cx={x} cy={y} r="10" fill="none" stroke={planet.color} strokeWidth="1" opacity="0.5" />
                  </g>
                );
              })}

              {/* Central emblem */}
              <circle cx="200" cy="200" r="25" fill="#0c0a1a" stroke="#6366f1" strokeWidth="2" />
              <text x="200" y="205" textAnchor="middle" fill="#a5b4fc" fontSize="10" className="font-serif">
                {player.name.substring(0, 3)}
              </text>
            </svg>

            {/* Planet legend */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 bg-slate-950/80 border border-indigo-800/30 rounded-lg p-2 text-[9px] space-y-1">
              {planetPositions.map(planet => (
                <div key={planet.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: planet.color }} />
                  <span className="text-indigo-300/70">{planet.arabic}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reading section */}
          {!reading ? (
            <div className="text-center">
              <p className="text-indigo-200/60 text-sm mb-4 italic">
                "I have cast your horoscope and studied the celestial spheres..."
              </p>
              <button
                onClick={handleGetReading}
                className="px-6 py-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-500/80 text-white font-medium text-sm transition-colors"
              >
                Receive Your Reading
              </button>
            </div>
          ) : (
            <div className="bg-indigo-950/50 border border-indigo-800/30 rounded-xl p-4 animate-in fade-in duration-500">
              <div className="text-[10px] uppercase tracking-widest text-indigo-500/60 mb-2">Your Reading</div>
              <p className="text-indigo-100/90 text-sm leading-relaxed italic">"{reading}"</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-indigo-800/50 hover:bg-indigo-700/50 text-indigo-200 text-xs uppercase tracking-widest transition-colors"
                >
                  Depart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SCRIBE MODAL - Letter Writing UI
// ============================================================================

const LETTER_COST = 2; // dirhams

interface ScribeModalProps {
  npc: NPCStats;
  player: PlayerStats;
  onClose: () => void;
  onCreateLetter: (letterText: string, recipient: string, cost: number) => void;
}

export const ScribeModal: React.FC<ScribeModalProps> = ({ npc, player, onClose, onCreateLetter }) => {
  const [recipient, setRecipient] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAfford = player.currency >= LETTER_COST;
  const inventorySize = player.inventory.reduce((sum, i) => sum + i.quantity, 0);
  const hasInventorySpace = inventorySize < player.maxInventorySlots;

  const handleCommission = () => {
    if (!recipient.trim() || !letterContent.trim()) return;

    // Validate before writing
    if (!canAfford) {
      setError('You cannot afford this service.');
      return;
    }
    if (!hasInventorySpace) {
      setError('Your inventory is full.');
      return;
    }

    setError(null);
    setIsWriting(true);
    // Simulate writing time
    setTimeout(() => {
      setIsWriting(false);
      setCompleted(true);
    }, 1500);
  };

  const handleTakeLetter = () => {
    onCreateLetter(letterContent, recipient, LETTER_COST);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full max-w-xl bg-gradient-to-b from-amber-950/95 via-stone-950/95 to-amber-950/95 border border-amber-800/40 rounded-2xl shadow-[0_0_60px_rgba(217,119,6,0.1)] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-800/30 bg-amber-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-900/50 border border-amber-700/40 flex items-center justify-center">
                <Feather className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg text-amber-100 font-semibold">{npc.name}</h2>
                <p className="text-[10px] uppercase tracking-widest text-amber-500/60">Scribe & Calligrapher</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-amber-400 hover:text-amber-200 hover:bg-amber-800/30 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!completed ? (
            <>
              <p className="text-amber-200/70 text-sm mb-5 italic">
                "I can write a letter for you, friend. My calligraphy is praised throughout the suq. Who shall receive your words?"
              </p>

              {/* Recipient input */}
              <div className="mb-4">
                <label className="block text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  Recipient
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient's name..."
                  className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-amber-800/30 text-amber-100 placeholder:text-amber-200/30 focus:outline-none focus:border-amber-600/50 text-sm"
                  disabled={isWriting}
                />
              </div>

              {/* Letter content */}
              <div className="mb-5">
                <label className="block text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">
                  Your Message
                </label>
                <textarea
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="Dictate your letter..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-black/40 border border-amber-800/30 text-amber-100 placeholder:text-amber-200/30 focus:outline-none focus:border-amber-600/50 text-sm resize-none"
                  disabled={isWriting}
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/40 text-red-300 text-xs">
                  {error}
                </div>
              )}

              {/* Cost and action */}
              <div className="flex items-center justify-between">
                <div className="text-[11px]">
                  <span className="text-amber-400/60">Cost: </span>
                  <span className={`font-semibold ${canAfford ? 'text-amber-300' : 'text-red-400'}`}>
                    {LETTER_COST} dirhams
                  </span>
                  {!canAfford && <span className="text-red-400/60 ml-1">(insufficient funds)</span>}
                  {!hasInventorySpace && <span className="text-red-400/60 ml-1">(inventory full)</span>}
                </div>
                <button
                  onClick={handleCommission}
                  disabled={!recipient.trim() || !letterContent.trim() || isWriting || !canAfford || !hasInventorySpace}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    recipient.trim() && letterContent.trim() && !isWriting && canAfford && hasInventorySpace
                      ? 'bg-amber-600/80 hover:bg-amber-500/80 text-white'
                      : 'bg-amber-900/30 text-amber-500/50 cursor-not-allowed'
                  }`}
                >
                  {isWriting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                      Writing...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Commission Letter
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center animate-in fade-in duration-500">
              {/* Completed letter visual */}
              <div className="relative w-48 h-56 mx-auto mb-6">
                <div className="absolute inset-0 bg-amber-100/90 rounded-sm shadow-lg transform rotate-1" />
                <div className="absolute inset-0 bg-[#f4e8d0] rounded-sm shadow-md flex flex-col p-4">
                  <div className="text-[8px] text-amber-900/60 text-right font-serif mb-2">
                    بسم الله
                  </div>
                  <div className="text-[9px] text-amber-900/80 text-left mb-1">
                    To: {recipient}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-2 bg-amber-900/20 rounded-sm mb-1 last:w-2/3" />
                    ))}
                  </div>
                  <div className="text-[9px] text-amber-900/70 text-right mt-2 font-serif italic">
                    {player.name}
                  </div>
                </div>
                {/* Wax seal */}
                <div className="absolute -bottom-2 right-4 w-8 h-8 rounded-full bg-red-800 shadow-md flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-red-700 border border-red-900/50" />
                </div>
              </div>

              <p className="text-amber-100 text-sm mb-2">Your letter is ready!</p>
              <p className="text-amber-200/50 text-xs mb-5">
                The scribe has sealed it with wax. You may keep it or give it to another.
              </p>

              <button
                onClick={handleTakeLetter}
                className="px-6 py-3 rounded-lg bg-amber-600/80 hover:bg-amber-500/80 text-white font-medium text-sm transition-colors flex items-center gap-2 mx-auto"
              >
                <Scroll size={16} />
                Take Letter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SNAKE CHARMER MODAL - Animated Snake + Sufi Wisdom
// ============================================================================

interface SnakeCharmerModalProps {
  npc: NPCStats;
  onClose: () => void;
}

// Sufi wisdom quotes - historical sayings and poetry
const SUFI_WISDOM = [
  "The wound is the place where the Light enters you. - Rumi",
  "What you seek is seeking you.",
  "Silence is the language of God; all else is poor translation.",
  "The art of knowing is knowing what to ignore.",
  "Out beyond ideas of wrongdoing and rightdoing there is a field. I'll meet you there.",
  "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.",
  "Set your life on fire. Seek those who fan your flames.",
  "Don't be satisfied with stories of how things have gone with others. Unfold your own myth.",
  "The lion is most handsome when looking for food. - Rumi",
  "I have lived on the lip of insanity, wanting to know reasons, knocking on a door. It opens. I've been knocking from the inside.",
  "Let yourself be silently drawn by the strange pull of what you really love.",
  "These pains you feel are messengers. Listen to them.",
  "Be empty of worrying. Think of who created thought.",
  "Travel brings power and love back into your life.",
  "You are not a drop in the ocean. You are the entire ocean in a drop.",
];

export const SnakeCharmerModal: React.FC<SnakeCharmerModalProps> = ({ npc, onClose }) => {
  const [currentWisdom, setCurrentWisdom] = useState('');
  const [wisdomOpacity, setWisdomOpacity] = useState(0);
  const wisdomIndexRef = useRef(Math.floor(Math.random() * SUFI_WISDOM.length));
  const snakePhase = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animate snake
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const drawSnake = () => {
      snakePhase.current += 0.03;
      const phase = snakePhase.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw basket
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      ctx.ellipse(200, 350, 80, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6B5344';
      ctx.beginPath();
      ctx.ellipse(200, 350, 70, 25, 0, 0, Math.PI);
      ctx.fill();

      // Draw woven pattern
      ctx.strokeStyle = '#5a4530';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const y = 340 + Math.sin(i * 0.5) * 5;
        ctx.beginPath();
        ctx.moveTo(130, y - i * 2);
        ctx.lineTo(270, y - i * 2);
        ctx.stroke();
      }

      // Draw snake body
      const segments = 20;
      const baseX = 200;
      const baseY = 340;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw from bottom to top
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const rise = t * 180; // How high the snake rises
          const sway = Math.sin(phase + t * 4) * 25 * t; // Swaying motion
          const x = baseX + sway;
          const y = baseY - rise;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        if (pass === 0) {
          // Body shadow
          ctx.strokeStyle = '#2a3a1a';
          ctx.lineWidth = 22;
          ctx.stroke();
        } else {
          // Body
          const gradient = ctx.createLinearGradient(baseX - 30, baseY, baseX + 30, baseY - 180);
          gradient.addColorStop(0, '#4a5a3a');
          gradient.addColorStop(0.5, '#5a6a4a');
          gradient.addColorStop(1, '#4a5a3a');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 18;
          ctx.stroke();
        }
      }

      // Draw scales pattern
      ctx.strokeStyle = '#3a4a2a';
      ctx.lineWidth = 1;
      for (let i = 2; i < segments; i += 2) {
        const t = i / segments;
        const rise = t * 180;
        const sway = Math.sin(phase + t * 4) * 25 * t;
        const x = baseX + sway;
        const y = baseY - rise;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw head
      const headT = 1;
      const headRise = headT * 180;
      const headSway = Math.sin(phase + headT * 4) * 25 * headT;
      const headX = baseX + headSway;
      const headY = baseY - headRise;
      const headTilt = Math.sin(phase) * 0.2;

      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(headTilt);

      // Head shape
      ctx.fillStyle = '#4a5a3a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.ellipse(-5, -5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, -5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(-5, -5, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, -5, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tongue
      const tonguePhase = (phase * 3) % (Math.PI * 2);
      if (tonguePhase < Math.PI) {
        ctx.strokeStyle = '#cc3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(-3, 20 + Math.sin(tonguePhase) * 5);
        ctx.moveTo(0, 12);
        ctx.lineTo(3, 20 + Math.sin(tonguePhase) * 5);
        ctx.stroke();
      }

      ctx.restore();

      animationId = requestAnimationFrame(drawSnake);
    };

    drawSnake();

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Cycle wisdom quotes with proper cleanup
  useEffect(() => {
    let fadeOutTimer: ReturnType<typeof setTimeout>;
    let nextQuoteTimer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const showWisdom = () => {
      if (!isMounted) return;

      setCurrentWisdom(SUFI_WISDOM[wisdomIndexRef.current]);
      setWisdomOpacity(1);

      // Fade out after 4 seconds
      fadeOutTimer = setTimeout(() => {
        if (!isMounted) return;
        setWisdomOpacity(0);
      }, 4000);

      // Change quote after fade out
      nextQuoteTimer = setTimeout(() => {
        if (!isMounted) return;
        wisdomIndexRef.current = (wisdomIndexRef.current + 1) % SUFI_WISDOM.length;
        showWisdom();
      }, 5500);
    };

    showWisdom();

    return () => {
      isMounted = false;
      clearTimeout(fadeOutTimer);
      clearTimeout(nextQuoteTimer);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full max-w-lg bg-gradient-to-b from-purple-950/95 via-slate-950/95 to-purple-950/95 border border-purple-700/40 rounded-2xl shadow-[0_0_60px_rgba(147,51,234,0.15)] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-800/30 bg-purple-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-600/40 flex items-center justify-center text-lg">
                &#x1F40D;
              </div>
              <div>
                <h2 className="text-lg text-purple-100 font-semibold">{npc.name}</h2>
                <p className="text-[10px] uppercase tracking-widest text-purple-400/60">Sufi Snake Charmer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-purple-400 hover:text-purple-200 hover:bg-purple-800/30 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Snake animation canvas */}
          <div className="relative bg-gradient-to-b from-purple-950/50 to-slate-950/50 rounded-xl border border-purple-800/20 overflow-hidden mb-4">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full h-64 object-contain"
            />

            {/* Incense smoke effect overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-10 left-1/4 w-1 h-20 bg-gradient-to-t from-gray-400/30 to-transparent blur-sm animate-pulse" />
              <div className="absolute bottom-10 right-1/4 w-1 h-16 bg-gradient-to-t from-gray-400/20 to-transparent blur-sm animate-pulse delay-300" />
            </div>
          </div>

          {/* Wisdom quotes box */}
          <div className="bg-purple-950/50 border border-purple-800/30 rounded-xl p-5 min-h-[100px] flex items-center justify-center">
            <p
              className="text-purple-100/90 text-center italic leading-relaxed transition-opacity duration-1000"
              style={{ opacity: wisdomOpacity }}
            >
              {currentWisdom}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-purple-800/50 hover:bg-purple-700/50 text-purple-200 text-xs uppercase tracking-widest transition-colors"
            >
              Depart in Peace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
