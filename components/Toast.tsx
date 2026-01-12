import React, { useEffect, useState, useRef } from 'react';

export interface ToastMessage {
  id: string;
  message?: string;
  text?: string;  // Alternative field name for backwards compatibility
  type?: 'success' | 'error' | 'info' | 'item';
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ messages, onDismiss }) => {
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    messages.forEach((msg) => {
      // Skip if we've already processed this message
      if (processedIds.current.has(msg.id)) return;
      processedIds.current.add(msg.id);

      // Show the message after a brief delay for animation
      const showTimer = setTimeout(() => {
        setVisibleMessages((prev) => new Set(prev).add(msg.id));
      }, 50);

      // Auto-dismiss after duration
      const duration = msg.duration ?? 4000;
      const dismissTimer = setTimeout(() => {
        setVisibleMessages((prev) => {
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
        // Give time for slide-out animation before removing from DOM
        setTimeout(() => {
          onDismiss(msg.id);
          processedIds.current.delete(msg.id);
        }, 300);
      }, duration);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    });
  }, [messages, onDismiss]);

  // Clean up processed IDs when messages are removed externally
  useEffect(() => {
    const currentIds = new Set(messages.map(m => m.id));
    processedIds.current.forEach(id => {
      if (!currentIds.has(id)) {
        processedIds.current.delete(id);
      }
    });
  }, [messages]);

  if (messages.length === 0) return null;

  // Get display text from either 'message' or 'text' field
  const getDisplayText = (msg: ToastMessage) => msg.message || msg.text || '';

  // Get border color based on type
  const getBorderColor = (type?: string) => {
    switch (type) {
      case 'error': return 'border-red-800/50';
      case 'success': return 'border-green-800/40';
      case 'item': return 'border-amber-600/50';
      case 'info': return 'border-sky-600/50';
      default: return 'border-amber-900/30';
    }
  };

  // Limit visible toasts (max 4 on desktop, 2 on mobile)
  const displayMessages = messages.slice(-4);
  const mobileMessages = messages.slice(-2);

  return (
    <>
      {/* Mobile: Top position, more compact, stacked */}
      <div className="md:hidden fixed top-16 left-1/2 -translate-x-1/2 z-[10000] flex flex-col-reverse gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-sm">
        {mobileMessages.map((msg, index) => (
          <div
            key={msg.id}
            style={{
              transform: visibleMessages.has(msg.id)
                ? `translateY(0)`
                : `translateY(-12px)`,
              opacity: visibleMessages.has(msg.id) ? 1 : 0,
              transitionDelay: `${index * 50}ms`
            }}
            className={`
              bg-black/90 text-amber-100 px-4 py-2.5 rounded-lg
              text-sm leading-snug
              shadow-lg border ${getBorderColor(msg.type)}
              text-center
              transition-all duration-300 ease-out
            `}
          >
            {getDisplayText(msg)}
          </div>
        ))}
      </div>

      {/* Desktop: Bottom position, stacked upward */}
      <div className="hidden md:flex fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] flex-col-reverse gap-2 pointer-events-none items-center">
        {displayMessages.map((msg, index) => (
          <div
            key={msg.id}
            style={{
              transform: visibleMessages.has(msg.id)
                ? `translateY(0)`
                : `translateY(20px)`,
              opacity: visibleMessages.has(msg.id) ? 1 : 0,
              transitionDelay: `${index * 50}ms`
            }}
            className={`
              bg-black/95 text-[#f4e4c1] px-6 py-3 rounded-lg
              font-serif text-sm leading-relaxed
              shadow-lg border ${getBorderColor(msg.type)}
              text-center max-w-lg
              transition-all duration-300 ease-out
            `}
          >
            {getDisplayText(msg)}
          </div>
        ))}
      </div>
    </>
  );
};
