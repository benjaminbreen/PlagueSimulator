/**
 * Al-Nāy (Reed Flute) Music System - Authentic Middle Eastern Version
 * Distance-based ambient music for Snake Charmer Sufi
 *
 * Uses authentic pentatonic Middle Eastern scale with smooth portamento
 * No loops, continuous flowing melody
 */

import React, { useEffect, useRef, useCallback } from 'react';

interface FluteMusicProps {
  distance: number;
  enabled?: boolean;
}

// Bright pentatonic scale - cheerful and pleasant
// Major pentatonic for uplifting, playful character
const SCALE_DEGREES = [
  1.0,      // Root (Tonic)
  1.125,    // Major second
  1.25,     // Major third
  1.5,      // Perfect fifth
  1.667,    // Major sixth
  2.0       // Octave
];

const BASE_FREQ = 220; // A3 - bright, cheerful register
const MAX_DISTANCE = 25;
const MAX_VOLUME = 0.06; // Much softer

export const FluteMusic: React.FC<FluteMusicProps> = ({ distance, enabled = true }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const melodyIndexRef = useRef(0);
  const lastNoteTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playful, upbeat melody pattern - snake charming dance tune
  // Bouncy, cheerful character with clear phrases
  const MELODY_PATTERN = [
    0, 1, 2, 1, 0, 1, 2, // Opening ascending run
    3, 3, 2, 2, 1, 1, 0, // Descending with repeats - playful
    0, 2, 4, 3, 2, 1, 0, // Jump to high note and return
    1, 2, 3, 2, 1, // Middle phrase
    4, 4, 3, 2, // High dance
    3, 2, 1, 0, 0, // Return home
    // Variation - more energetic
    0, 1, 2, 3, 4, 3, 2, 1, // Fast run up and down
    0, 2, 0, 2, 0, // Bouncy alternation
    1, 3, 1, 3, // More bouncing
    2, 4, 2, 1, 0 // Final flourish
  ];

  const NOTE_DURATION = 0.35; // Much faster, lively tempo

  // Initialize audio context once
  useEffect(() => {
    if (!enabled) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  // Audio update loop
  const updateAudio = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || !enabled) return;

    const shouldPlay = distance < MAX_DISTANCE && distance > 0;
    const volume = Math.max(0, Math.min(1, (MAX_DISTANCE - distance) / MAX_DISTANCE)) * MAX_VOLUME;

    // Start playing if in range and not already playing
    if (shouldPlay && !isPlayingRef.current) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create oscillator (bright, clean flute sound)
      oscillatorRef.current = ctx.createOscillator();
      oscillatorRef.current.type = 'sine'; // Pure, clear tone
      oscillatorRef.current.frequency.value = BASE_FREQ;

      // Create filter for bright, pleasant flute tone
      filterRef.current = ctx.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.frequency.value = 3500; // Brighter, clearer
      filterRef.current.Q.value = 0.5; // Smooth, pleasant rolloff

      // Create LFO for gentle vibrato
      lfoRef.current = ctx.createOscillator();
      lfoRef.current.frequency.value = 5.5; // Lively vibrato
      lfoGainRef.current = ctx.createGain();
      lfoGainRef.current.gain.value = 3; // Subtle, pleasant variation

      // Create gain node for volume control
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = 0;

      // Connect audio graph
      lfoRef.current.connect(lfoGainRef.current);
      lfoGainRef.current.connect(oscillatorRef.current.frequency);
      oscillatorRef.current.connect(filterRef.current);
      filterRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);

      // Start oscillators
      oscillatorRef.current.start();
      lfoRef.current.start();

      isPlayingRef.current = true;
      melodyIndexRef.current = 0;
      lastNoteTimeRef.current = ctx.currentTime;
    }

    // Update volume and melody if playing
    if (isPlayingRef.current && gainNodeRef.current && oscillatorRef.current) {
      const now = ctx.currentTime;

      // Smoothly fade volume based on distance
      gainNodeRef.current.gain.setTargetAtTime(volume, now, 0.15);

      // Check if it's time for next note
      if (now - lastNoteTimeRef.current >= NOTE_DURATION) {
        // Get next note from melody pattern
        const scaleDegree = MELODY_PATTERN[melodyIndexRef.current % MELODY_PATTERN.length];
        const targetFreq = BASE_FREQ * SCALE_DEGREES[scaleDegree];

        // Quick, snappy pitch transitions for playful character
        oscillatorRef.current.frequency.cancelScheduledValues(now);
        oscillatorRef.current.frequency.setValueAtTime(oscillatorRef.current.frequency.value, now);
        oscillatorRef.current.frequency.exponentialRampToValueAtTime(targetFreq, now + NOTE_DURATION * 0.2);

        // Bouncy articulation envelope - clear note attacks
        gainNodeRef.current.gain.cancelScheduledValues(now);
        gainNodeRef.current.gain.setValueAtTime(volume * 0.3, now);
        gainNodeRef.current.gain.linearRampToValueAtTime(volume, now + 0.02); // Quick attack
        gainNodeRef.current.gain.setValueAtTime(volume, now + NOTE_DURATION * 0.6);
        gainNodeRef.current.gain.linearRampToValueAtTime(volume * 0.4, now + NOTE_DURATION); // Clear separation

        melodyIndexRef.current++;
        lastNoteTimeRef.current = now;
      }
    }

    // Stop if too far away
    if (!shouldPlay && isPlayingRef.current) {
      if (gainNodeRef.current && oscillatorRef.current && lfoRef.current) {
        const now = ctx.currentTime;
        gainNodeRef.current.gain.setTargetAtTime(0, now, 0.4);

        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
        }

        cleanupTimeoutRef.current = setTimeout(() => {
          try {
            oscillatorRef.current?.stop();
            lfoRef.current?.stop();
          } catch (e) {
            // Already stopped
          }
          oscillatorRef.current?.disconnect();
          lfoRef.current?.disconnect();
          filterRef.current?.disconnect();
          gainNodeRef.current?.disconnect();
          lfoGainRef.current?.disconnect();

          oscillatorRef.current = null;
          lfoRef.current = null;
          filterRef.current = null;
          gainNodeRef.current = null;
          lfoGainRef.current = null;

          isPlayingRef.current = false;
          cleanupTimeoutRef.current = null;
        }, 600);
      }
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudio);
  }, [distance, enabled]);

  // Start/stop audio loop based on enabled state
  useEffect(() => {
    if (enabled) {
      updateAudio();
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      if (isPlayingRef.current) {
        try {
          oscillatorRef.current?.stop();
          lfoRef.current?.stop();
        } catch (e) {
          // Already stopped
        }
        oscillatorRef.current?.disconnect();
        lfoRef.current?.disconnect();
        filterRef.current?.disconnect();
        gainNodeRef.current?.disconnect();
        lfoGainRef.current?.disconnect();

        isPlayingRef.current = false;
      }
    };
  }, [enabled, updateAudio]);

  return null;
};
