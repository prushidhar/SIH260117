/**
 * Voice Capture & Voice Activity Detection (VAD)
 * 
 * Captures microphone audio via Web Audio API at 16 kHz (Whisper's native rate).
 * Uses RMS energy-based VAD to detect speech segments and emit them as Float32Array buffers.
 */

export interface VoiceCaptureOptions {
  /** RMS energy threshold to detect speech (0–1). Default: 0.01 */
  energyThreshold?: number;
  /** Minimum speech duration to trigger a segment (ms). Default: 200 */
  minSpeechDuration?: number;
  /** Silence duration to end a speech segment (ms). Default: 800 */
  silenceTimeout?: number;
  /** Maximum recording duration per segment (seconds). Default: 15 */
  maxSegmentDuration?: number;
}

type SpeechSegmentCallback = (audio: Float32Array) => void;

const DEFAULT_SAMPLE_RATE = 16000;

export class VoiceCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  private isCapturing = false;
  private isSpeechActive = false;
  private speechStartTime = 0;
  private lastSpeechTime = 0;
  private audioBuffer: Float32Array[] = [];
  private currentAudioLevel = 0;

  private onSpeechSegmentCallback: SpeechSegmentCallback | null = null;

  private energyThreshold: number;
  private minSpeechDuration: number;
  private silenceTimeout: number;
  private maxSegmentDuration: number;

  constructor(options: VoiceCaptureOptions = {}) {
    this.energyThreshold = options.energyThreshold ?? 0.01;
    this.minSpeechDuration = options.minSpeechDuration ?? 200;
    this.silenceTimeout = options.silenceTimeout ?? 800;
    this.maxSegmentDuration = options.maxSegmentDuration ?? 15;
  }

  /**
   * Register callback for when a speech segment is detected
   */
  onSpeechSegment(callback: SpeechSegmentCallback): void {
    this.onSpeechSegmentCallback = callback;
  }

  /**
   * Get current microphone RMS audio level (0–1)
   */
  getAudioLevel(): number {
    return this.currentAudioLevel;
  }

  /**
   * Check if currently capturing
   */
  getIsCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Request microphone permission and begin listening
   */
  async startCapture(): Promise<void> {
    if (this.isCapturing) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: DEFAULT_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: DEFAULT_SAMPLE_RATE });

      // If browser didn't honor our sample rate, we'll work with what we get
      // Whisper expects 16 kHz, so we may need to resample
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // AnalyserNode for RMS energy detection (VAD)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.3;

      // ScriptProcessorNode to capture raw PCM samples
      // Buffer size of 4096 at 16kHz = ~256ms chunks
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.processorNode.onaudioprocess = (event) => {
        this.handleAudioProcess(event);
      };

      this.isCapturing = true;
      this.audioBuffer = [];
      this.isSpeechActive = false;
    } catch (err: any) {
      this.cleanup();
      throw new Error(`Microphone access denied: ${err.message}`);
    }
  }

  /**
   * Stop capturing and release resources
   */
  stopCapture(): void {
    if (this.isSpeechActive && this.audioBuffer.length > 0) {
      // Emit any remaining speech segment
      this.emitSegment();
    }
    this.cleanup();
  }

  /**
   * Process audio chunks for VAD
   */
  private handleAudioProcess(event: AudioProcessingEvent): void {
    const inputData = event.inputBuffer.getChannelData(0);
    const samples = new Float32Array(inputData);

    // Calculate RMS energy
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    this.currentAudioLevel = Math.min(rms * 5, 1); // Normalize to 0–1 range

    const now = Date.now();

    if (rms > this.energyThreshold) {
      // Speech detected
      this.lastSpeechTime = now;

      if (!this.isSpeechActive) {
        this.isSpeechActive = true;
        this.speechStartTime = now;
        this.audioBuffer = [];
      }

      this.audioBuffer.push(new Float32Array(samples));
    } else if (this.isSpeechActive) {
      // Below threshold — still recording (might be a pause in speech)
      this.audioBuffer.push(new Float32Array(samples));

      const silenceDuration = now - this.lastSpeechTime;
      const speechDuration = now - this.speechStartTime;

      // End segment if silence exceeds timeout
      if (silenceDuration >= this.silenceTimeout) {
        if (speechDuration >= this.minSpeechDuration) {
          this.emitSegment();
        } else {
          // Too short — discard (likely a click or ambient noise)
          this.audioBuffer = [];
          this.isSpeechActive = false;
        }
      }
    }

    // Safety: cap segment duration
    if (this.isSpeechActive) {
      const speechDuration = (now - this.speechStartTime) / 1000;
      if (speechDuration >= this.maxSegmentDuration) {
        this.emitSegment();
      }
    }
  }

  /**
   * Concatenate buffered chunks and emit as a single Float32Array
   */
  private emitSegment(): void {
    if (this.audioBuffer.length === 0) return;

    const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Resample if AudioContext sample rate differs from 16 kHz
    const actualRate = this.audioContext?.sampleRate ?? DEFAULT_SAMPLE_RATE;
    const output = actualRate !== DEFAULT_SAMPLE_RATE
      ? this.resample(merged, actualRate, DEFAULT_SAMPLE_RATE)
      : merged;

    this.onSpeechSegmentCallback?.(output);
    this.audioBuffer = [];
    this.isSpeechActive = false;
  }

  /**
   * Simple linear interpolation resampler
   */
  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = fromRate / toRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(lower + 1, input.length - 1);
      const fraction = srcIndex - lower;
      output[i] = input[lower] * (1 - fraction) + input[upper] * fraction;
    }

    return output;
  }

  /**
   * Release all audio resources
   */
  private cleanup(): void {
    this.isCapturing = false;
    this.isSpeechActive = false;
    this.currentAudioLevel = 0;

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }
}
