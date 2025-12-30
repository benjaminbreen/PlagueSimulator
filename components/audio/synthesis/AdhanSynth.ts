/**
 * Sacred Musical Themes - Medieval Middle Eastern Instruments
 * Creates haunting, atmospheric instrumental melodies using authentic 14th century
 * maqam scales and synthesized traditional instruments.
 *
 * Each variation uses a different instrument:
 * - Ney (reed flute) - breathy, hollow
 * - Oud (lute) - plucked, warm resonance
 * - Qanun (zither) - shimmering plucked strings
 * - Rebab (bowed fiddle) - sustained, sorrowful
 * - Santur (hammered dulcimer) - percussive shimmer
 * - Nay ensemble - layered reeds
 */

// Traditional maqam scales (modes used in Islamic sacred music)
// Each array represents intervals in semitones from root
const MAQAM_SCALES = {
  // Hijaz maqam - dramatic, traditional (Phrygian dominant)
  hijaz: [0, 1, 4, 5, 7, 8, 11, 12],
  // Rast maqam - joyful, celebratory (Major-like)
  rast: [0, 2, 4, 5, 7, 9, 11, 12],
  // Bayati maqam - contemplative, reflective
  bayati: [0, 2, 3, 5, 7, 8, 10, 12],
  // Saba maqam - deep, mournful
  saba: [0, 2, 3, 4, 6, 8, 10, 12],
  // Nahawand maqam - emotional, minor-like
  nahawand: [0, 2, 3, 5, 7, 8, 11, 12],
  // Ajam maqam - bright, Western major
  ajam: [0, 2, 4, 5, 7, 9, 11, 12],
};

export type MaqamName = keyof typeof MAQAM_SCALES;

