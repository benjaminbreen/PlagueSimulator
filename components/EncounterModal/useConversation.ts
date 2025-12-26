import { useState, useCallback, useRef } from 'react';
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
  generateInitialGreeting
} from '../../utils/conversationContext';

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

interface UseConversationOptions {
  npc: NPCStats;
  context: EncounterContext;
  onSummaryGenerated?: (summary: ConversationSummary) => void;
}

interface UseConversationReturn {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  endConversation: () => Promise<ConversationSummary | null>;
  clearError: () => void;
}

export function useConversation({
  npc,
  context,
  onSummaryGenerated
}: UseConversationOptions): UseConversationReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    // Start with NPC greeting
    const greeting = generateInitialGreeting(npc, context.environment.timeOfDay);
    return [{
      id: `msg-${Date.now()}`,
      role: 'npc' as const,
      content: greeting,
      timestamp: Date.now()
    }];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache the system prompt to avoid rebuilding on every message
  const systemPromptRef = useRef<string>(buildSystemPrompt(context));

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
      const trimmedMessages = trimConversationHistory(messages, 10);
      const formattedMessages = formatMessagesForGemini(trimmedMessages);

      // Call Gemini API directly
      const responseText = await callChatAPI(
        systemPromptRef.current,
        formattedMessages,
        content.trim()
      );

      // Add NPC response
      const npcMessage: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'npc',
        content: responseText,
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
  }, [messages, isLoading, npc]);

  const endConversation = useCallback(async (): Promise<ConversationSummary | null> => {
    if (messages.length < 2) return null;

    // Generate summary locally (could also use API for better summaries)
    const playerMessages = messages.filter(m => m.role === 'player').map(m => m.content);
    const npcMessages = messages.filter(m => m.role === 'npc').map(m => m.content);

    // Simple sentiment analysis based on keywords
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

    const positiveWords = ['thank', 'bless', 'peace', 'help', 'friend', 'kind', 'good'];
    const negativeWords = ['fear', 'death', 'plague', 'curse', 'flee', 'danger', 'sick'];

    const positiveCount = positiveWords.filter(w => allText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => allText.includes(w)).length;

    if (positiveCount > negativeCount + 1) sentiment = 'positive';
    else if (negativeCount > positiveCount + 1) sentiment = 'negative';

    // Create a simple summary
    const topicSnippet = playerMessages[0]?.slice(0, 50) || 'brief exchange';
    const summary: ConversationSummary = {
      npcId: npc.id,
      simTime: context.simulationStats.simTime,
      summary: `Spoke with ${npc.name} about ${topicSnippet}...`,
      sentiment
    };

    if (onSummaryGenerated) {
      onSummaryGenerated(summary);
    }

    return summary;
  }, [messages, npc, context.simulationStats.simTime, onSummaryGenerated]);

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
    `*${npc.name} seems distracted and doesn't respond clearly*`,
    `*The ${npc.profession.toLowerCase()} glances around nervously* I... I must go.`,
    `*${npc.name} mutters something unintelligible*`,
    `Forgive me, my mind wanders. These are troubling times.`,
    `*pauses, as if lost in thought* What were you saying?`
  ];

  if (npc.panicLevel > 60) {
    return `*${npc.name} is too frightened to speak coherently*`;
  }

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
