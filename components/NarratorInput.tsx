import React from 'react';

interface NarratorInputProps {
  onOpen: () => void;
}

export const NarratorInput: React.FC<NarratorInputProps> = ({ onOpen }) => {
  return (
    <input
      type="text"
      placeholder="Ask the narrator…"
      onFocus={onOpen}
      onClick={onOpen}
      className="w-[320px] md:w-[360px] max-w-[92vw] rounded-full bg-black/10 text-white/50 placeholder:text-white/25 text-[11px] px-4 py-2.5 backdrop-blur-md border border-white/10 focus:outline-none focus:border-white/25 focus:bg-black/30 focus:text-white/90 focus:placeholder:text-white/40 hover:bg-black/15 hover:border-white/15 transition-all duration-300 pointer-events-auto shadow-lg"
    />
  );
};
