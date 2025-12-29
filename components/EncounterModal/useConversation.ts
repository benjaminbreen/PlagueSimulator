import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ConversationMessage,
  ConversationSummary,
  EncounterContext,
  NPCStats
} from '../../types';
import {
  buildSystemPrompt,
  formatMessagesForGemini,
  trimConversationHistory,
  generateInitialGreeting,
  generateNPCInitiatedGreeting
} from '../../utils/conversationContext';
import {
  analyzeConversationImpact,
  ConversationImpact
} from '../../utils/friendliness';

// Call serverless chat route to keep API key off the client.
async function callChatAPI(
  systemPrompt: string,
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[],
  playerMessage: string
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      messages,
      playerMessage
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.response;

  if (!responseText) {
    throw new Error('No response from Gemini');
  }

  return responseText;
}

function sanitizeNpcResponse(text: string): string {
  if (!text) return '';
  // Just normalize whitespace, preserve all content including *italics*
  return text.replace(/\s{2,}/g, ' ').trim();
}

interface ConversationResult {
  summary: ConversationSummary;
  impact: ConversationImpact;
}

interface UseConversationOptions {
  npc: NPCStats;
  context: EncounterContext;
  onConversationEnd?: (result: ConversationResult) => void;
  /** If true, the NPC initiated this encounter by approaching the player */
  isNPCInitiated?: boolean;
}

interface UseConversationReturn {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  endConversation: () => Promise<ConversationResult | null>;
  clearError: () => void;
}

export function useConversation({
  npc,
  context,
  onConversationEnd,
  isNPCInitiated = false
}: UseConversationOptions): UseConversationReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    // Generate appropriate greeting based on who initiated the encounter
    // NPC-initiated uses proactive approach greetings, player-initiated uses reactive greetings
    const greeting = isNPCInitiated
      ? generateNPCInitiatedGreeting(
          npc,
          context.environment.timeOfDay,
          context.player,
          context.conversationHistory
        )
      : generateInitialGreeting(
          npc,
          context.environment.timeOfDay,
          context.player,
          context.conversationHistory
        );
    return [{
      id: `msg-${Date.now()}`,
      role: 'npc' as const,
      content: greeting,
      timestamp: Date.now()
    }];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ConversationMessage[]>(messages);

  // Cache the system prompt to avoid rebuilding on every message
  const systemPromptRef = useRef<string>(buildSystemPrompt(context));

  useEffect(() => {
    systemPromptRef.current = buildSystemPrompt(context);
  }, [context]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add player message
    const playerMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'player',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, playerMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for API (trim to avoid token overflow)
      const trimmedMessages = trimConversationHistory(messagesRef.current, 10);
      const formattedMessages = formatMessagesForGemini(trimmedMessages);

      // Call Gemini API directly
      const responseText = await callChatAPI(
        systemPromptRef.current,
        formattedMessages,
        content.trim()
      );

      // Add NPC response
      const sanitizedResponse = sanitizeNpcResponse(responseText);
      const npcMessage: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'npc',
        content: sanitizedResponse || getFallbackResponse(npc),
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, npcMessage]);

    } catch (err) {
      console.error('Conversation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');

      // Add a fallback NPC response for offline/error cases
      const fallbackMessage: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'npc',
        content: getFallbackResponse(npc),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, fallbackMessage]);

    } finally {
      setIsLoading(false);
    }
  }, [isLoading, npc]);

  const endConversation = useCallback(async (): Promise<ConversationResult | null> => {
    if (messages.length < 2) return null;

    // Analyze conversation impact on NPC disposition and panic
    const impact = analyzeConversationImpact(messages);

    // Generate summary locally
    const playerMessages = messages.filter(m => m.role === 'player').map(m => m.content);

    // Create a simple summary
    const topicSnippet = playerMessages[0]?.slice(0, 50) || 'brief exchange';
    const summary: ConversationSummary = {
      npcId: npc.id,
      simTime: context.simulationStats.simTime,
      summary: `Spoke with ${npc.name} about ${topicSnippet}...`,
      sentiment: impact.sentiment // Use sentiment from impact analysis
    };

    const result: ConversationResult = { summary, impact };

    if (onConversationEnd) {
      onConversationEnd(result);
    }

    return result;
  }, [messages, npc, context.simulationStats.simTime, onConversationEnd]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    endConversation,
    clearError
  };
}

// Fallback responses for when API fails
function getFallbackResponse(npc: NPCStats): string {
  const fallbacks = [
    `${npc.name} seems distracted and doesn't respond clearly.`,
    `The ${npc.profession.toLowerCase()} glances around nervously. I... I must go.`,
    `${npc.name} mutters something unintelligible.`,
    `Forgive me, my mind wanders. These are troubling times.`,
    `What were you saying?`
  ];

  if (npc.panicLevel > 60) {
    return `${npc.name} is too frightened to speak coherently.`;
  }

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
