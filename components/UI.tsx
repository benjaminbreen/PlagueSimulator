
import React, { useState } from 'react';
import { SimulationParams, SimulationStats, PlayerStats, CameraMode, BuildingMetadata, BuildingType, getLocationLabel } from '../types';
import { 
  Pause, 
  Play, 
  FastForward, 
  Skull, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Camera, 
  Layers, 
  Eye,
  Info,
  MapPin,
  User,
  Menu,
  X,
  Calendar,
  MousePointer2,
  Keyboard,
  Map as MapIcon,
  Navigation
} from 'lucide-react';

interface UIProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  stats: SimulationStats;
  playerStats: PlayerStats;
  nearBuilding: BuildingMetadata | null;
  onFastTravel: (x: number, y: number) => void;
}

const MapModal: React.FC<{
  currentX: number;
  currentY: number;
  onClose: () => void;
  onSelectLocation: (x: number, y: number) => void;
}> = ({ currentX, currentY, onClose, onSelectLocation }) => {
  const locations = [
    { name: "Main Road (Al-Buzuriyah)", x: 0, y: 0, type: "Road", desc: "The bustling spine of the city, lined with spices and silks." },
    { name: "Narrow Alleys (Bab Sharqi)", x: 1, y: 1, type: "Alley", desc: "Claustrophobic streets where the miasma lingers longest." },
    { name: "Wealthy Quarter (Al-Qaymariyya)", x: -1, y: 2, type: "Wealthy", desc: "Ornate mansions behind high walls. The plague spares few." },
    { name: "Poor Hovels (Al-Shaghour)", x: 0, y: -2, type: "Hovels", desc: "Density and decay make this a breeding ground for death." },
    { name: "Player's Home", x: 1, y: -1, type: "Home", desc: "A modest courtyard house. Your only sanctuary." },
    { name: "Mamluk Citadel", x: 2, y: -1, type: "Civic", desc: "Seat of the governor. Heavily guarded against the frantic crowds." },
  ];

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in-95 pointer-events-auto">
      <div className="max-w-4xl w-full bg-[#f4e4bc] border-8 border-[#3d2817] rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col md:flex-row h-[90vh]">
        {/* Parchment Texture Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] mix-blend-multiply"></div>
        
        {/* Left Side: Map Visual */}
        <div className="relative flex-1 bg-[#dcc69c] border-b md:border-b-0 md:border-r-4 border-[#3d2817] p-8 overflow-hidden group">
          <div className="absolute top-4 left-4 text-[#3d2817] historical-font font-bold text-xl uppercase opacity-40">Map of Damascus — 1348 AD</div>
          
          {/* Stylized SVG Map of Damascus */}
          <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-lg opacity-80">
              {/* City Walls */}
              <path d="M100,50 L300,50 L350,150 L320,350 L80,350 L50,150 Z" fill="#c4b593" stroke="#3d2817" strokeWidth="4" />
              {/* Barada River */}
              <path d="M0,40 Q200,20 400,60" fill="none" stroke="#5a7a8a" strokeWidth="12" strokeOpacity="0.5" />
              {/* Straight Street (Suq al-Tawila) */}
              <line x1="100" y1="200" x2="330" y2="200" stroke="#8b4513" strokeWidth="4" strokeDasharray="4 2" />
              {/* Umayyad Mosque Landmark */}
              <rect x="180" y="140" width="40" height="40" fill="#a89f91" stroke="#3d2817" strokeWidth="2" />
              <circle cx="200" cy="160" r="10" fill="#c2b280" />
              
              {/* Interactive Location Nodes */}
              {locations.map((loc) => {
                const isCurrent = loc.x === currentX && loc.y === currentY;
                // Map logical coords to SVG space
                const svgX = 200 + loc.x * 60;
                const svgY = 200 - loc.y * 60;
                
                return (
                  <g key={loc.name} className="cursor-pointer group/node" onClick={() => onSelectLocation(loc.x, loc.y)}>
                    <circle 
                      cx={svgX} 
                      cy={svgY} 
                      r={isCurrent ? 8 : 6} 
                      fill={isCurrent ? "#ef4444" : "#3d2817"} 
                      className="transition-all hover:r-10"
                    />
                    {isCurrent && (
                      <circle cx={svgX} cy={svgY} r={12} fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
                    )}
                    <text 
                      x={svgX} 
                      y={svgY - 15} 
                      textAnchor="middle" 
                      className="text-[8px] md:text-[10px] historical-font fill-[#3d2817] font-bold uppercase tracking-tighter opacity-0 group-hover/node:opacity-100 transition-opacity"
                    >
                      {loc.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side: Location Info & List */}
        <div className="w-full md:w-80 p-6 flex flex-col gap-6 bg-[#efe0bc] z-10">
          <div className="flex justify-between items-center border-b-2 border-[#3d2817] pb-2">
            <h3 className="historical-font text-2xl text-[#3d2817] font-bold italic tracking-tighter">Fast Travel</h3>
            <button onClick={onClose} className="text-[#3d2817] hover:scale-110 transition-transform">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {locations.map((loc) => {
              const isCurrent = loc.x === currentX && loc.y === currentY;
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelectLocation(loc.x, loc.y)}
                  className={`w-full text-left p-3 border-2 transition-all group ${
                    isCurrent 
                      ? 'bg-[#3d2817] border-[#3d2817] text-[#f4e4bc]' 
                      : 'border-[#3d2817]/20 hover:border-[#3d2817] hover:bg-[#3d2817]/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="historical-font font-bold text-sm tracking-tight uppercase">
                      {loc.name}
                    </span>
                    {isCurrent && <MapPin size={12} />}
                  </div>
                  <p className={`text-[10px] leading-tight ${isCurrent ? 'text-amber-100/70' : 'text-[#3d2817]/60'}`}>
                    {loc.desc}
                  </p>
                  {!isCurrent && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-[#3d2817] uppercase tracking-widest">
                      <Navigation size={10} /> Commute to district
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-[#3d2817]/40 text-center italic border-t border-[#3d2817]/20 pt-4">
            "By the grace of the Barada, we travel safely."
          </div>
        </div>
      </div>
    </div>
  );
};

export const UI: React.FC<UIProps> = ({ params, setParams, stats, playerStats, nearBuilding, onFastTravel }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [reportTab, setReportTab] = useState<'epidemic' | 'player'>('epidemic');

  const handleChange = (key: keyof SimulationParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleChange('uiMinimized', !params.uiMinimized);
    }
  };

  const getBuildingTypeLabel = (type: BuildingType) => {
    switch (type) {
      case BuildingType.RESIDENTIAL: return 'Private Residence';
      case BuildingType.COMMERCIAL: return 'Merchant Stall';
      case BuildingType.RELIGIOUS: return 'Holy Sanctuary';
      case BuildingType.CIVIC: return 'Governor\'s Office';
      default: return 'Structure';
    }
  };

  const getDateStr = () => {
    const startDate = new Date(1348, 5, 1);
    const currentDate = new Date(startDate.getTime() + stats.simTime * 60 * 60 * 1000);
    return currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getTimeStr = () => {
    const h = Math.floor(params.timeOfDay);
    const m = Math.floor((params.timeOfDay - h) * 60);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
  };

  const formatHeight = (scale: number) => `${Math.round(scale * 170)} cm`;
  const formatWeight = (scale: number) => `${Math.round(scale * 70)} kg`;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10 text-amber-50">
      
      {/* TOP NAV BAR */}
      <div 
        className="w-full h-16 bg-black/80 backdrop-blur-md border-b border-amber-900/30 px-6 flex items-center justify-between pointer-events-auto cursor-pointer shadow-xl"
        onClick={toggleMinimize}
      >
        <div className="flex flex-col" onClick={e => e.stopPropagation()}>
          <h1 className="text-lg md:text-xl font-bold text-amber-500 historical-font tracking-tighter leading-none">
            PLAGUE SIMULATOR
          </h1>
          <span className="text-[10px] text-amber-200/50 uppercase tracking-[0.3em] font-light">DAMASCUS 1348</span>
        </div>

        <div 
          className="hidden md:flex items-center gap-6 bg-amber-950/20 px-6 py-2 rounded-full border border-amber-800/20"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-amber-100/90">
            <Calendar size={14} className="text-amber-500" />
            <span className="text-xs font-mono tracking-widest uppercase">{getDateStr()}</span>
          </div>
          <div className="w-px h-4 bg-amber-800/30" />
          <div className="flex items-center gap-2 text-amber-100/90">
            {params.timeOfDay > 6 && params.timeOfDay < 18 ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
            <span className="text-xs font-mono tracking-widest">{getTimeStr()}</span>
          </div>
          
          <div className="w-px h-4 bg-amber-800/30 ml-2" />
          
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button 
              onClick={() => handleChange('simulationSpeed', 0)}
              className={`p-1.5 rounded transition-all ${params.simulationSpeed === 0 ? 'bg-red-700 text-white shadow-[0_0_10px_rgba(185,28,28,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
              title="Freeze Simulation"
            >
              <Pause size={14} />
            </button>
            <button 
              onClick={() => handleChange('simulationSpeed', 1)}
              className={`p-1.5 rounded transition-all ${params.simulationSpeed === 1 ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(185,158,11,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
              title="Normal Speed"
            >
              <Play size={14} />
            </button>
            <button 
              onClick={() => handleChange('simulationSpeed', 4)}
              className={`p-1.5 rounded transition-all ${params.simulationSpeed === 4 ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(185,158,11,0.5)]' : 'hover:bg-white/10 text-gray-400'}`}
              title="Fast Forward"
            >
              <FastForward size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
          <div className="hidden lg:flex flex-col items-end mr-4 text-[9px] text-amber-500/50 uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2"><span>Arrows to Move</span><Keyboard size={10}/></div>
            <div className="flex items-center gap-2"><span>WASD to Look</span><MousePointer2 size={10}/></div>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-amber-500 hover:text-amber-400 transition-colors"
          >
            {showSettings ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* CENTER LOCATION PILLS */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-xs md:max-w-md pointer-events-none">
        <button 
          onClick={() => setShowMap(true)}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-md px-5 py-2 rounded-full border border-amber-600/40 text-amber-500 shadow-xl flex items-center gap-3 pointer-events-auto transition-all group active:scale-95"
        >
          <div className="bg-amber-500/10 p-1 rounded-full group-hover:bg-amber-500/20 transition-colors">
            <MapIcon size={14} />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="historical-font text-[10px] md:text-xs whitespace-nowrap tracking-wider font-bold">
              {getLocationLabel(params.mapX, params.mapY)}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-amber-500/40 font-light mt-1">Open Overworld Map</span>
          </div>
        </button>

        {nearBuilding && (
          <div className="bg-black/60 backdrop-blur-lg p-3 rounded-xl border border-amber-600/30 shadow-2xl w-full transition-all duration-300 animate-in fade-in slide-in-from-top-4 pointer-events-auto">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-amber-400 font-bold text-[10px] historical-font tracking-tight uppercase">
                {getBuildingTypeLabel(nearBuilding.type)}
              </h3>
              <Info size={12} className="text-amber-600/50" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-amber-100">
                <User size={10} className="text-amber-500/70" />
                <span className="text-xs font-semibold">{nearBuilding.ownerName}</span>
                <span className="text-[10px] text-amber-100/50">Age {nearBuilding.ownerAge}</span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <span className="text-[9px] uppercase tracking-widest text-amber-400/80 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/30 font-bold">
                  {nearBuilding.ownerProfession}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OVERWORLD MAP MODAL */}
      {showMap && (
        <MapModal 
          currentX={params.mapX} 
          currentY={params.mapY} 
          onClose={() => setShowMap(false)} 
          onSelectLocation={(x, y) => {
            onFastTravel(x, y);
            setShowMap(false);
          }}
        />
      )}

      {/* FLOATING WINDOWS */}
      <div className={`flex flex-col flex-1 justify-between p-4 md:p-6 transition-all duration-500 ${params.uiMinimized ? 'opacity-0 scale-95 pointer-events-none translate-y-4' : 'opacity-100 scale-100'}`}>
        
        {/* Reports Panel */}
        <div className="self-end md:self-start mt-12 md:mt-0 w-full md:w-[360px]">
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-lg border border-amber-800/50 shadow-lg pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
              <h4 className="text-[10px] text-amber-500/60 uppercase tracking-[0.3em] font-bold">Reports Panel</h4>
              <div className="flex gap-1 bg-amber-950/40 p-1 rounded-full border border-amber-900/40">
                <button
                  onClick={() => setReportTab('epidemic')}
                  className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all ${
                    reportTab === 'epidemic' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  Epidemic
                </button>
                <button
                  onClick={() => setReportTab('player')}
                  className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all ${
                    reportTab === 'player' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  Player
                </button>
              </div>
            </div>

            {reportTab === 'epidemic' ? (
              <div className="space-y-4">
                <div className="text-right md:text-left">
                  <h5 className="text-[10px] text-amber-500/50 uppercase tracking-[0.2em] mb-3 font-bold">Epidemic Report</h5>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-white">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 min-w-[70px]">Healthy</span>
                      <span className="font-mono text-lg">{stats.healthy}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    </div>
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-yellow-300">
                      <span className="text-[10px] uppercase tracking-wider text-yellow-300/70 min-w-[70px]">Incubating</span>
                      <span className="font-mono text-lg">{stats.incubating}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    </div>
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-red-400">
                      <span className="text-[10px] uppercase tracking-wider text-red-400/70 min-w-[70px]">Infected</span>
                      <span className="font-mono text-lg">{stats.infected}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                    </div>
                    <div className="flex items-center md:flex-row-reverse justify-end gap-3 text-gray-500">
                      <span className="text-[10px] uppercase tracking-wider text-gray-600 min-w-[70px]">Deceased</span>
                      <span className="font-mono text-lg">{stats.deceased}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/50 p-3 rounded-lg border border-amber-900/40 shadow-inner">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <span className="historical-font text-amber-500 text-xs uppercase tracking-widest">Alchemist's Table</span>
                    <div className="text-[9px] text-amber-100/30 italic">Drag to modify</div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="flex items-center gap-1 font-bold"><Skull size={10}/> Contact Virulence</span>
                        <span className="font-mono">{Math.round(params.infectionRate * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.01"
                        value={params.infectionRate}
                        onChange={(e) => handleChange('infectionRate', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-amber-100/80 uppercase tracking-tighter">
                        <span className="flex items-center gap-1 font-bold">Sanitation Protocol</span>
                        <span className="font-mono">{Math.round(params.hygieneLevel * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={params.hygieneLevel}
                        onChange={(e) => handleChange('hygieneLevel', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleChange('quarantine', !params.quarantine)}
                        className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-[10px] tracking-widest uppercase border ${
                          params.quarantine 
                            ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <ShieldAlert size={14} />
                        {params.quarantine ? 'QUARANTINE ENFORCED' : 'Enable Quarantine'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-[11px] text-amber-50/90">
                <div className="flex items-center justify-between">
                  <div className="historical-font text-amber-400 text-sm uppercase tracking-widest">Player Report</div>
                  <div className="text-[9px] text-amber-100/40 uppercase tracking-[0.2em]">Citizen Dossier</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Name</div>
                    <div className="font-bold">{playerStats.name}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Profession</div>
                    <div className="font-bold">{playerStats.profession}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Class</div>
                    <div className="font-bold">{playerStats.socialClass}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Age</div>
                    <div className="font-bold">{playerStats.age} Years</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Gender</div>
                    <div className="font-bold">{playerStats.gender}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Health</div>
                    <div className="font-bold text-emerald-300">{playerStats.healthStatus}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Height</div>
                    <div className="font-bold">{formatHeight(playerStats.height)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500/60">Weight</div>
                    <div className="font-bold">{formatWeight(playerStats.weight)}</div>
                  </div>
                </div>
                <div className="border-t border-amber-900/40 pt-3 text-[10px] text-amber-100/70">
                  <span className="uppercase tracking-widest text-amber-500/60">Family</span>
                  <div className="mt-1">{playerStats.family}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end pointer-events-auto">
          {/* Camera Settings Panel */}
          <div className="bg-black/70 backdrop-blur-lg p-3 rounded-xl border border-amber-900/50 shadow-2xl flex flex-col gap-2">
            <span className="text-[9px] uppercase tracking-widest text-amber-500/80 font-bold mb-1 px-1">Observation Perspective</span>
            <div className="grid grid-cols-1 gap-1">
              <button 
                onClick={() => handleChange('cameraMode', CameraMode.THIRD_PERSON)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${params.cameraMode === CameraMode.THIRD_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <Camera size={12} /> Orbit View
              </button>
              <button 
                onClick={() => handleChange('cameraMode', CameraMode.OVERHEAD)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${params.cameraMode === CameraMode.OVERHEAD ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <Layers size={12} /> Overhead Map
              </button>
              <button 
                onClick={() => handleChange('cameraMode', CameraMode.FIRST_PERSON)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${params.cameraMode === CameraMode.FIRST_PERSON ? 'bg-amber-700 text-white shadow-md' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <Eye size={12} /> Eyes of a Soul
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MENU OVERLAY */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center pointer-events-auto p-8 animate-in fade-in zoom-in-95">
          <button 
            onClick={() => setShowSettings(false)}
            className="absolute top-6 right-6 p-4 text-amber-500 hover:text-amber-400"
          >
            <X size={32} />
          </button>
          
          <div className="max-w-2xl w-full flex flex-col gap-8">
            <div className="text-center border-b border-amber-900/30 pb-6">
              <h2 className="historical-font text-4xl text-amber-500 mb-2 tracking-tighter">DAMASCUS 1348</h2>
              <p className="text-amber-100/50 uppercase tracking-[0.4em] text-xs">Simulated Reality Engine</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm text-amber-50/80 leading-relaxed">
              <div>
                <h3 className="historical-font text-amber-400 text-lg mb-4">Historical Context</h3>
                <p>In 1348, the Black Death reached Damascus from Gaza. This simulation explores the dynamics of infection in the winding souks of the era. Use the controls to observe the spread and attempt to mitigate the disaster.</p>
                <div className="mt-6 p-4 bg-amber-950/30 border border-amber-900/40 rounded-lg">
                  <h4 className="text-xs font-bold text-amber-500 uppercase mb-2">Controls Guide</h4>
                  <ul className="text-[11px] space-y-1">
                    <li><span className="text-amber-200">ARROWS:</span> Move character</li>
                    <li><span className="text-amber-200">WASD:</span> Adjust Camera / Look</li>
                    <li><span className="text-amber-200">SHIFT:</span> Sprint</li>
                    <li><span className="text-amber-200">PAUSE (TOP):</span> Stop time & movement</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="historical-font text-amber-400 text-lg mb-4">Simulation Logic</h3>
                <ul className="space-y-2 list-disc pl-4">
                  <li>Pathogens spread via proximity (2m contact).</li>
                  <li>Incubation period: 1 Simulation Hour.</li>
                  <li>Symptomatic state: After 2 hours.</li>
                  <li>Mortality risk peaks at 24 hours post-infection.</li>
                  <li>Rats congregate where sanitation falls below 40%.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center mt-12">
               <button 
                 onClick={() => setShowSettings(false)}
                 className="bg-amber-600 hover:bg-amber-500 text-white px-12 py-3 rounded-full historical-font tracking-widest text-xl transition-all shadow-[0_0_30px_rgba(217,119,6,0.2)]"
               >
                 RETURN TO OBSERVATION
               </button>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.5em] text-amber-100/20 pointer-events-none transition-opacity duration-700 ${params.uiMinimized ? 'opacity-100' : 'opacity-0'}`}>
        Click Top Bar to Restore Interface
      </div>
    </div>
  );
};
