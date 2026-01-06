import React, { useEffect, useMemo } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';

interface MapModalProps {
  currentX: number;
  currentY: number;
  onClose: () => void;
  onSelectLocation: (x: number, y: number) => void;
}

export const MapModal: React.FC<MapModalProps> = ({ currentX, currentY, onClose, onSelectLocation }) => {
  const locations = useMemo(() => [
    { title: "CENTRAL BAZAAR", name: "Al-Buzuriyah Souq", hoverName: "City Center", x: 0, y: 0, type: "market", desc: "Central bazaar south of the Great Mosque", color: "amber" },
    { title: "GREAT MOSQUE", name: "Umayyad Mosque", hoverName: "Religious Center", x: 0, y: 2, type: "mosque", desc: "The Great Mosque of Damascus, heart of the city", color: "emerald" },
    { title: "SOUQ AXIS", name: "Market Corridor", hoverName: "North-South Souq", x: 0, y: 1, type: "market", desc: "Main souq corridor linking market to the mosque", color: "yellow" },
    { title: "JEWISH QUARTER", name: "Al-Yahud", hoverName: "South-Central District", x: 0, y: -1, type: "jewish", desc: "Jewish quarter with synagogues and kosher markets", color: "indigo" },
    { title: "AL-MIDAN GATE", name: "Midan", hoverName: "Southern Gate Road", x: 1, y: -1, type: "road", desc: "Southern gate route with stables and caravans", color: "orange" },
    { title: "CHRISTIAN QUARTER", name: "Bab Touma", hoverName: "East on Straight Street", x: 2, y: 0, type: "residential", desc: "Christian district at eastern end of Via Recta", color: "blue" },
    { title: "STRAIGHT STREET", name: "Via Recta", hoverName: "East-West Artery", x: 1, y: 0, type: "road", desc: "Roman straight street lined with colonnades", color: "yellow" },
    { title: "BAB SHARQI", name: "Bab Sharqi", hoverName: "Eastern Gate", x: 2, y: 1, type: "gate", desc: "Eastern gate and entry road into the city", color: "slate" },
    { title: "HILLSIDE QUARTER", name: "Al-Salihiyya", hoverName: "Mountain Slopes", x: -1, y: 2, type: "hillside", desc: "Hillside quarter on Mount Qassioun's slopes", color: "green" },
    { title: "WEALTHY QUARTER", name: "Al-Qaymariyya", hoverName: "Northwest Quarter", x: -1, y: 1, type: "wealthy", desc: "Wealthy merchant quarter northwest of center", color: "purple" },
    { title: "SOUTHERN QUARTER", name: "Al-Shaghour", hoverName: "Far South", x: 0, y: -2, type: "poor", desc: "Dense southern quarter outside old walls", color: "red" },
    { title: "RURAL FARMLANDS", name: "The Ghouta", hoverName: "Irrigated Oasis", x: 1, y: 3, type: "outskirts", desc: "Fertile orchards and farmland irrigated by Barada", color: "lime" },
    { title: "DESERT OUTSKIRTS", name: "Eastern Badlands", hoverName: "Syrian Desert Edge", x: 3, y: 0, type: "outskirts", desc: "Arid desert fringe to the east", color: "sand" },
    { title: "SILK MARKET", name: "Khan al-Harir", hoverName: "Silk Caravanserai", x: -2, y: 0, type: "caravanserai", desc: "Silk merchants' caravanserai and lodging", color: "orange" },
    { title: "MAMLUK FORTRESS", name: "The Citadel", hoverName: "Northwest Fortress", x: -1, y: 0, type: "civic", desc: "Military fortress in northwestern corner of old city", color: "red" },
    { title: "MOUNTAIN SHRINE", name: "Mount Qassioun", hoverName: "Sacred Peak", x: -2, y: 2, type: "landmark", desc: "Sacred mountain overlooking Damascus from northwest", color: "emerald" },
    { title: "SOUTHERN ROAD", name: "Hauran Highway", hoverName: "Southern Trade Route", x: 1, y: -2, type: "landmark", desc: "Trade route to the fertile Hauran plateau", color: "yellow" },
  ], []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-6xl w-full bg-[#f4e8d8] border-4 border-[#8b6f47] rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4b896\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Corner Flourishes */}
        <svg className="absolute top-0 left-0 w-24 h-24 pointer-events-none" viewBox="0 0 100 100">
          <path d="M0,0 Q20,0 20,20 L20,100 M0,0 Q0,20 20,20 L100,20" stroke="#8b6f47" strokeWidth="2" fill="none" opacity="0.6" />
          <circle cx="20" cy="20" r="8" fill="#d4af37" opacity="0.4" />
        </svg>
        <svg className="absolute top-0 right-0 w-24 h-24 pointer-events-none rotate-90" viewBox="0 0 100 100">
          <path d="M0,0 Q20,0 20,20 L20,100 M0,0 Q0,20 20,20 L100,20" stroke="#8b6f47" strokeWidth="2" fill="none" opacity="0.6" />
          <circle cx="20" cy="20" r="8" fill="#d4af37" opacity="0.4" />
        </svg>
        <svg className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none rotate-180" viewBox="0 0 100 100">
          <path d="M0,0 Q20,0 20,20 L20,100 M0,0 Q0,20 20,20 L100,20" stroke="#8b6f47" strokeWidth="2" fill="none" opacity="0.6" />
          <circle cx="20" cy="20" r="8" fill="#d4af37" opacity="0.4" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none -rotate-90" viewBox="0 0 100 100">
          <path d="M0,0 Q20,0 20,20 L20,100 M0,0 Q0,20 20,20 L100,20" stroke="#8b6f47" strokeWidth="2" fill="none" opacity="0.6" />
          <circle cx="20" cy="20" r="8" fill="#d4af37" opacity="0.4" />
        </svg>

        <div className="flex-1 p-4 border-b md:border-b-0 md:border-r-4 border-[#8b6f47] max-h-[45vh] md:max-h-none overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs text-[#8b6f47] uppercase tracking-[0.4em] font-bold font-serif">خريطة دمشق — Damascus Map — Anno Domini 1348</h4>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-[#8b6f47]/10 rounded-full transition-colors text-[#6b5a45] hover:text-[#8b6f47]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-[#e8dcc8] border-4 border-[#8b6f47] rounded-lg p-8 relative overflow-hidden shadow-inner">
            {/* Paper texture overlay */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
            }} />

            <svg viewBox="0 0 500 500" className="w-full h-full">
              {/* Barada River - more organic, flowing */}
              <path d="M0,75 Q50,70 100,75 Q150,80 200,85 Q250,90 300,95 Q350,100 400,105 Q450,108 500,110"
                fill="none" stroke="#5a8a9a" strokeWidth="12" opacity="0.3" strokeLinecap="round" />
              <path d="M0,75 Q50,70 100,75 Q150,80 200,85 Q250,90 300,95 Q350,100 400,105 Q450,108 500,110"
                fill="none" stroke="#7ab4c8" strokeWidth="6" opacity="0.5" strokeLinecap="round" />
              <path d="M0,75 Q50,70 100,75 Q150,80 200,85 Q250,90 300,95 Q350,100 400,105 Q450,108 500,110"
                fill="none" stroke="#a0d4e8" strokeWidth="2" opacity="0.7" strokeLinecap="round" />

              {/* City Walls - solid and textured */}
              <ellipse cx="250" cy="250" rx="200" ry="220" fill="none" stroke="#6b5a45" strokeWidth="6" opacity="0.4" />
              <ellipse cx="250" cy="250" rx="200" ry="220" fill="none" stroke="#8b7355" strokeWidth="3" opacity="0.6" />
              <ellipse cx="250" cy="250" rx="197" ry="217" fill="none" stroke="#5a4a35" strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />

              {/* Main road - Via Recta */}
              <line x1="80" y1="250" x2="420" y2="250" stroke="#9b8565" strokeWidth="4" opacity="0.4" />
              <line x1="80" y1="250" x2="420" y2="250" stroke="#b4956f" strokeWidth="2" opacity="0.5" />

              {/* Great Mosque - ornate and prominent */}
              <g transform="translate(250, 205)">
                {/* Mosque base */}
                <rect x="-35" y="0" width="70" height="60" fill="#d4af37" stroke="#8b6f47" strokeWidth="2" opacity="0.7" />
                <rect x="-30" y="5" width="60" height="50" fill="#e8c870" stroke="#a58d5f" strokeWidth="1" opacity="0.6" />

                {/* Dome */}
                <ellipse cx="0" cy="5" rx="28" ry="18" fill="#16a34a" opacity="0.7" />
                <ellipse cx="0" cy="5" rx="24" ry="15" fill="#22c55e" opacity="0.6" />
                <circle cx="0" cy="0" r="8" fill="#d4af37" opacity="0.8" />

                {/* Minaret */}
                <rect x="25" y="-15" width="8" height="30" fill="#8b6f47" opacity="0.8" />
                <circle cx="29" cy="-17" r="5" fill="#d4af37" opacity="0.7" />

                {/* Arabic label */}
                <text x="0" y="75" textAnchor="middle" className="text-[9px] fill-[#4a3a2a] font-bold" style={{ fontFamily: 'serif' }}>
                  الجامع الأموي
                </text>
                <text x="0" y="88" textAnchor="middle" className="text-[7px] fill-[#6b5a45] italic" style={{ fontFamily: 'serif' }}>
                  UMAYYAD MOSQUE
                </text>
              </g>

              {/* Mount Qassioun - layered mountain */}
              <g transform="translate(50, 100)">
                <path d="M-20,50 L0,0 L20,50 Z" fill="#3a4a3a" opacity="0.5" />
                <path d="M-15,45 L0,5 L15,45 Z" fill="#4a5a4a" opacity="0.6" />
                <path d="M-10,40 L0,10 L10,40 Z" fill="#5a6a5a" opacity="0.7" />
                <circle cx="0" cy="15" r="4" fill="#d4af37" opacity="0.5" />
                <text x="0" y="70" textAnchor="middle" className="text-[8px] fill-[#3a4a2a] font-semibold" style={{ fontFamily: 'serif' }}>
                  جبل قاسيون
                </text>
                <text x="0" y="82" textAnchor="middle" className="text-[7px] fill-[#4a5a35] italic" style={{ fontFamily: 'serif' }}>
                  Mt. Qassioun
                </text>
              </g>

              {/* Ghouta orchards */}
              <g opacity="0.4">
                <circle cx="420" cy="350" r="5" fill="#6a9a4a" />
                <circle cx="445" cy="330" r="4" fill="#7aaa5a" />
                <circle cx="470" cy="360" r="6" fill="#5a8a3a" />
                <circle cx="435" cy="370" r="4" fill="#6a9a4a" />
                <text x="445" y="395" textAnchor="middle" className="text-[8px] fill-[#4a6a2a] italic" style={{ fontFamily: 'serif' }}>
                  الغوطة / Ghouta
                </text>
              </g>

              {/* Desert dunes */}
              <g opacity="0.3">
                <path d="M20,350 Q40,330 60,350" fill="none" stroke="#c4a87a" strokeWidth="5" strokeLinecap="round" />
                <path d="M30,370 Q55,345 80,370" fill="none" stroke="#d4b88a" strokeWidth="4" strokeLinecap="round" />
                <text x="55" y="395" textAnchor="middle" className="text-[8px] fill-[#8a6a4a] italic" style={{ fontFamily: 'serif' }}>
                  البادية / Desert
                </text>
              </g>

              {/* Compass Rose - Islamic 8-pointed star */}
              <g transform="translate(450, 50)">
                <circle cx="0" cy="0" r="25" fill="#e8dcc8" stroke="#8b6f47" strokeWidth="2" opacity="0.8" />
                <path d="M0,-20 L-3,-5 L0,0 L3,-5 Z" fill="#d4af37" opacity="0.7" />
                <path d="M20,0 L5,3 L0,0 L5,-3 Z" fill="#c4a067" opacity="0.7" />
                <path d="M0,20 L3,5 L0,0 L-3,5 Z" fill="#b49057" opacity="0.7" />
                <path d="M-20,0 L-5,-3 L0,0 L-5,3 Z" fill="#a48047" opacity="0.7" />
                <circle cx="0" cy="0" r="3" fill="#8b6f47" />
                <text x="0" y="-28" textAnchor="middle" className="text-[10px] fill-[#6b5a45] font-bold" style={{ fontFamily: 'serif' }}>N</text>
              </g>

              {/* District markers with smart positioning */}
              {locations.map((loc) => {
                const isCurrent = loc.x === currentX && loc.y === currentY;
                const svgX = 250 + loc.x * 50;
                const svgY = 250 - loc.y * 45;

                // Smart label positioning to avoid center crowding
                const angle = Math.atan2(svgY - 250, svgX - 250);
                const isNearCenter = Math.abs(loc.x) <= 1 && Math.abs(loc.y) <= 1;
                const labelDistance = isNearCenter ? 50 : 35;
                const labelX = svgX + Math.cos(angle) * labelDistance;
                const labelY = svgY + Math.sin(angle) * labelDistance;

                const colorMap: Record<string, { dot: string; ring: string; text: string }> = {
                  amber: { dot: '#f59e0b', ring: '#fbbf24', text: '#92400e' },
                  emerald: { dot: '#10b981', ring: '#34d399', text: '#065f46' },
                  yellow: { dot: '#eab308', ring: '#facc15', text: '#854d0e' },
                  indigo: { dot: '#6366f1', ring: '#818cf8', text: '#312e81' },
                  orange: { dot: '#f97316', ring: '#fb923c', text: '#9a3412' },
                  blue: { dot: '#3b82f6', ring: '#60a5fa', text: '#1e3a8a' },
                  red: { dot: '#ef4444', ring: '#f87171', text: '#7f1d1d' },
                  purple: { dot: '#a855f7', ring: '#c084fc', text: '#581c87' },
                  green: { dot: '#22c55e', ring: '#4ade80', text: '#14532d' },
                  lime: { dot: '#84cc16', ring: '#a3e635', text: '#365314' },
                  sand: { dot: '#f59e0b', ring: '#fbbf24', text: '#78350f' },
                  slate: { dot: '#64748b', ring: '#94a3b8', text: '#1e293b' },
                };

                const colors = colorMap[loc.color] || colorMap.amber;

                return (
                  <g key={loc.name} className="cursor-pointer group/node" onClick={() => onSelectLocation(loc.x, loc.y)}>
                    {isCurrent && (
                      <>
                        <circle cx={svgX} cy={svgY} r="18" fill={colors.ring} opacity="0.2" className="animate-ping" />
                        <circle cx={svgX} cy={svgY} r="14" stroke={colors.ring} strokeWidth="2" fill="none" opacity="0.5" />
                      </>
                    )}

                    <circle cx={svgX} cy={svgY} r={isCurrent ? 8 : 6} fill={colors.dot} opacity="0.9" />
                    <circle cx={svgX} cy={svgY} r={isCurrent ? 11 : 9} stroke={colors.ring} strokeWidth="1.5" fill="none" opacity="0.6" />

                    {/* Clean label */}
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      className="text-[8px] font-bold pointer-events-none"
                      fill={colors.text}
                      opacity="0.9"
                      style={{ fontFamily: 'serif' }}
                    >
                      {loc.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="w-full md:w-80 p-6 flex flex-col gap-4 overflow-hidden min-h-0 bg-[#ebe0d0]">
          <div className="pb-3 border-b-2 border-[#8b6f47]">
            <h3 className="text-lg font-bold text-[#4a3a2a] uppercase tracking-wider font-serif">المسار السريع</h3>
            <h3 className="text-base font-bold text-[#6b5a45] uppercase tracking-wider font-serif mt-1">Fast Travel</h3>
            <p className="text-[11px] text-[#8b7355] mt-1 italic">Select a district to visit</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
            {locations.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  disabled={isCurrent}
                  className={`w-full text-left p-2 rounded border-2 transition-all group ${
                    isCurrent
                      ? 'bg-[#d4af37]/20 border-[#8b6f47] cursor-default'
                      : 'bg-[#f4e8d8] border-[#c4b896] hover:bg-[#e8dcc8] hover:border-[#8b6f47] hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="font-bold text-[11px] text-[#4a3a2a] uppercase tracking-widest leading-tight font-serif">
                        {loc.title}
                      </div>
                      <div className="text-sm text-[#6b5a45] italic mt-0.5" style={{ fontFamily: 'serif' }}>
                        {loc.name}
                      </div>
                    </div>
                    {isCurrent && <MapPin size={14} className="text-[#d4af37]" />}
                  </div>
                  <p className="text-[11px] leading-snug text-[#8b7355]">{loc.desc}</p>
                  {!isCurrent && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-[#8b6f47] uppercase tracking-widest">
                      <Navigation size={12} /> Travel Here
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-[#8b7355] text-center italic border-t-2 border-[#c4b896] pt-3 font-serif">
            دمشق، لؤلؤة الشرق<br />Damascus, Pearl of the East
          </div>
        </div>
      </div>
    </div>
  );
};
