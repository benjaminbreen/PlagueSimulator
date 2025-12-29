import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { X, MessageCircle, History, Send, AlertTriangle, Heart, LogOut, ChevronDown } from 'lucide-react';
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
import { ConversationImpact } from '../../utils/friendliness';
import { MoraleStats } from '../Agents';
import { useConversation } from './useConversation';
import * as THREE from 'three';

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
    currentActivity: string;
    localRumors: string[];
  };
  publicMorale: MoraleStats;
  simulationStats: SimulationStats;
  conversationHistory: ConversationSummary[];
  onClose: () => void;
  /** Called when conversation ends with both summary and impact */
  onConversationResult: (npcId: string, summary: ConversationSummary, impact: ConversationImpact) => void;
  /** If true, the NPC approached the player (not vice versa) - uses different greeting style */
  isNPCInitiated?: boolean;
}

// Animated portrait wrapper with lifelike breathing, speaking, and idle animations
const AnimatedPortrait: React.FC<{
  npc: NPCStats;
  isSpeaking: boolean;
}> = ({ npc, isSpeaking }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Animation state refs
  const breathPhase = useRef(0);
  const speakIntensity = useRef(0);
  const headNodPhase = useRef(0);
  const headTurnTarget = useRef(0);
  const headTurnCurrent = useRef(0);
  const idleLookTimer = useRef(Math.random() * 3);
  const emphasisTimer = useRef(0);
  const emphasisActive = useRef(false);
  const bodySway = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // === BREATHING ===
    breathPhase.current += delta * 0.7;
    const breathAmount = Math.sin(breathPhase.current) * 0.006;
    const breathY = Math.sin(breathPhase.current) * 0.002;

    // === SPEAKING ANIMATION ===
    if (isSpeaking) {
      speakIntensity.current = Math.min(1, speakIntensity.current + delta * 3);
      headNodPhase.current += delta * (4 + Math.sin(t * 0.7) * 1.5);
      emphasisTimer.current += delta;
      if (emphasisTimer.current > 1.5 + Math.random() * 2) {
        emphasisTimer.current = 0;
        emphasisActive.current = true;
      }
      bodySway.current += delta * 1.2;
    } else {
      speakIntensity.current = Math.max(0, speakIntensity.current - delta * 2);
      headNodPhase.current *= 0.95;
      emphasisActive.current = false;
    }

    // === IDLE LOOK AROUND ===
    idleLookTimer.current -= delta;
    if (idleLookTimer.current <= 0) {
      headTurnTarget.current = (Math.random() - 0.5) * 0.15;
      idleLookTimer.current = 2 + Math.random() * 4;
    }
    headTurnCurrent.current += (headTurnTarget.current - headTurnCurrent.current) * delta * 2;

    // === EMPHASIS DECAY ===
    const emphasisAmount = emphasisActive.current ?
      Math.max(0, 1 - emphasisTimer.current * 3) : 0;
    if (emphasisAmount <= 0) emphasisActive.current = false;

    // === CALCULATE FINAL TRANSFORMS ===
    const speak = speakIntensity.current;
    const nodAmount = Math.sin(headNodPhase.current) * 0.025 * speak;
    const swayAmount = Math.sin(bodySway.current) * 0.008 * speak;
    const emphasisLean = emphasisAmount * 0.03;
    const idleShift = Math.sin(t * 0.3) * 0.002;

    groupRef.current.position.set(
      swayAmount + idleShift,
      -1.65 + breathY + emphasisAmount * 0.01,
      emphasisLean
    );

    groupRef.current.rotation.set(
      nodAmount + emphasisLean * 0.5,
      headTurnCurrent.current + swayAmount * 2,
      swayAmount * 0.5
    );

    groupRef.current.scale.setScalar(1 + breathAmount);
  });

  return (
    <group ref={groupRef} position={[0, -1.65, 0.0]}>
      <Humanoid
        color={npc.robeBaseColor}
        headColor="#c9a87c"
        turbanColor={npc.headwearColor}
        headscarfColor={npc.headwearColor}
        robeAccentColor={npc.robeAccentColor}
        hairColor={npc.hairColor}
        facialHair={npc.facialHair}
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
        // Portrait mode animations
        portraitMode={true}
        isSpeaking={isSpeaking}
        mood={npc.mood}
        panicLevel={npc.panicLevel}
      />
    </group>
  );
};

