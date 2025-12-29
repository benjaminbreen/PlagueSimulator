import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ messages, onDismiss }) => {
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    messages.forEach((msg) => {
      // Show the message
      setTimeout(() => {
        setVisibleMessages((prev) => new Set(prev).add(msg.id));
      }, 50);

      // Auto-dismiss after duration
      const duration = msg.duration ?? 5000;
      const timer = setTimeout(() => {
        setVisibleMessages((prev) => {
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
        // Give time for slide-out animation
        setTimeout(() => onDismiss(msg.id), 300);
      }, duration);

      return () => clearTimeout(timer);
    });
  }, [messages, onDismiss]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-3 pointer-events-none max-w-[90vw]">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`
            bg-black/95 text-[#f4e4c1] px-6 py-4 rounded-lg
            font-serif text-base leading-relaxed
            shadow-lg border border-amber-900/30
            text-center max-w-2xl
            transition-all duration-300 ease-out
            ${visibleMessages.has(msg.id)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-5'
            }
          `}
        >
          {msg.message}
        </div>
      ))}
    </div>
  );
};