// Traditional Middle Eastern melodies - authentic 14th century maqam patterns
// Longer, flowing melodies with proper phrasing
const SACRED_MELODIES = {
  // Ney (reed flute) - Saba maqam, descending lament - KEEP THIS ONE, USER LIKED IT
  ney: [
    { note: 7, duration: 2.5, sustain: true, ornament: true },
    { note: 6, duration: 0.4, sustain: false, ornament: false },
    { note: 4, duration: 1.8, sustain: true, ornament: true },
    { note: 3, duration: 0.5, sustain: false, ornament: false },
    { note: 2, duration: 2.0, sustain: true, ornament: true },
    { note: 4, duration: 1.2, sustain: true, ornament: false },
    { note: 3, duration: 0.6, sustain: false, ornament: false },
    { note: 0, duration: 3.0, sustain: true, ornament: true },
  ],

  // Vocal-like (human voice) - Bayati maqam, classic Arab taqsim (improvisation)
  voice: [
    { note: 0, duration: 2.0, sustain: true, ornament: false },
    { note: 2, duration: 2.5, sustain: true, ornament: true },
    { note: 3, duration: 1.5, sustain: true, ornament: true },
    { note: 5, duration: 3.0, sustain: true, ornament: true },
    { note: 7, duration: 2.0, sustain: true, ornament: false },
    { note: 5, duration: 1.8, sustain: true, ornament: true },
    { note: 3, duration: 2.2, sustain: true, ornament: false },
    { note: 2, duration: 2.0, sustain: true, ornament: true },
    { note: 3, duration: 1.5, sustain: true, ornament: false },
    { note: 5, duration: 2.8, sustain: true, ornament: true },
    { note: 3, duration: 2.0, sustain: true, ornament: false },
    { note: 2, duration: 2.5, sustain: true, ornament: true },
    { note: 0, duration: 4.0, sustain: true, ornament: true },
  ],

  // Smooth flute - Rast maqam, joyful ascending melody
  flute: [
    { note: 0, duration: 2.0, sustain: true, ornament: false },
    { note: 2, duration: 1.5, sustain: true, ornament: false },
    { note: 4, duration: 1.8, sustain: true, ornament: true },
    { note: 5, duration: 2.5, sustain: true, ornament: false },
    { note: 7, duration: 2.0, sustain: true, ornament: true },
    { note: 9, duration: 3.0, sustain: true, ornament: true },
    { note: 7, duration: 1.5, sustain: true, ornament: false },
    { note: 5, duration: 2.0, sustain: true, ornament: true },
    { note: 4, duration: 1.8, sustain: true, ornament: false },
    { note: 5, duration: 2.2, sustain: true, ornament: false },
    { note: 7, duration: 2.5, sustain: true, ornament: true },
    { note: 5, duration: 2.0, sustain: true, ornament: false },
    { note: 4, duration: 2.8, sustain: true, ornament: false },
    { note: 2, duration: 3.5, sustain: true, ornament: true },
  ],

  // Ethereal drone - Hijaz maqam, hypnotic circular pattern
  drone: [
    { note: 0, duration: 3.5, sustain: true, ornament: true },
    { note: 1, duration: 2.0, sustain: true, ornament: false },
    { note: 4, duration: 3.0, sustain: true, ornament: true },
    { note: 5, duration: 2.5, sustain: true, ornament: true },
    { note: 7, duration: 3.5, sustain: true, ornament: true },
    { note: 5, duration: 2.0, sustain: true, ornament: false },
    { note: 4, duration: 2.5, sustain: true, ornament: true },
    { note: 1, duration: 2.0, sustain: true, ornament: false },
    { note: 4, duration: 3.0, sustain: true, ornament: true },
    { note: 5, duration: 2.8, sustain: true, ornament: false },
    { note: 4, duration: 2.5, sustain: true, ornament: true },
    { note: 1, duration: 2.0, sustain: true, ornament: false },
    { note: 0, duration: 5.0, sustain: true, ornament: true },
  ],

  // Mystical bells - Nahawand maqam, slow meditative descent
  bells: [
    { note: 8, duration: 3.0, sustain: true, ornament: true },
    { note: 7, duration: 2.5, sustain: true, ornament: false },
    { note: 5, duration: 3.5, sustain: true, ornament: true },
    { note: 3, duration: 2.8, sustain: true, ornament: true },
    { note: 5, duration: 2.0, sustain: true, ornament: false },
    { note: 7, duration: 3.0, sustain: true, ornament: true },
    { note: 5, duration: 2.5, sustain: true, ornament: false },
    { note: 3, duration: 3.2, sustain: true, ornament: true },
    { note: 2, duration: 2.5, sustain: true, ornament: false },
    { note: 3, duration: 2.8, sustain: true, ornament: true },
    { note: 0, duration: 5.0, sustain: true, ornament: true },
  ],
};

export type MelodyName = keyof typeof SACRED_MELODIES;

// Mapping of instruments to their natural maqams
const MELODY_MAQAM_MAP: Record<MelodyName, MaqamName> = {
  ney: 'saba',         // Mournful reed flute (KEPT - user liked)
  voice: 'bayati',     // Vocal taqsim improvisation
  flute: 'rast',       // Joyful ascending flute
  drone: 'hijaz',      // Hypnotic circular drone
  bells: 'nahawand',   // Slow meditative bells
};

// Default melody for backward compatibility
const ADHAN_MELODY = SACRED_MELODIES.ney;
const HIJAZ_INTERVALS = MAQAM_SCALES.hijaz;

export interface AdhanOptions {
  baseFrequency?: number;  // Root note frequency (default: 180 Hz / ~F3)
  gain?: number;
  reverbWet?: number;
  vibratoRate?: number;
  vibratoDepth?: number;
  melody?: MelodyName;     // Which instrument/melody to use
  maqam?: MaqamName;       // Which scale to use
  onComplete?: () => void;
}

