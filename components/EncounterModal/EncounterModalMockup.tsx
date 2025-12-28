import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { X, MessageCircle, History, Send, AlertTriangle, Heart } from 'lucide-react';
import { Humanoid } from '../Humanoid';
import { NPCStats, SocialClass } from '../../types';

// Sample NPC for mockup
const SAMPLE_NPC: NPCStats = {
  id: 'mockup-npc-1',
  name: 'Fatima al-Qasim',
  age: 34,
  profession: 'Spice Merchant',
  gender: 'Female',
  socialClass: SocialClass.MERCHANT,
  ethnicity: 'Arab',
  religion: 'Sunni Islam',
  language: 'Arabic',
  height: 0.95,
  weight: 0.9,
  disposition: 55,
  mood: 'Anxious',
  awarenessLevel: 67,
  panicLevel: 45,
  goalOfDay: 'Sell remaining saffron before the markets close',
  robeSpread: 0.9,
  robeHasTrim: true,
  robeHemBand: true,
  robeOverwrap: false,
  robePattern: 'damask',
  hairStyle: 'covered',
  headwearStyle: 'scarf',
  sleeveCoverage: 'full',
  footwearStyle: 'shoes',
  footwearColor: '#4a3728',
  accessories: [],
};

// Sample conversation messages
const SAMPLE_MESSAGES = [
  { id: '1', role: 'npc' as const, content: 'Peace be upon you, stranger. What brings you to my stall on such a grim day?', timestamp: 0 },
  { id: '2', role: 'player' as const, content: 'I seek information about the sickness spreading through the city.', timestamp: 1 },
  { id: '3', role: 'npc' as const, content: 'Ah, the pestilence... I have heard whispers from the caravans. They say entire villages to the east have been silenced. Allah protect us.', timestamp: 2 },
];

// Sample history for the History tab
const SAMPLE_HISTORY: Array<{ date: string; summary: string; sentiment: 'positive' | 'neutral' | 'negative' }> = [
  { date: 'Day 2, Morning', summary: 'Discussed trade routes and the rising price of cumin. She mentioned her family in Aleppo.', sentiment: 'positive' },
  { date: 'Day 1, Evening', summary: 'First meeting. She was suspicious but warmed up after I purchased some cardamom.', sentiment: 'neutral' },
];

interface EncounterModalMockupProps {
  onClose: () => void;
  npc?: NPCStats;
}

export const EncounterModalMockup: React.FC<EncounterModalMockupProps> = ({
  onClose,
  npc = SAMPLE_NPC
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'history'>('conversation');
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Add player message
    const newMessage = {
      id: `msg-${Date.now()}`,
      role: 'player' as const,
      content: inputValue,
      timestamp: Date.now(),
    };
    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate NPC typing response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'npc' as const,
        content: 'This is a mockup response. In the real version, Gemini AI will generate contextual responses based on the NPC\'s personality, mood, and the current situation.',
        timestamp: Date.now(),
      }]);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
      onClick={onClose}
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
          <h3 className="text-xs sm:text-sm text-amber-500/80 uppercase tracking-[0.2em] font-semibold">
            Encounter
          </h3>
          <button
            onClick={onClose}
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
              <Canvas
                camera={{ position: [0, 1.2, 1.8], fov: 35 }}
                style={{ background: 'transparent' }}
              >
                <ambientLight intensity={0.4} />
                <directionalLight position={[2, 3, 2]} intensity={0.8} color="#ffeedd" />
                <directionalLight position={[-2, 1, 1]} intensity={0.3} color="#aabbff" />
                <group position={[0, -0.9, 0]}>
                  <Humanoid
                    color="#8B6914"
                    headColor="#c4a574"
                    turbanColor="#2a4a6a"
                    headscarfColor="#6B4423"
                    robeAccentColor="#4a3520"
                    hairColor="#1a1a1a"
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
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {/* Name */}
              <div className="text-center pb-3 border-b border-amber-900/30">
                <h2 className="text-lg sm:text-xl font-serif text-amber-100 tracking-wide">
                  {npc.name}
                </h2>
                <p className="text-xs text-amber-500/60 mt-1">
                  {npc.gender} • {npc.age} years
                </p>
              </div>

              {/* Profession & Class */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-100/40 uppercase tracking-wider">Profession</span>
                  <span className="text-sm text-amber-100/90">{npc.profession}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-100/40 uppercase tracking-wider">Class</span>
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
                  <span className="text-xs text-amber-100/40 uppercase tracking-wider">Ethnicity</span>
                  <span className="text-sm text-amber-100/90">{npc.ethnicity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-100/40 uppercase tracking-wider">Religion</span>
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
                  <span className="text-xs text-amber-100/40 uppercase tracking-wider">Mood</span>
                  <span className={`text-sm ${getMoodColor()}`}>{npc.mood}</span>
                </div>

                {/* Awareness Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-100/40 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Awareness
                    </span>
                    <span className="text-xs text-amber-100/60">{getAwarenessLabel(npc.awarenessLevel)}</span>
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
                    <span className="text-xs text-amber-100/40 uppercase tracking-wider flex items-center gap-1">
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

              {/* Goal of Day (if present) */}
              {npc.goalOfDay && (
                <div className="pt-3 border-t border-amber-900/30">
                  <span className="text-xs text-amber-100/40 uppercase tracking-wider block mb-1">Today's Goal</span>
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
                className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'conversation'
                    ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-900/10'
                    : 'text-amber-100/40 hover:text-amber-100/60 hover:bg-white/5'
                }`}
              >
                <MessageCircle size={14} />
                Conversation
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'history'
                    ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-900/10'
                    : 'text-amber-100/40 hover:text-amber-100/60 hover:bg-white/5'
                }`}
              >
                <History size={14} />
                History
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'conversation' ? (
              <>
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
                            ? 'bg-amber-800/40 text-amber-100 rounded-br-sm'
                            : 'bg-stone-800/60 text-stone-100 rounded-bl-sm border border-stone-700/30'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.role === 'player' ? 'text-amber-400/50' : 'text-stone-400/50'
                        }`}>
                          {msg.role === 'player' ? 'You' : npc.name.split(' ')[0]}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
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

                {/* Input Area */}
                <div className="p-3 border-t border-amber-900/30 bg-black/30">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Speak with the merchant..."
                      className="flex-1 bg-stone-900/80 border border-amber-900/30 rounded-lg px-4 py-2.5 text-sm text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isTyping}
                      className="px-4 py-2.5 bg-amber-700/80 hover:bg-amber-600/80 disabled:bg-stone-700/50 disabled:cursor-not-allowed text-amber-100 rounded-lg transition-all flex items-center gap-2"
                    >
                      <Send size={16} />
                      <span className="hidden sm:inline text-sm">Send</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-100/30 mt-2 text-center">
                    Press Enter to send • ESC to close
                  </p>
                </div>
              </>
            ) : (
              /* History Tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {SAMPLE_HISTORY.length > 0 ? (
                  SAMPLE_HISTORY.map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-900/40 border border-amber-900/20 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-amber-500/70 font-medium">{entry.date}</span>
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
                  <div className="flex flex-col items-center justify-center h-full text-amber-100/30">
                    <History size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No previous conversations</p>
                  </div>
                )}

                {/* End Talk Button (in History view for mockup) */}
                <div className="pt-4 border-t border-amber-900/30 mt-4">
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-stone-800/60 hover:bg-stone-700/60 text-amber-100/80 rounded-lg transition-all text-sm font-medium border border-amber-900/30"
                  >
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

export default EncounterModalMockup;
