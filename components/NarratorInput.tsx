import React from 'react';

interface NarratorInputProps {
  onOpen: () => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const NarratorInput: React.FC<NarratorInputProps> = ({ onOpen, value, onChange, onSubmit, disabled = false, isLoading = false }) => {
  return (
    <input
      type="text"
      placeholder={isLoading ? 'Listening…' : 'Ask the narrator…'}
      onFocus={onOpen}
      onClick={onOpen}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSubmit();
        }
      }}
      disabled={disabled}
      className="w-[280px] md:w-[360px] max-w-[85vw] rounded-full bg-black/10 text-white/50 placeholder:text-white/25 text-base px-4 py-2.5 backdrop-blur-md border border-white/10 focus:outline-none focus:border-white/25 focus:bg-black/30 focus:text-white/90 focus:placeholder:text-white/40 hover:bg-black/15 hover:border-white/15 transition-all duration-300 pointer-events-auto shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
};
