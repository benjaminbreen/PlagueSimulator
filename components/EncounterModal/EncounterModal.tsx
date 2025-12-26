import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { X, MessageCircle, History, Send, AlertTriangle, Heart, LogOut } from 'lucide-react';
import { Humanoid } from '../Humanoid';
import {
  NPCStats,
  PlayerStats,
  SocialClass,
  SimulationStats,
  ConversationSummary,
  EncounterContext,
  getLocationLabel
} from '../../types';
import { MoraleStats } from '../Agents';
import { useConversation } from './useConversation';
import { seededRandom } from '../../utils/procedural';

interface EncounterModalProps {
  npc: NPCStats;
  player: PlayerStats;
  environment: {
    timeOfDay: number;
    weather: string;
    mapX: number;
    mapY: number;
    nearbyInfected: number;
    nearbyDeceased: number;
  };
  publicMorale: MoraleStats;
  simulationStats: SimulationStats;
  conversationHistory: ConversationSummary[];
  onClose: () => void;
  onSummaryGenerated: (summary: ConversationSummary) => void;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  npc,
  player,
  environment,
  publicMorale,
  simulationStats,
  conversationHistory,
  onClose,
  onSummaryGenerated
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'history'>('conversation');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSummarizedRef = useRef(false);

  // Build context for conversation
  const context: EncounterContext = {
    npc,
    player,
    environment: {
      timeOfDay: environment.timeOfDay,
      weather: environment.weather,
      district: getLocationLabel(environment.mapX, environment.mapY),
      nearbyInfected: environment.nearbyInfected,
      nearbyDeceased: environment.nearbyDeceased
    },
    publicMorale,
    simulationStats,
    conversationHistory: conversationHistory.filter(h => h.npcId === npc.id)
  };

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    endConversation,
    clearError
  } = useConversation({
    npc,
    context,
    onSummaryGenerated
  });

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClose = async () => {
    if (messages.length > 1 && !hasSummarizedRef.current) {
      hasSummarizedRef.current = true;
      await endConversation();
    }
    onClose();
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndTalk = async () => {
    if (!hasSummarizedRef.current) {
      hasSummarizedRef.current = true;
      await endConversation();
    }
    onClose();
  };

  // Get mood color based on panic/awareness
  const getMoodColor = () => {
    if (npc.panicLevel > 60) return 'text-red-400';
    if (npc.panicLevel > 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getAwarenessLabel = (level: number) => {
    if (level < 20) return 'Oblivious';
    if (level < 40) return 'Rumors';
    if (level < 60) return 'Concerned';
    if (level < 80) return 'Alarmed';
    return 'Terrified';
  };

  // Filter history for this NPC
  const npcHistory = conversationHistory.filter(h => h.npcId === npc.id);
  const npcSeed = Number(npc.id.split('-')[1] || '1');
  const tone = seededRandom(npcSeed + 11);
  const skin = `hsl(${26 + Math.round(tone * 8)}, ${28 + Math.round(tone * 18)}%, ${30 + Math.round(tone * 18)}%)`;
  const hairPalette = ['#1d1b18', '#2a1a12', '#3b2a1a', '#4a3626'];
  const hair = hairPalette[Math.floor(seededRandom(npcSeed + 17) * hairPalette.length)];
  const scarfPalette = ['#d6c2a4', '#c7b08c', '#c2a878', '#bfa57e'];
  const scarf = scarfPalette[Math.floor(seededRandom(npcSeed + 29) * scarfPalette.length)];
  const robePalette = ['#6f6a3f', '#7b5a4a', '#6b5a45', '#5c4b3a', '#4a4f59'];
  const robe = robePalette[Math.floor(seededRandom(npcSeed + 41) * robePalette.length)];
  const accentPalette = ['#e1d3b3', '#d9c9a8', '#cbb58c', '#bfa57e'];
  const accent = accentPalette[Math.floor(seededRandom(npcSeed + 43) * accentPalette.length)];
  const headwearPalette = ['#8b2e2e', '#1f1f1f', '#cbb48a', '#7b5a4a', '#3f5d7a'];
  const headwearIndex = Math.floor(seededRandom(npcSeed + 55) * headwearPalette.length);
  const headwear = npc.headwearStyle === 'straw'
    ? '#cbb48a'
    : npc.headwearStyle === 'fez'
      ? (seededRandom(npcSeed + 57) > 0.5 ? '#8b2e2e' : '#cbb48a')
      : headwearPalette[headwearIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl max-h-[95vh] bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-800/50 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/40 bg-black/30">
          <div className="flex items-center gap-3">
            <h3 className="text-xs sm:text-sm text-amber-500/80 uppercase tracking-[0.3em] font-semibold">
              Encounter
            </h3>
            {/* Status chips */}
            <div className="hidden sm:flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                npc.panicLevel > 60 ? 'bg-red-900/40 text-red-300' :
                npc.panicLevel > 40 ? 'bg-amber-900/40 text-amber-300' :
                'bg-emerald-900/40 text-emerald-300'
              }`}>
                {npc.panicLevel > 60 ? 'Panicked' : npc.panicLevel > 40 ? 'Anxious' : 'Calm'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full bg-stone-800/60 text-stone-300`}>
                {getAwarenessLabel(npc.awarenessLevel)}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-amber-100/50 hover:text-amber-100"
            title="Close (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Left Column - Portrait & Info */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-amber-900/30 bg-black/20 flex flex-col">

            {/* Portrait Container */}
            <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-b from-amber-950/30 to-black/50">
              <div className="absolute inset-3 border border-amber-600/20 rounded-md pointer-events-none" />
              <Canvas
                camera={{ position: [0, 0.4, 1.8], fov: 30 }}
                style={{ background: 'transparent' }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 3, 2]} intensity={0.9} color="#ffeedd" />
                <directionalLight position={[-2, 1, 1]} intensity={0.7} color="#aabbff" />
                <group position={[0, -1.65, 0.0]}>
                  <Humanoid
                    color={npc.gender === 'Female' ? robe : '#5c4b3a'}
                    headColor={skin}
                    turbanColor={headwear}
                    headscarfColor={scarf}
                    robeAccentColor={accent}
                    hairColor={hair}
                    gender={npc.gender}
                    scale={[1, 1, 1]}
                    robeHasTrim={npc.robeHasTrim}
                    robeHemBand={npc.robeHemBand}
                    robeSpread={npc.robeSpread}
                    robeOverwrap={npc.robeOverwrap}
                    robePattern={npc.robePattern}
                    hairStyle={npc.hairStyle}
                    headwearStyle={npc.headwearStyle}
                    sleeveCoverage={npc.sleeveCoverage}
                    footwearStyle={npc.footwearStyle}
                    footwearColor={npc.footwearColor}
                    accessories={npc.accessories}
                    sicknessLevel={0}
                    isDead={false}
                    isWalking={false}
                    walkSpeed={0}
                    distanceFromCamera={2}
                  />
                </group>
              </Canvas>

              {/* Decorative frame corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-600/40" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-600/40" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-600/40" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-600/40" />
            </div>

            {/* NPC Info Panel */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {/* Name */}
              <div className="text-center pt-2 pb-3 border-b border-amber-900/30">
                <h2 className="text-lg sm:text-xl historical-font text-amber-100 tracking-wide">
                  {npc.name}
                </h2>
                <p className="text-[11px] text-amber-500/70 mt-1 uppercase tracking-widest">
                  {npc.gender} • {npc.age} years
                </p>
              </div>

              {/* Profession & Class */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest">Profession</span>
                  <span className="text-sm text-amber-100/90">{npc.profession}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest">Class</span>
                  <span className={`text-sm px-2 py-0.5 rounded text-xs ${
                    npc.socialClass === SocialClass.NOBILITY ? 'bg-purple-900/40 text-purple-300' :
                    npc.socialClass === SocialClass.CLERGY ? 'bg-blue-900/40 text-blue-300' :
                    npc.socialClass === SocialClass.MERCHANT ? 'bg-amber-900/40 text-amber-300' :
                    'bg-stone-800/40 text-stone-300'
                  }`}>
                    {npc.socialClass}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest">Ethnicity</span>
                  <span className="text-sm text-amber-100/90">{npc.ethnicity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest">Religion</span>
                  <span className={`text-sm px-2 py-0.5 rounded text-xs ${
                    npc.religion === 'Sunni Islam' ? 'bg-amber-900/40 text-amber-200' :
                    npc.religion === 'Shia Islam' ? 'bg-amber-900/40 text-amber-300' :
                    npc.religion === 'Eastern Orthodox' ? 'bg-sky-900/40 text-sky-200' :
                    npc.religion === 'Armenian Apostolic' ? 'bg-rose-900/40 text-rose-200' :
                    npc.religion === 'Syriac Orthodox' ? 'bg-cyan-900/40 text-cyan-200' :
                    npc.religion === 'Jewish' ? 'bg-emerald-900/40 text-emerald-200' :
                    'bg-stone-800/40 text-stone-300'
                  }`}>
                    {npc.religion}
                  </span>
                </div>
              </div>

              {/* Mood & Mental State */}
              <div className="pt-3 border-t border-amber-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest">Mood</span>
                  <span className={`text-sm ${getMoodColor()}`}>{npc.mood}</span>
                </div>

                {/* Awareness Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-100/40 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Awareness
                    </span>
                    <span className="text-xs text-amber-100/60">{npc.awarenessLevel}%</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                      style={{ width: `${npc.awarenessLevel}%` }}
                    />
                  </div>
                </div>

                {/* Panic Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-100/40 uppercase tracking-widest flex items-center gap-1">
                      <Heart size={10} />
                      Panic
                    </span>
                    <span className="text-xs text-amber-100/60">{npc.panicLevel}%</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        npc.panicLevel > 60 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                        npc.panicLevel > 40 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                        'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      }`}
                      style={{ width: `${npc.panicLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Goal of Day */}
              {npc.goalOfDay && (
                <div className="pt-3 border-t border-amber-900/30">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest block mb-1">Today's Goal</span>
                  <p className="text-xs text-amber-100/70 italic leading-relaxed">
                    "{npc.goalOfDay}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Conversation Panel */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* Tabs */}
            <div className="flex border-b border-amber-900/30 bg-black/20">
              <button
                onClick={() => setActiveTab('conversation')}
                className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-[0.3em] font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'conversation'
                    ? 'text-amber-300 border-b-2 border-amber-500'
                    : 'text-amber-100/40 hover:text-amber-100/60'
                }`}
              >
                <MessageCircle size={14} />
                Conversation
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-[0.3em] font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'history'
                    ? 'text-amber-300 border-b-2 border-amber-500'
                    : 'text-amber-100/40 hover:text-amber-100/60'
                }`}
              >
                <History size={14} />
                History ({npcHistory.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'conversation' ? (
              <>
                {/* Error Banner */}
                {error && (
                  <div className="px-4 py-2 bg-red-900/30 border-b border-red-800/50 text-red-300 text-xs flex items-center justify-between">
                    <span>Connection issue - using fallback responses</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-300">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                          msg.role === 'player'
                            ? 'bg-amber-800/40 text-amber-50 rounded-br-sm'
                            : 'bg-stone-800/75 text-stone-100 rounded-bl-sm border border-stone-700/50'
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.role === 'player' ? 'text-amber-400/50' : 'text-stone-400/50'
                        }`}>
                          {msg.role === 'player' ? 'You' : npc.name.split(' ')[0]}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-stone-800/60 rounded-lg px-4 py-3 border border-stone-700/30">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - sticky on mobile */}
                <div className="p-3 border-t border-amber-900/30 bg-black/30 sticky bottom-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask your question..."
                      disabled={isLoading}
                      className="flex-1 bg-stone-900/80 border border-amber-900/30 rounded-lg px-4 py-2.5 text-sm text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isLoading}
                      className="px-4 py-2.5 bg-amber-700/80 hover:bg-amber-600/80 disabled:bg-stone-700/50 disabled:cursor-not-allowed text-amber-100 rounded-lg transition-all flex items-center gap-2"
                    >
                      <Send size={16} />
                      <span className="hidden sm:inline text-sm">Send</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-amber-100/30">
                      Press Enter to send
                    </p>
                    <button
                      onClick={handleEndTalk}
                      className="text-[10px] text-amber-100/40 hover:text-amber-100/60 flex items-center gap-1 transition-colors"
                    >
                      <LogOut size={10} />
                      End conversation
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* History Tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {npcHistory.length > 0 ? (
                  npcHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-900/40 border border-amber-900/20 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-amber-500/70 font-medium uppercase tracking-widest">
                          Day {Math.floor(entry.simTime / 24)} · Hour {Math.floor(entry.simTime % 24)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          entry.sentiment === 'positive' ? 'bg-emerald-900/40 text-emerald-400' :
                          entry.sentiment === 'negative' ? 'bg-red-900/40 text-red-400' :
                          'bg-stone-800/40 text-stone-400'
                        }`}>
                          {entry.sentiment}
                        </span>
                      </div>
                      <p className="text-sm text-amber-100/80 leading-relaxed">{entry.summary}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-amber-100/30 py-12">
                    <History size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No previous conversations with {npc.name}</p>
                    <p className="text-xs mt-1 opacity-60">This is your first meeting</p>
                  </div>
                )}

                {/* End Talk Button */}
                <div className="pt-4 border-t border-amber-900/30 mt-4">
                  <button
                    onClick={handleEndTalk}
                    className="w-full py-3 bg-stone-800/60 hover:bg-stone-700/60 text-amber-100/80 rounded-lg transition-all text-sm font-medium border border-amber-900/30 flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    End Conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncounterModal;
