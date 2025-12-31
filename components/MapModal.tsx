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
    { title: "CENTRAL\nBAZAAR", titleLines: ["CENTRAL", "BAZAAR"], name: "Al-Buzuriyah Souq", hoverName: "City Center", x: 0, y: 0, type: "market", desc: "Central bazaar south of the Great Mosque", color: "amber" },
    { title: "GREAT\nMOSQUE", titleLines: ["GREAT", "MOSQUE"], name: "Umayyad Mosque", hoverName: "Religious Center", x: 0, y: 2, type: "mosque", desc: "The Great Mosque of Damascus, heart of the city", color: "emerald" },
    { title: "SOUQ\nAXIS", titleLines: ["SOUQ", "AXIS"], name: "Market Corridor", hoverName: "North-South Souq", x: 0, y: 1, type: "market", desc: "Main souq corridor linking market to the mosque", color: "yellow" },
    { title: "JEWISH\nQUARTER", titleLines: ["JEWISH", "QUARTER"], name: "Al-Yahud", hoverName: "South-Central District", x: 0, y: -1, type: "jewish", desc: "Jewish quarter with synagogues and kosher markets", color: "indigo" },
    { title: "AL-MIDAN\nGATE", titleLines: ["AL-MIDAN", "GATE"], name: "Midan", hoverName: "Southern Gate Road", x: 1, y: -1, type: "road", desc: "Southern gate route with stables and caravans", color: "orange" },
    { title: "CHRISTIAN\nQUARTER", titleLines: ["CHRISTIAN", "QUARTER"], name: "Bab Touma", hoverName: "East on Straight Street", x: 2, y: 0, type: "residential", desc: "Christian district at eastern end of Via Recta", color: "blue" },
    { title: "STRAIGHT\nSTREET", titleLines: ["STRAIGHT", "STREET"], name: "Via Recta", hoverName: "East-West Artery", x: 1, y: 0, type: "road", desc: "Roman straight street lined with colonnades", color: "yellow" },
    { title: "BAB\nSHARQI", titleLines: ["BAB", "SHARQI"], name: "Bab Sharqi", hoverName: "Eastern Gate", x: 2, y: 1, type: "gate", desc: "Eastern gate and entry road into the city", color: "slate" },
    { title: "HILLSIDE\nQUARTER", titleLines: ["HILLSIDE", "QUARTER"], name: "Al-Salihiyya", hoverName: "Mountain Slopes", x: -1, y: 2, type: "hillside", desc: "Hillside quarter on Mount Qassioun's slopes", color: "green" },
    { title: "WEALTHY\nQUARTER", titleLines: ["WEALTHY", "QUARTER"], name: "Al-Qaymariyya", hoverName: "Northwest Quarter", x: -1, y: 1, type: "wealthy", desc: "Wealthy merchant quarter northwest of center", color: "purple" },
    { title: "SOUTHERN\nQUARTER", titleLines: ["SOUTHERN", "QUARTER"], name: "Al-Shaghour", hoverName: "Far South", x: 0, y: -2, type: "poor", desc: "Dense southern quarter outside old walls", color: "red" },
    { title: "RURAL\nFARMLANDS", titleLines: ["RURAL", "FARMLANDS"], name: "The Ghouta", hoverName: "Irrigated Oasis", x: 1, y: 3, type: "outskirts", desc: "Fertile orchards and farmland irrigated by Barada", color: "lime" },
    { title: "DESERT\nOUTSKIRTS", titleLines: ["DESERT", "OUTSKIRTS"], name: "Eastern Badlands", hoverName: "Syrian Desert Edge", x: 3, y: 0, type: "outskirts", desc: "Arid desert fringe to the east", color: "sand" },
    { title: "SILK\nMARKET", titleLines: ["SILK", "MARKET"], name: "Khan al-Harir", hoverName: "Silk Caravanserai", x: -2, y: 0, type: "caravanserai", desc: "Silk merchants' caravanserai and lodging", color: "orange" },
    { title: "MAMLUK\nFORTRESS", titleLines: ["MAMLUK", "FORTRESS"], name: "The Citadel", hoverName: "Northwest Fortress", x: -1, y: 0, type: "civic", desc: "Military fortress in northwestern corner of old city", color: "red" },
    { title: "MOUNTAIN\nSHRINE", titleLines: ["MOUNTAIN", "SHRINE"], name: "Mount Qassioun", hoverName: "Sacred Peak", x: -2, y: 2, type: "landmark", desc: "Sacred mountain overlooking Damascus from northwest", color: "emerald" },
    { title: "SOUTHERN\nROAD", titleLines: ["SOUTHERN", "ROAD"], name: "Hauran Highway", hoverName: "Southern Trade Route", x: 1, y: -2, type: "landmark", desc: "Trade route to the fertile Hauran plateau", color: "yellow" },
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
        className="max-w-6xl w-full bg-black/80 backdrop-blur-md border border-amber-800/50 rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 p-3 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-amber-900/40 max-h-[45vh] md:max-h-none overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">Damascus Map — 1348</h4>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded transition-colors text-amber-100/50 hover:text-amber-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="bg-black/30 border border-amber-900/30 rounded-lg p-6 relative overflow-hidden">
            <svg viewBox="0 0 500 500" className="w-full h-full">
              <path d="M0,80 Q120,70 250,90 Q380,110 500,100" fill="none" stroke="#4a7c8a" strokeWidth="8" opacity="0.4" />
              <path d="M0,80 Q120,70 250,90 Q380,110 500,100" fill="none" stroke="#6aa4b8" strokeWidth="3" opacity="0.6" />

              <ellipse cx="250" cy="270" rx="160" ry="180" fill="none" stroke="#8b7355" strokeWidth="3" strokeDasharray="8 4" opacity="0.3" />

              <line x1="120" y1="270" x2="380" y2="270" stroke="#6b5a45" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.5" />

              <rect x="220" y="200" width="60" height="50" fill="#8a7355" stroke="#d4af37" strokeWidth="1.5" opacity="0.6" />
              <circle cx="250" cy="225" r="8" fill="#d4af37" opacity="0.7" />
              <text x="250" y="263" textAnchor="middle" className="text-[8px] fill-amber-300/50 font-bold">UMAYYAD</text>

              <path d="M10,140 L50,80 L90,140 Z" fill="#3a4a3a" opacity="0.4" />
              <path d="M25,125 L50,95 L75,125 Z" fill="#4a5a4a" opacity="0.5" />
              <circle cx="50" cy="105" r="3" fill="#6a8a6a" opacity="0.6" />
              <text x="50" y="158" textAnchor="middle" className="text-[8px] fill-emerald-300/50 font-semibold">Mt. Qassioun</text>

              <circle cx="420" cy="350" r="4" fill="#7a9a5a" opacity="0.3" />
              <circle cx="440" cy="330" r="3" fill="#7a9a5a" opacity="0.25" />
              <circle cx="460" cy="360" r="5" fill="#7a9a5a" opacity="0.35" />
              <text x="440" y="390" textAnchor="middle" className="text-[7px] fill-lime-300/40 italic">Ghouta</text>

              <path d="M20,350 Q40,330 60,350" fill="none" stroke="#bca27a" strokeWidth="4" opacity="0.25" />
              <path d="M30,370 Q55,345 80,370" fill="none" stroke="#c7ad85" strokeWidth="3" opacity="0.2" />
              <text x="55" y="390" textAnchor="middle" className="text-[7px] fill-amber-300/35 italic">Desert</text>

              {locations.map((loc) => {
                const isCurrent = loc.x === currentX && loc.y === currentY;
                const svgX = 250 + loc.x * 35;
                const svgY = 270 - loc.y * 32.5;

                const colorMap = {
                  amber: { bg: 'fill-amber-500', ring: 'stroke-amber-400', text: 'fill-amber-300', glow: 'rgba(251, 191, 36, 0.4)' },
                  slate: { bg: 'fill-slate-500', ring: 'stroke-slate-400', text: 'fill-slate-300', glow: 'rgba(148, 163, 184, 0.4)' },
                  green: { bg: 'fill-green-500', ring: 'stroke-green-400', text: 'fill-green-300', glow: 'rgba(34, 197, 94, 0.4)' },
                  purple: { bg: 'fill-purple-500', ring: 'stroke-purple-400', text: 'fill-purple-300', glow: 'rgba(168, 85, 247, 0.4)' },
                  red: { bg: 'fill-red-500', ring: 'stroke-red-400', text: 'fill-red-300', glow: 'rgba(239, 68, 68, 0.4)' },
                  blue: { bg: 'fill-blue-500', ring: 'stroke-blue-400', text: 'fill-blue-300', glow: 'rgba(59, 130, 246, 0.4)' },
                  indigo: { bg: 'fill-indigo-500', ring: 'stroke-indigo-400', text: 'fill-indigo-300', glow: 'rgba(99, 102, 241, 0.4)' },
                  lime: { bg: 'fill-lime-500', ring: 'stroke-lime-400', text: 'fill-lime-300', glow: 'rgba(132, 204, 22, 0.4)' },
                  sand: { bg: 'fill-amber-400', ring: 'stroke-amber-300', text: 'fill-amber-200', glow: 'rgba(245, 158, 11, 0.35)' },
                  orange: { bg: 'fill-orange-500', ring: 'stroke-orange-400', text: 'fill-orange-300', glow: 'rgba(249, 115, 22, 0.4)' },
                  emerald: { bg: 'fill-emerald-500', ring: 'stroke-emerald-400', text: 'fill-emerald-300', glow: 'rgba(16, 185, 129, 0.4)' },
                  yellow: { bg: 'fill-yellow-500', ring: 'stroke-yellow-400', text: 'fill-yellow-300', glow: 'rgba(234, 179, 8, 0.4)' },
                };

                const colors = colorMap[loc.color as keyof typeof colorMap];

                return (
                  <g key={loc.name} className="cursor-pointer group/node" onClick={() => onSelectLocation(loc.x, loc.y)}>
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="18"
                      fill={colors.glow}
                      className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(8px)' }}
                    />
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="14"
                      fill={colors.glow}
                      className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(4px)' }}
                    />

                    {isCurrent && (
                      <>
                        <circle cx={svgX} cy={svgY} r="16" className={`${colors.ring} animate-ping`} strokeWidth="2" fill="none" opacity="0.3" />
                        <circle cx={svgX} cy={svgY} r="12" className={colors.ring} strokeWidth="2" fill="none" opacity="0.6" />
                      </>
                    )}

                    <circle
                      cx={svgX}
                      cy={svgY}
                      r={isCurrent ? "7" : "5"}
                      className={`${colors.bg} transition-all duration-200`}
                      opacity={isCurrent ? "1" : "0.8"}
                    />
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r="9"
                      className={`${colors.ring} transition-all duration-200 group-hover/node:opacity-70`}
                      strokeWidth="1.5"
                      fill="none"
                      opacity={isCurrent ? "0.5" : "0.3"}
                    />

                    <g className="pointer-events-none">
                      <text
                        x={svgX}
                        y={svgY - 20}
                        textAnchor="middle"
                        className={`text-[8px] ${colors.text} font-bold transition-opacity group-hover/node:opacity-0`}
                        opacity="0.7"
                      >
                        {loc.titleLines.map((line, i) => (
                          <tspan key={i} x={svgX} dy={i === 0 ? 0 : 10}>
                            {line}
                          </tspan>
                        ))}
                      </text>

                      <g className="opacity-0 group-hover/node:opacity-100 transition-opacity">
                        <text
                          x={svgX}
                          y={svgY - 28}
                          textAnchor="middle"
                          className={`text-[9px] ${colors.text} font-bold`}
                        >
                          {loc.titleLines.map((line, i) => (
                            <tspan key={i} x={svgX} dy={i === 0 ? 0 : 11}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                        <text
                          x={svgX}
                          y={svgY - 14}
                          textAnchor="middle"
                          className={`text-[8px] ${colors.text} italic`}
                          opacity="0.8"
                        >
                          {loc.hoverName}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="w-full md:w-96 p-3 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-hidden min-h-0">
          <div className="pb-2 sm:pb-3 border-b border-amber-900/40">
            <h3 className="text-base sm:text-lg font-bold text-amber-100 uppercase tracking-wider">Fast Travel</h3>
            <p className="text-[10px] text-amber-100/40 mt-0.5 sm:mt-1">Select a district to visit</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 sm:space-y-2 pr-1 sm:pr-2 min-h-0">
            {locations.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  disabled={isCurrent}
                  className={`w-full text-left p-2 sm:p-3 rounded-lg border transition-all group ${
                    isCurrent
                      ? 'bg-amber-900/40 border-amber-700/60 cursor-default'
                      : 'bg-black/30 border-amber-900/30 hover:bg-amber-900/20 hover:border-amber-700/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="font-bold text-[11px] text-amber-100/90 uppercase tracking-widest leading-tight">
                        {loc.title}
                      </div>
                      <div className="text-sm text-amber-200/70 font-serif italic mt-0.5">
                        {loc.name}
                      </div>
                    </div>
                    {isCurrent && (
                      <MapPin size={14} className="text-amber-500" />
                    )}
                  </div>
                  <p className="text-[11px] leading-snug text-amber-100/50">
                    {loc.desc}
                  </p>
                  {!isCurrent && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 uppercase tracking-widest">
                      <Navigation size={12} /> Travel Here
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[9px] text-amber-100/30 text-center italic border-t border-white/5 pt-3">
            Damascus, Pearl of the East
          </div>
        </div>
      </div>
    </div>
  );
};
