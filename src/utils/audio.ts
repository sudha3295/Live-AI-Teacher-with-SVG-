/**
 * Audio Capture & Playback for Gemini Live
 * Input: 16kHz Mono 16-bit PCM Little-Endian
 * Output: 24kHz Mono 16-bit PCM Little-Endian
 */

export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRecording = false;

  constructor(private onPcmChunk: (base64Chunk: string) => void) {}

  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Try creating 16kHz audio context, or use standard with downsampler
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      // ScriptProcessorNode buffers audio chunks
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

      const sourceSampleRate = this.audioCtx.sampleRate;

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Downsample to 16kHz if needed
        const resampled = downsampleTo16000(inputData, sourceSampleRate);
        const pcm16 = floatTo16BitPCM(resampled);
        const base64 = arrayBufferToBase64(pcm16);
        this.onPcmChunk(base64);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);
      this.isRecording = true;
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  public stop(): void {
    this.isRecording = false;
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  public get active(): boolean {
    return this.isRecording;
  }
}

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    } catch {
      // Fallback
      this.audioCtx = new AudioContext();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public get muted(): boolean {
    return this.isMuted;
  }

  public playChunk(base64Pcm: string): void {
    if (this.isMuted) return;

    this.initAudioContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      const currentTime = this.audioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };
    } catch (err) {
      console.warn('Audio playback chunk error:', err);
    }
  }

  public stopAll(): void {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
  }

  public close(): void {
    this.stopAll();
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}

// Resampling helper from source sample rate to 16,000 Hz
function downsampleTo16000(buffer: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return buffer;
  const ratio = sampleRate / 16000;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
