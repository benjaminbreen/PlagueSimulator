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

// Authentic Middle Eastern pentatonic scale (similar to Hijaz maqam)
// Using frequency ratios for microtonal accuracy
const SCALE_DEGREES = [
  1.0,      // Root (Tonic)
  1.067,    // Minor second
  1.333,    // Perfect fourth
  1.5,      // Perfect fifth
  1.778,    // Minor seventh
  2.0       // Octave
];

const BASE_FREQ = 196; // G3 - warm, meditative register
const MAX_DISTANCE = 25;
const MAX_VOLUME = 0.12;

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

  // Flowing melody pattern (scale degree indices)
  // Designed to sound meditative and continuous, not repetitive
  const MELODY_PATTERN = [
    0, 0, 1, 0, // Opening phrase
    2, 1, 0, // Descending
    3, 3, 2, 1, // Middle phrase
    0, 1, 2, 3, // Ascending
    4, 3, 2, // High descent
    1, 0, 0, // Return to tonic
    2, 3, 4, // Rise again
    3, 2, 1, 0, // Final descent
    // Variation
    0, 2, 3, 2,
    1, 0, 3, 2,
    4, 3, 1, 0,
    2, 1, 0, 0
  ];

  const NOTE_DURATION = 1.2; // Longer, more meditative tempo

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

      // Create oscillator (flute sound with triangle wave for warmth)
      oscillatorRef.current = ctx.createOscillator();
      oscillatorRef.current.type = 'triangle'; // Warmer than sine
      oscillatorRef.current.frequency.value = BASE_FREQ;

      // Create filter for breathy flute tone
      filterRef.current = ctx.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.frequency.value = 1800; // Softer, less bright
      filterRef.current.Q.value = 0.7; // Gentle rolloff

      // Create LFO for vibrato (very subtle)
      lfoRef.current = ctx.createOscillator();
      lfoRef.current.frequency.value = 4.5; // Slower, more natural
      lfoGainRef.current = ctx.createGain();
      lfoGainRef.current.gain.value = 6; // More subtle variation

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

        // Smooth portamento (pitch slide) instead of abrupt changes
        oscillatorRef.current.frequency.cancelScheduledValues(now);
        oscillatorRef.current.frequency.setValueAtTime(oscillatorRef.current.frequency.value, now);
        oscillatorRef.current.frequency.exponentialRampToValueAtTime(targetFreq, now + NOTE_DURATION * 0.4);

        // Subtle breath envelope - not too pronounced
        gainNodeRef.current.gain.cancelScheduledValues(now);
        gainNodeRef.current.gain.setValueAtTime(volume * 0.8, now);
        gainNodeRef.current.gain.linearRampToValueAtTime(volume, now + 0.08);
        gainNodeRef.current.gain.setValueAtTime(volume, now + NOTE_DURATION * 0.7);
        gainNodeRef.current.gain.linearRampToValueAtTime(volume * 0.85, now + NOTE_DURATION);

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
