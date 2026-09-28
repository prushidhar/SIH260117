/**
 * Synthesized Sovereign Web Audio Engine
 * 
 * Generates zero-latency contextual audio feedback using native browser Web Audio API.
 * Requires zero external audio files / assets.
 * Conforms to industrial SCADA acoustic ergonomics:
 * - Parameter nudge: Soft, sub-audible mechanical impulse click (35ms)
 * - Agent proposal: Dual-harmonic resonant sonar ping (500ms)
 * - Safety violation: Low-frequency interlock alert buzzer (250ms)
 * - Navigation: Clean high-frequency confirmation pip (50ms)
 */

class SovereignAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('indra_audio_muted');
      this.isMuted = storedMute === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('indra_audio_muted', muted ? 'true' : 'false');
    }
  }

  public toggleMuted(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    if (!next) {
      this.playShortcut();
    }
    return next;
  }

  /**
   * 1. Soft click on parameter slider nudges or button presses
   * Brief sine impulse (850Hz -> 350Hz, 35ms, soft volume)
   */
  public playClick(volume: number = 0.06): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio synthesis errors on locked browsers
    }
  }

  /**
   * 2. Sonar ping on new incoming agent proposals, completed plans, or deliverables
   * Dual-harmonic resonant acoustic chime (1200Hz + 1800Hz, 500ms reverberant decay)
   */
  public playSonarPing(volume: number = 0.12): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Primary tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(1150, now + 0.5);

      gain1.gain.setValueAtTime(volume, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // Overtone harmonic
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1800, now);
      osc2.frequency.exponentialRampToValueAtTime(1750, now + 0.35);

      gain2.gain.setValueAtTime(volume * 0.4, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.4);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * 3. Low-frequency alert tone on safety interlock violations / emergency trips / critical alarms
   * Dual-pulse low-frequency buzzer (140Hz sawtooth with 90Hz undertone, 280ms duration)
   */
  public playAlertTone(volume: number = 0.18): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.setValueAtTime(110, now + 0.12);
      osc.frequency.setValueAtTime(90, now + 0.22);

      // Pulsed envelope
      gain.gain.setValueAtTime(volume, now);
      gain.gain.setValueAtTime(volume * 0.2, now + 0.1);
      gain.gain.setValueAtTime(volume, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * 4. High-frequency confirmation tone for pane switching and keyboard navigation
   * Clean 1400Hz blip (50ms)
   */
  public playShortcut(volume: number = 0.08): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.05);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Ignore audio synthesis errors
    }
  }
}

// Global Singleton Instance
export const sovereignAudio = new SovereignAudioEngine();
