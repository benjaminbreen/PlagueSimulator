/**
 * Synthesizer for the Islamic Call to Prayer (Adhan)
 * Creates a respectful, atmospheric representation using FM synthesis
 *
 * The Adhan has a distinctive melodic pattern with:
 * - Ascending phrases
 * - Melismatic ornaments
 * - Sustained notes
 * - Natural reverb (echoing from minarets)
 */

// Traditional Adhan uses the Hijaz maqam scale (similar to Phrygian dominant)
// Notes in semitones from root: 0, 1, 4, 5, 7, 8, 11, 12
const HIJAZ_INTERVALS = [0, 1, 4, 5, 7, 8, 11, 12];

// Simplified melodic contour for the Adhan (relative scale degrees)
// This is an abstracted, respectful representation
const ADHAN_MELODY = [
  // Allahu Akbar (God is Great) - opening phrase
  { note: 0, duration: 1.5, sustain: true },
  { note: 4, duration: 1.2, sustain: true },
  { note: 5, duration: 0.8, sustain: false },
  { note: 4, duration: 2.0, sustain: true },

  // Second phrase - ascending
  { note: 0, duration: 0.6, sustain: false },
  { note: 4, duration: 0.6, sustain: false },
  { note: 5, duration: 1.0, sustain: true },
  { note: 7, duration: 1.5, sustain: true },

  // Descending resolution
  { note: 5, duration: 0.8, sustain: false },
  { note: 4, duration: 0.8, sustain: false },
  { note: 1, duration: 0.6, sustain: false },
  { note: 0, duration: 2.5, sustain: true },

  // Final phrase
  { note: 4, duration: 1.0, sustain: true },
  { note: 5, duration: 0.8, sustain: false },
  { note: 4, duration: 1.5, sustain: true },
  { note: 0, duration: 3.0, sustain: true },
];

export interface AdhanOptions {
  baseFrequency?: number;  // Root note frequency (default: 220 Hz / A3)
  gain?: number;
  reverbWet?: number;
  vibratoRate?: number;
  vibratoDepth?: number;
  onComplete?: () => void;
}

export class AdhanSynth {
  private ctx: AudioContext;
  private output: GainNode;
  private isPlaying: boolean = false;
  private scheduledOscillators: OscillatorNode[] = [];
  private reverb: { input: GainNode; output: GainNode } | null = null;

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
      baseFrequency = 220,
      gain = 0.12,
      reverbWet = 0.5,
      vibratoRate = 5,
      vibratoDepth = 8,
      onComplete
    } = options;

    this.isPlaying = true;
    const now = this.ctx.currentTime;

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

    for (const note of ADHAN_MELODY) {
      // Convert scale degree to frequency
      const semitones = HIJAZ_INTERVALS[note.note % 8];
      const octave = Math.floor(note.note / 8);
      const frequency = baseFrequency * Math.pow(2, (semitones + octave * 12) / 12);

      // Create the note
      this.scheduleNote({
        frequency,
        startTime: currentTime,
        duration: note.duration,
        sustain: note.sustain,
        vibratoRate,
        vibratoDepth,
        dryGain,
        wetGain
      });

      currentTime += note.duration * 0.9; // Slight overlap
    }

    // Calculate total duration
    const totalDuration = ADHAN_MELODY.reduce((sum, n) => sum + n.duration * 0.9, 0) + 5;

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
    vibratoRate: number;
    vibratoDepth: number;
    dryGain: GainNode;
    wetGain: GainNode;
  }): void {
    const { frequency, startTime, duration, sustain, vibratoRate, vibratoDepth, dryGain, wetGain } = params;

    // Main voice (sine with slight richness)
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    // Vibrato LFO
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = vibratoRate + (Math.random() - 0.5) * 0.5;

    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = frequency * (Math.pow(2, vibratoDepth / 1200) - 1);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Subtle second partial for warmth
    const partial2 = this.ctx.createOscillator();
    partial2.type = 'sine';
    partial2.frequency.value = frequency * 2;

    const partial2Gain = this.ctx.createGain();
    partial2Gain.gain.value = 0.15;
    partial2.connect(partial2Gain);

    // Envelope
    const envelope = this.ctx.createGain();
    envelope.gain.value = 0;

    const attackTime = sustain ? 0.15 : 0.08;
    const releaseTime = sustain ? duration * 0.4 : duration * 0.3;

    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(1, startTime + attackTime);

    if (sustain) {
      // Held notes with slight swell
      envelope.gain.setValueAtTime(1, startTime + attackTime);
      envelope.gain.linearRampToValueAtTime(1.1, startTime + duration * 0.5);
      envelope.gain.linearRampToValueAtTime(0.8, startTime + duration - releaseTime);
    }

    envelope.gain.setValueAtTime(envelope.gain.value, startTime + duration - releaseTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    // Connect
    carrier.connect(envelope);
    partial2Gain.connect(envelope);
    envelope.connect(dryGain);
    if (this.reverb) {
      envelope.connect(this.reverb.input);
    }

    // Start and stop
    carrier.start(startTime);
    vibrato.start(startTime);
    partial2.start(startTime);

    carrier.stop(startTime + duration + 0.1);
    vibrato.stop(startTime + duration + 0.1);
    partial2.stop(startTime + duration + 0.1);

    this.scheduledOscillators.push(carrier, vibrato, partial2);

    // Cleanup
    carrier.onended = () => {
      carrier.disconnect();
      vibrato.disconnect();
      vibratoGain.disconnect();
      partial2.disconnect();
      partial2Gain.disconnect();
      envelope.disconnect();
    };
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