// Speaking glow ring effect
const SpeakingGlow: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (!ringRef.current) return;
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;

    if (isSpeaking) {
      opacity.current = Math.min(0.4, opacity.current + delta * 2);
      // Pulsing effect
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
      mat.opacity = opacity.current * pulse;
    } else {
      opacity.current = Math.max(0, opacity.current - delta * 3);
      mat.opacity = opacity.current;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, -0.5, -0.3]} rotation={[-0.2, 0, 0]}>
      <ringGeometry args={[0.4, 0.55, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
};

function renderMessageContent(content: string): React.ReactNode[] {
  const parts = content.split(/(\*[^*]+\*)/g);
  return parts.map((part, index) => {
    const isItalic = part.startsWith('*') && part.endsWith('*') && part.length > 2;
    if (isItalic) {
      return <em key={`italic-${index}`}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  npc,
  player,
  environment,
  publicMorale,
  simulationStats,
  conversationHistory,
  onClose,
  onConversationResult,
  isNPCInitiated = false
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'history'>('conversation');
  const [inputValue, setInputValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [nativeLanguageMode, setNativeLanguageMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      nearbyDeceased: environment.nearbyDeceased,
      currentActivity: environment.currentActivity,
      localRumors: environment.localRumors
    },
    publicMorale,
    simulationStats,
    conversationHistory: conversationHistory.filter(h => h.npcId === npc.id),
    nativeLanguageMode
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
    onConversationEnd: (result) => {
      onConversationResult(npc.id, result.summary, result.impact);
    },
    isNPCInitiated
  });

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Animate bars on mount
  useEffect(() => {
    const timer = setTimeout(() => setBarsAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (isVisible && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

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

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 3);
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClose = async () => {
    if (messages.length > 1 && !hasSummarizedRef.current) {
      hasSummarizedRef.current = true;
      await endConversation();
    }
    // Exit animation
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    setIsExiting(true);
    setTimeout(onClose, 200);
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

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pointer-events-auto transition-opacity duration-200 ${
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop with blur animation */}
      <div
        className={`absolute inset-0 bg-black/70 transition-all duration-300 ${
          isVisible && !isExiting ? 'backdrop-blur-sm' : 'backdrop-blur-none'
        }`}
      />

      {/* Modal Container with scale animation */}
      <div
        className={`relative w-full max-w-4xl max-h-[95vh] bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-800/50 rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out ${
          isVisible && !isExiting
            ? 'scale-100 translate-y-0'
            : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/40 bg-black/30">
          <div className="flex items-center gap-3">
            <h3 className="text-xs sm:text-sm text-amber-500/80 uppercase tracking-[0.3em] font-semibold">
              Encounter
            </h3>
            {/* Status chips with entry animation */}
            <div className={`hidden sm:flex items-center gap-2 transition-all duration-500 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            }`}>
              <span className={`text-[10px] px-2 py-0.5 rounded-full transition-colors duration-300 ${
                npc.panicLevel > 60 ? 'bg-red-900/40 text-red-300' :
                npc.panicLevel > 40 ? 'bg-amber-900/40 text-amber-300' :
                'bg-emerald-900/40 text-emerald-300'
              }`}>
                {npc.panicLevel > 60 ? 'Panicked' : npc.panicLevel > 40 ? 'Anxious' : 'Calm'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800/60 text-stone-300">
                {getAwarenessLabel(npc.awarenessLevel)}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 text-amber-100/50 hover:text-amber-100 hover:rotate-90"
            title="Close (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

          {/* Left Column - Portrait & Info */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-amber-900/30 bg-black/20 flex flex-col flex-shrink-0">

            {/* Portrait Container */}
            <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-b from-amber-950/30 to-black/50 overflow-hidden">
              {/* Ambient glow behind portrait */}
              <div className={`absolute inset-0 bg-gradient-radial from-amber-900/20 via-transparent to-transparent transition-opacity duration-1000 ${
                isLoading ? 'opacity-100' : 'opacity-40'
              }`} />

              <div className="absolute inset-3 border border-amber-600/20 rounded-md pointer-events-none" />

              <Canvas
                camera={{ position: [0, 0.4, 1.8], fov: 30 }}
                style={{ background: 'transparent' }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 3, 2]} intensity={0.9} color="#ffeedd" />
                <directionalLight position={[-2, 1, 1]} intensity={0.7} color="#aabbff" />
                {/* Speaking glow effect */}
                <SpeakingGlow isSpeaking={isLoading} />
                {/* Animated portrait */}
                <AnimatedPortrait npc={npc} isSpeaking={isLoading} />
              </Canvas>

              {/* Speaking indicator overlay */}
              {isLoading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full border border-amber-600/30">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-amber-300/80">Speaking...</span>
                  </div>
                </div>
              )}

              {/* Decorative frame corners with shimmer */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-600/40" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-600/40" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-600/40" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-600/40" />
            </div>

            {/* NPC Info Panel */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-0">
              {/* Name with fade-in */}
              <div className={`text-center pt-2 pb-3 border-b border-amber-900/30 transition-all duration-500 delay-100 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <h2 className="text-lg sm:text-xl historical-font text-amber-100 tracking-wide">
                  {npc.name}
                </h2>
                <p className="text-[11px] text-amber-500/70 mt-1 uppercase tracking-widest">
                  {npc.gender} • {npc.age} years
                </p>
              </div>

              {/* Profession & Class with staggered fade-in */}
              <div className={`space-y-2 transition-all duration-500 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
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

              {/* Mood & Mental State with animated bars */}
              <div className={`pt-3 border-t border-amber-900/30 space-y-2 transition-all duration-500 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest">Mood</span>
                  <span className={`text-sm ${getMoodColor()} transition-colors duration-500`}>{npc.mood}</span>
                </div>

                {/* Awareness Bar - Animated fill */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-100/40 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Awareness
                    </span>
                    <span className="text-xs text-amber-100/60">{Math.round(npc.awarenessLevel)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 ease-out"
                      style={{
                        width: barsAnimated ? `${npc.awarenessLevel}%` : '0%',
                        boxShadow: barsAnimated ? '0 0 8px rgba(251, 191, 36, 0.4)' : 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Panic Bar - Animated fill */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-100/40 uppercase tracking-widest flex items-center gap-1">
                      <Heart size={10} />
                      Panic
                    </span>
                    <span className="text-xs text-amber-100/60">{Math.round(npc.panicLevel)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${
                        npc.panicLevel > 60 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                        npc.panicLevel > 40 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                        'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      }`}
                      style={{
                        width: barsAnimated ? `${npc.panicLevel}%` : '0%',
                        boxShadow: barsAnimated && npc.panicLevel > 60
                          ? '0 0 8px rgba(239, 68, 68, 0.5)'
                          : barsAnimated && npc.panicLevel > 40
                            ? '0 0 8px rgba(249, 115, 22, 0.4)'
                            : barsAnimated
                              ? '0 0 8px rgba(34, 197, 94, 0.3)'
                              : 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Goal of Day */}
              {npc.goalOfDay && (
                <div className={`pt-3 border-t border-amber-900/30 transition-all duration-500 delay-400 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  <span className="text-[11px] text-amber-100/40 uppercase tracking-widest block mb-1">Today's Goal</span>
                  <p className="text-xs text-amber-100/70 italic leading-relaxed">
                    "{npc.goalOfDay}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Conversation Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* Tabs with sliding indicator */}
            <div className="flex border-b border-amber-900/30 bg-black/20 relative">
              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-amber-500 transition-all duration-300 ease-out"
                style={{
                  left: activeTab === 'conversation' ? '0%' : '50%',
                  width: '50%'
                }}
              />
              <button
                onClick={() => setActiveTab('conversation')}
                className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-[0.3em] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'conversation'
                    ? 'text-amber-300'
                    : 'text-amber-100/40 hover:text-amber-100/60'
                }`}
              >
                <MessageCircle size={14} className={activeTab === 'conversation' ? 'animate-pulse' : ''} />
                Conversation
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-[0.3em] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'history'
                    ? 'text-amber-300'
                    : 'text-amber-100/40 hover:text-amber-100/60'
                }`}
              >
                <History size={14} />
                History ({npcHistory.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'conversation' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Error Banner with slide animation */}
                {error && (
                  <div className="px-4 py-2 bg-red-900/30 border-b border-red-800/50 text-red-300 text-xs flex items-center justify-between animate-slideDown">
                    <span>Connection issue - using fallback responses</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-300 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="px-4 pt-3 pb-1 flex justify-end">
                  <button
                    onClick={() => setNativeLanguageMode(prev => !prev)}
                    className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      nativeLanguageMode
                        ? 'bg-amber-600/80 text-amber-50 border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                        : 'bg-stone-900/60 text-amber-100/50 border-amber-900/40 hover:text-amber-100/80 hover:border-amber-700/60'
                    }`}
                    title="Toggle real language mode"
                  >
                    Real language mode
                  </button>
                </div>

                {/* Messages Area with proper scroll containment */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scroll-smooth"
                >
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
                      style={{
                        animation: `slideUp 0.3s ease-out ${index * 0.05}s both`
                      }}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 transform transition-all duration-200 hover:scale-[1.01] ${
                          msg.role === 'player'
                            ? 'bg-amber-800/40 text-amber-50 rounded-br-sm hover:bg-amber-800/50'
                            : 'bg-stone-800/75 text-stone-100 rounded-bl-sm border border-stone-700/50 hover:bg-stone-800/85'
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {renderMessageContent(msg.content)}
                        </p>
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
                    <div className="flex justify-start animate-fadeIn">
                      <div className="bg-stone-800/60 rounded-lg px-4 py-3 border border-stone-700/30">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to bottom button */}
                {showScrollButton && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute right-6 bottom-24 p-2 bg-amber-700/90 hover:bg-amber-600 text-amber-100 rounded-full shadow-lg transition-all duration-200 animate-fadeIn hover:scale-110"
                    title="Scroll to bottom"
                  >
                    <ChevronDown size={20} />
                  </button>
                )}

                {/* Input Area */}
                <div className="p-3 border-t border-amber-900/30 bg-black/30 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask your question..."
                      disabled={isLoading}
                      className="flex-1 bg-stone-900/80 border border-amber-900/30 rounded-lg px-4 py-2.5 text-sm text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isLoading}
                      className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        inputValue.trim() && !isLoading
                          ? 'bg-amber-600 hover:bg-amber-500 text-amber-50 shadow-lg shadow-amber-900/30 hover:shadow-amber-800/40 hover:scale-105'
                          : 'bg-stone-700/50 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <Send size={16} className={inputValue.trim() && !isLoading ? 'animate-pulse' : ''} />
                      <span className="hidden sm:inline text-sm">Send</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-amber-100/30">
                      Press Enter to send • {messages.length} messages
                    </p>
                    <button
                      onClick={handleEndTalk}
                      className="text-[10px] text-amber-100/40 hover:text-amber-100/70 flex items-center gap-1 transition-all duration-200 hover:gap-2"
                    >
                      <LogOut size={10} />
                      End conversation
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* History Tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {npcHistory.length > 0 ? (
                  npcHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-900/40 border border-amber-900/20 rounded-lg p-4 transition-all duration-200 hover:bg-stone-900/60 hover:border-amber-900/40"
                      style={{
                        animation: `slideUp 0.3s ease-out ${idx * 0.1}s both`
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-amber-500/70 font-medium uppercase tracking-widest">
                          Day {Math.floor(entry.simTime / 24)} · Hour {Math.floor(entry.simTime % 24)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
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
                    <History size={32} className="mb-2 opacity-50 animate-pulse" />
                    <p className="text-sm">No previous conversations with {npc.name}</p>
                    <p className="text-xs mt-1 opacity-60">This is your first meeting</p>
                  </div>
                )}

                {/* End Talk Button */}
                <div className="pt-4 border-t border-amber-900/30 mt-4">
                  <button
                    onClick={handleEndTalk}
                    className="w-full py-3 bg-stone-800/60 hover:bg-stone-700/60 text-amber-100/80 rounded-lg transition-all duration-200 text-sm font-medium border border-amber-900/30 flex items-center justify-center gap-2 hover:border-amber-800/50 hover:shadow-lg"
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

      {/* CSS Keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EncounterModal;