export class AdhanSynth {
  private ctx: AudioContext;
  private output: GainNode;
  private isPlaying: boolean = false;
  private scheduledOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private reverb: { input: GainNode; output: GainNode } | null = null;
  private currentInstrument: MelodyName = 'ney';

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0;
    this.createReverb();
  }

  private createReverb(): void {
    const input = this.ctx.createGain();
    const output = this.ctx.createGain();

    // Multiple delay lines for lush reverb
    const delayTimes = [0.05, 0.08, 0.11, 0.15, 0.21, 0.29];
    const feedbackAmount = 0.55;

    delayTimes.forEach((time, i) => {
      const delay = this.ctx.createDelay(1);
      delay.delayTime.value = time;

      const feedback = this.ctx.createGain();
      feedback.gain.value = feedbackAmount * (1 - i * 0.08);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000 - i * 300;

      input.connect(delay);
      delay.connect(filter);
      filter.connect(feedback);
      feedback.connect(delay);
      filter.connect(output);
    });

    this.reverb = { input, output };
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  /**
   * Play the Adhan
   * @param options Configuration options
   * @returns Promise that resolves when complete
   */
  async play(options: AdhanOptions = {}): Promise<void> {
    if (this.isPlaying) return;

    const {
      baseFrequency = 180,  // Lower for more haunting sound
      gain = 0.15,
      reverbWet = 0.6,
      vibratoRate = 5,
      vibratoDepth = 8,
      melody = 'ney',
      maqam,
      onComplete
    } = options;

    this.isPlaying = true;
    this.currentInstrument = melody;
    const now = this.ctx.currentTime;

    // Select melody and corresponding maqam
    const selectedMelody = SACRED_MELODIES[melody];
    const selectedMaqam = maqam || MELODY_MAQAM_MAP[melody];
    const scaleIntervals = MAQAM_SCALES[selectedMaqam];

    // Set up dry/wet mix
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 1 - reverbWet;
    dryGain.connect(this.output);

    const wetGain = this.ctx.createGain();
    wetGain.gain.value = reverbWet;
    if (this.reverb) {
      this.reverb.output.connect(wetGain);
    }
    wetGain.connect(this.output);

    // Fade in
    this.output.gain.setValueAtTime(0, now);
    this.output.gain.linearRampToValueAtTime(gain, now + 2);

    // Schedule each note
    let currentTime = now + 2; // Start after fade in

    for (const note of selectedMelody) {
      // Convert scale degree to frequency
      const semitones = scaleIntervals[note.note % 8];
      const octave = Math.floor(note.note / 8);
      const frequency = baseFrequency * Math.pow(2, (semitones + octave * 12) / 12);

      // Create the note with instrument-specific synthesis
      this.scheduleNote({
        frequency,
        startTime: currentTime,
        duration: note.duration,
        sustain: note.sustain,
        ornament: note.ornament || false,
        vibratoRate,
        vibratoDepth,
        dryGain,
        wetGain
      });

      currentTime += note.duration * 0.9; // Slight overlap
    }

    // Calculate total duration
    const totalDuration = selectedMelody.reduce((sum, n) => sum + n.duration * 0.9, 0) + 5;

    // Fade out
    const fadeOutStart = now + totalDuration - 3;
    this.output.gain.setValueAtTime(gain, fadeOutStart);
    this.output.gain.linearRampToValueAtTime(0, fadeOutStart + 3);

    // Wait for completion
    return new Promise((resolve) => {
      setTimeout(() => {
        this.stop();
        onComplete?.();
        resolve();
      }, totalDuration * 1000);
    });
  }

  private scheduleNote(params: {
    frequency: number;
    startTime: number;
    duration: number;
    sustain: boolean;
    ornament: boolean;
    vibratoRate: number;
    vibratoDepth: number;
    dryGain: GainNode;
    wetGain: GainNode;
  }): void {
    // Route to instrument-specific synthesis
    switch (this.currentInstrument) {
      case 'ney':
        this.scheduleNeyNote(params);
        break;
      case 'voice':
        this.scheduleVoiceNote(params);
        break;
      case 'flute':
        this.scheduleFluteNote(params);
        break;
      case 'drone':
        this.scheduleDroneNote(params);
        break;
      case 'bells':
        this.scheduleBellsNote(params);
        break;
    }
  }

  // Ney (reed flute) - Breathy, hollow, with air noise
  private scheduleNeyNote(params: any): void {
    const { frequency, startTime, duration, ornament, vibratoRate, vibratoDepth, dryGain } = params;

    // Breathy sine wave for flute
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    // Air noise (breath sound)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = frequency * 4;
    noiseFilter.Q.value = 2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.08;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // Ornament (grace note flutter)
    if (ornament) {
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 12;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = frequency * 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(carrier.frequency);
      lfo.start(startTime);
      lfo.stop(startTime + Math.min(0.3, duration));
      this.scheduledOscillators.push(lfo);
    }

    // Vibrato
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = vibratoRate;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = frequency * 0.01;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Envelope
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(1, startTime + 0.2);
    envelope.gain.setValueAtTime(1, startTime + duration - 0.3);
    envelope.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    carrier.connect(envelope);
    noiseGain.connect(envelope);
    envelope.connect(dryGain);
    if (this.reverb) envelope.connect(this.reverb.input);

    carrier.start(startTime);
    vibrato.start(startTime);
    noise.start(startTime);
    carrier.stop(startTime + duration);
    vibrato.stop(startTime + duration);
    noise.stop(startTime + duration);

    this.scheduledOscillators.push(carrier, vibrato, noise);
  }

  // Voice (human-like) - Warm vocal with formants
  private scheduleVoiceNote(params: any): void {
    const { frequency, startTime, duration, ornament, vibratoRate, dryGain } = params;

    // Warm vocal tone - triangle wave with formant filtering
    const carrier = this.ctx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.value = frequency;

    // Formant filter for vocal quality
    const formant = this.ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = frequency * 3;
    formant.Q.value = 4;

    // Deep vibrato for expression
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = ornament ? vibratoRate * 1.3 : vibratoRate * 0.8;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = frequency * 0.015;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Smooth sustained envelope
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.8, startTime + 0.25);
    envelope.gain.setValueAtTime(0.8, startTime + duration - 0.4);
    envelope.gain.linearRampToValueAtTime(0, startTime + duration);

    carrier.connect(formant);
    formant.connect(envelope);
    envelope.connect(dryGain);
    if (this.reverb) envelope.connect(this.reverb.input);

    carrier.start(startTime);
    vibrato.start(startTime);
    carrier.stop(startTime + duration);
    vibrato.stop(startTime + duration);

    this.scheduledOscillators.push(carrier, vibrato);
  }

  // Flute (smooth) - Pure tone with gentle vibrato
  private scheduleFluteNote(params: any): void {
    const { frequency, startTime, duration, ornament, vibratoRate, dryGain } = params;

    // Pure flute tone
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    // Subtle second harmonic for warmth
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = frequency * 2;
    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.value = 0.12;
    harmonic.connect(harmonicGain);

    // Gentle vibrato
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = ornament ? vibratoRate * 1.2 : vibratoRate * 0.9;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = frequency * 0.01;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Smooth envelope
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.7, startTime + 0.2);
    envelope.gain.setValueAtTime(0.7, startTime + duration - 0.35);
    envelope.gain.linearRampToValueAtTime(0, startTime + duration);

    carrier.connect(envelope);
    harmonicGain.connect(envelope);
    envelope.connect(dryGain);
    if (this.reverb) envelope.connect(this.reverb.input);

    carrier.start(startTime);
    harmonic.start(startTime);
    vibrato.start(startTime);
    carrier.stop(startTime + duration);
    harmonic.stop(startTime + duration);
    vibrato.stop(startTime + duration);

    this.scheduledOscillators.push(carrier, harmonic, vibrato);
  }

  // Drone (ethereal) - Layered harmonics with slow evolution
  private scheduleDroneNote(params: any): void {
    const { frequency, startTime, duration, ornament, vibratoRate, dryGain } = params;

    // Two detuned oscillators for richness
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * 1.002; // Slight detune for beating

    // Very slow vibrato for organic movement
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = ornament ? vibratoRate * 0.6 : vibratoRate * 0.4;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = frequency * 0.012;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc1.frequency);
    vibratoGain.connect(osc2.frequency);

    // Very slow swell envelope
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.6, startTime + duration * 0.35);
    envelope.gain.setValueAtTime(0.6, startTime + duration * 0.75);
    envelope.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.connect(envelope);
    osc2.connect(envelope);
    envelope.connect(dryGain);
    if (this.reverb) envelope.connect(this.reverb.input);

    osc1.start(startTime);
    osc2.start(startTime);
    vibrato.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    vibrato.stop(startTime + duration);

    this.scheduledOscillators.push(osc1, osc2, vibrato);
  }

  // Bells (mystical) - Pure tone with harmonic overtones
  private scheduleBellsNote(params: any): void {
    const { frequency, startTime, duration, ornament, dryGain } = params;

    // Bell-like timbre with overtones
    const fundamental = this.ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.value = frequency;

    const partial2 = this.ctx.createOscillator();
    partial2.type = 'sine';
    partial2.frequency.value = frequency * 2.4;
    const partial2Gain = this.ctx.createGain();
    partial2Gain.gain.value = 0.15;

    const partial3 = this.ctx.createOscillator();
    partial3.type = 'sine';
    partial3.frequency.value = frequency * 4.1;
    const partial3Gain = this.ctx.createGain();
    partial3Gain.gain.value = 0.08;

    partial2.connect(partial2Gain);
    partial3.connect(partial3Gain);

    // Long sustain with slow decay
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.7, startTime + 0.3);
    envelope.gain.setValueAtTime(0.7, startTime + duration * 0.4);
    envelope.gain.exponentialRampToValueAtTime(0.3, startTime + duration * 0.7);
    envelope.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    // Ornament adds shimmer
    if (ornament) {
      const shimmer = this.ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = frequency * 6;
      const shimmerGain = this.ctx.createGain();
      shimmerGain.gain.value = 0.05;
      shimmer.connect(shimmerGain);
      shimmerGain.connect(envelope);
      shimmer.start(startTime);
      shimmer.stop(startTime + duration);
      this.scheduledOscillators.push(shimmer);
    }

    fundamental.connect(envelope);
    partial2Gain.connect(envelope);
    partial3Gain.connect(envelope);
    envelope.connect(dryGain);
    if (this.reverb) envelope.connect(this.reverb.input);

    fundamental.start(startTime);
    partial2.start(startTime);
    partial3.start(startTime);
    fundamental.stop(startTime + duration);
    partial2.stop(startTime + duration);
    partial3.stop(startTime + duration);

    this.scheduledOscillators.push(fundamental, partial2, partial3);
  }

  stop(): void {
    this.isPlaying = false;
    const now = this.ctx.currentTime;

    // Quick fade out
    this.output.gain.setTargetAtTime(0, now, 0.3);

    // Stop all scheduled oscillators
    setTimeout(() => {
      this.scheduledOscillators.forEach((osc) => {
        try { osc.stop(); } catch {}
        osc.disconnect();
      });
      this.scheduledOscillators = [];
    }, 1000);
  }

  getOutput(): GainNode {
    return this.output;
  }

  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the approximate duration of the Adhan in seconds
   */
  static getDuration(): number {
    return ADHAN_MELODY.reduce((sum, n) => sum + n.duration * 0.9, 0) + 5;
  }
}

/**
 * Create a distant mosque echo effect
 * Simulates Adhan heard from afar (multiple mosques)
 */
export function createDistantAdhan(
  ctx: AudioContext,
  options: {
    delay?: number;      // Delay in seconds
    gain?: number;
    filterCutoff?: number;
  }
): { synth: AdhanSynth; output: GainNode } {
  const { delay = 0.5, gain = 0.05, filterCutoff = 1500 } = options;

  const synth = new AdhanSynth(ctx);

  // Distance filter (muffled by distance)
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterCutoff;

  // Delay for distance
  const delayNode = ctx.createDelay(5);
  delayNode.delayTime.value = delay;

  // Output gain
  const output = ctx.createGain();
  output.gain.value = gain;

  synth.connect(filter);
  filter.connect(delayNode);
  delayNode.connect(output);

  return { synth, output };
}
