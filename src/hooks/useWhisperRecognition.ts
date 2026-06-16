import { useState, useCallback, useRef } from 'react';
import { invokeFunction } from '@/lib/api';
import { isIOSDevice } from '@/lib/device/isIOSDevice';
import { unlockAudioContext, getAudioContext } from '@/hooks/useMobileAudio';
import { WavRecorder } from '@/lib/audio/wavRecorder';

export type SttErrorCode =
  | 'stt_key_missing'
  | 'stt_auth_invalid'
  | 'stt_quota_exceeded'
  | 'stt_provider_unavailable'
  | 'stt_audio_invalid'
  | 'stt_internal_error'
  | 'stt_provider_error'
  | 'capture_failed'
  | null;

export type FailureStage = 'capture' | 'upload' | 'transcription' | null;

interface WhisperRecognitionHook {
  isRecording: boolean;
  transcript: string;
  detectedLanguage: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ text: string; language: string }>;
  resetTranscript: () => void;
  isSupported: boolean;
  isProcessing: boolean;
  // Diagnostics
  lastErrorCode: SttErrorCode;
  lastFailureStage: FailureStage;
  selectedMimeType: string | null;
}

export const useWhisperRecognition = (): WhisperRecognitionHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('en-IN');
  const [error, setError] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<SttErrorCode>(null);
  const [lastFailureStage, setLastFailureStage] = useState<FailureStage>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices?.getUserMedia;

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Cleanup wav recorder if exists
    if (wavRecorderRef.current) {
      // It handles its own cleanup
      wavRecorderRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Audio recording not supported';
      setError(msg);
      setLastFailureStage('capture');
      throw new Error(msg);
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const msg = 'Requires HTTPS';
      setError(msg);
      setLastFailureStage('capture');
      throw new Error(msg);
    }

    setError(null);
    setLastErrorCode(null);
    setLastFailureStage(null);
    audioChunksRef.current = [];

    // FORCE WAV RECORDER FOR EVERYONE (Pro Mode)
    // This ensures consistent audio format and better compatibility with OpenAI Whisper
    try {
      // Use Shared Audio Context if available to help with AEC
      const sharedContext = getAudioContext();
      const recorder = new WavRecorder(sharedContext || undefined);
      await recorder.start();
      wavRecorderRef.current = recorder;
      setIsRecording(true);
      setSelectedMimeType('audio/wav');
      console.log('Started WAV recording (Universal Mode)');
      return;
    } catch (err) {
      console.error('WAV recording failed:', err);
      setError('Failed to start microphone');
      setLastFailureStage('capture');
      throw err;
    }
  }, [isSupported, cleanupStream]);

  const stopRecording = useCallback(async (): Promise<{ text: string; language: string }> => {
    return new Promise(async (resolve) => {
      
      // Handle WAV Recorder Stop
      if (wavRecorderRef.current && isRecording) {
        setIsRecording(false);
        setIsProcessing(true);
        try {
          const wavBlob = await wavRecorderRef.current.stop();
          wavRecorderRef.current = null;
          
          // CRITICAL: Physically stop the microphone tracks to ensure it goes dead
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.enabled = false; // Mute it
              track.stop(); // Kill it
            });
            streamRef.current = null;
          }
          
          if (wavBlob.size < 500) {
             setIsProcessing(false);
             setError('Recording too short');
             resolve({ text: '', language: 'en-IN' });
             return;
          }

          // Process the blob
          await processAudioBlob(wavBlob, 'audio/wav', resolve);
        } catch (err) {
          console.error('WAV Stop failed:', err);
          setIsProcessing(false);
          resolve({ text: '', language: 'en-IN' });
        }
        return;
      }


      if (!mediaRecorderRef.current || !isRecording) {
        resolve({ text: '', language: 'en-IN' });
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      
      mediaRecorder.onstop = async () => {
        cleanupStream();

        if (audioChunksRef.current.length === 0) {
          resolve({ text: '', language: 'en-IN' });
          return;
        }

        setIsProcessing(true);

        try {
          // Use the MIME type reported by the recorder, or fallback to what we selected
          let mimeType = mediaRecorder.mimeType;
          if (!mimeType || mimeType === '') {
            mimeType = selectedMimeType || (isIOSDevice() ? 'audio/mp4' : 'audio/webm');
          }
          
          console.log('Final audio MIME type:', mimeType);

          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await processAudioBlob(audioBlob, mimeType, resolve);

        } catch (err) {
          console.error('Processing failed:', err);
          setError('Processing failed. Please try again.');
          setLastFailureStage('upload');
          resolve({ text: '', language: 'en-IN' });
        } finally {
          setIsProcessing(false);
          audioChunksRef.current = [];
        }
      };

      setIsRecording(false);
      mediaRecorder.stop();
    });
  }, [isRecording, cleanupStream]);

  // Helper to process audio blob (shared between WAV and MediaRecorder)
  const processAudioBlob = async (audioBlob: Blob, mimeType: string, resolve: (val: any) => void) => {
    // Lower threshold: 500 bytes to avoid dropping very short iOS commands
    if (audioBlob.size < 500) {
      setIsProcessing(false);
      setError('Recording too short. Please try again.');
      setLastFailureStage('capture');
      resolve({ text: '', language: 'en-IN' });
      return;
    }

    // Convert to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Audio = btoa(binary);

    setLastFailureStage(null);
    const { data, error: fnError } = await invokeFunction('voice-to-text', {
      body: { audio: base64Audio, mimeType }
    });

    if (fnError) {
      console.error('Function invocation error:', fnError);
      setError('Voice service unreachable. Please type your message.');
      setLastErrorCode('stt_provider_unavailable');
      setLastFailureStage('upload');
      resolve({ text: '', language: 'en-IN' });
      return;
    }

    // Parse structured response
    if (data?.ok === false || data?.errorCode) {
      const code = data.errorCode as SttErrorCode;
      setLastErrorCode(code);
      setLastFailureStage('transcription');
      setError(data.userMessage || 'Transcription failed');
      resolve({ text: '', language: 'en-IN' });
      return;
    }

    if (!data?.text) {
      setError('No speech detected. Please try again.');
      setLastFailureStage('transcription');
      resolve({ text: '', language: 'en-IN' });
      return;
    }

    const lang = data.detectedLanguage || 'en-IN';
    setTranscript(data.text);
    setDetectedLanguage(lang);
    setLastErrorCode(null);
    setLastFailureStage(null);
    resolve({ text: data.text, language: lang });
  };

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setDetectedLanguage('en-IN');
    setError(null);
    setLastErrorCode(null);
    setLastFailureStage(null);
  }, []);

  return {
    isRecording,
    transcript,
    detectedLanguage,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
    isSupported,
    isProcessing,
    lastErrorCode,
    lastFailureStage,
    selectedMimeType
  };
};
