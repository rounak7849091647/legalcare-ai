export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioInput: MediaStreamAudioSourceNode | null = null;
  private audioBuffers: Float32Array[] = [];
  private recordingLength = 0;
  private sampleRate = 44100;
  private isExternalContext = false;

  constructor(audioContext?: AudioContext) {
    if (audioContext) {
      this.audioContext = audioContext;
      this.isExternalContext = true;
    }
  }

  async start(): Promise<void> {
    this.audioBuffers = [];
    this.recordingLength = 0;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true, // ENABLE AEC
          noiseSuppression: true, // ENABLE NS
          autoGainControl: true,  // ENABLE AGC
          sampleRate: 44100
        } 
      });

      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.isExternalContext = false;
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.sampleRate = this.audioContext.sampleRate;

      this.audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Buffer size 4096 is a good balance for latency/performance
      // createScriptProcessor is deprecated but still the most compatible way for raw audio access
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.audioInput) return; // safety check
        
        const inputData = e.inputBuffer.getChannelData(0);
        const bufferCopy = new Float32Array(inputData);

        // MUTE GUARD: If the AI is currently talking, completely drop the audio chunks
        // This makes it physically impossible to record the AI's own voice
        if ((window as any).isAITalking) {
           // ZERO-FILL: Write silence (exact 0)
           for (let i = 0; i < bufferCopy.length; i++) {
             bufferCopy[i] = 0;
           }
        } else {
           // NOISE GATE: Check volume level (RMS)
           // If volume is too low (background noise / echo bleed), silence it
           let sum = 0;
           for (let i = 0; i < bufferCopy.length; i++) {
             sum += bufferCopy[i] * bufferCopy[i];
           }
           const rms = Math.sqrt(sum / bufferCopy.length);
           
           // Threshold: Increased to 0.08 for maximum strictness against speaker echo
           // If below threshold, treat as silence (exact 0).
           if (rms < 0.08) { 
             for (let i = 0; i < bufferCopy.length; i++) {
               bufferCopy[i] = 0;
             }
           }
        }

        this.audioBuffers.push(bufferCopy);
        this.recordingLength += bufferCopy.length;
      };

      this.audioInput.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

    } catch (error) {
      console.error('Failed to start WAV recording:', error);
      throw error;
    }
  }

  async stop(): Promise<Blob> {
    // Stop recording
    if (this.scriptProcessor && this.audioInput) {
      this.audioInput.disconnect();
      this.scriptProcessor.disconnect();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext && !this.isExternalContext) {
      await this.audioContext.close();
    }

    // Merge buffers
    const mergedBuffer = this.mergeBuffers(this.audioBuffers, this.recordingLength);
    
    // Encode WAV
    const wavBlob = this.encodeWAV(mergedBuffer);
    
    // Cleanup
    if (!this.isExternalContext) {
      this.audioContext = null;
    }
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.audioInput = null;
    this.audioBuffers = [];
    this.recordingLength = 0;

    return wavBlob;
  }

  private mergeBuffers(buffers: Float32Array[], length: number): Float32Array {
    const result = new Float32Array(length);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  }

  private encodeWAV(samples: Float32Array): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, this.sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, this.sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    this.floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
  }

  private floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
