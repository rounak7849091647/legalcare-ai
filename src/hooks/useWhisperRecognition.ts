import { useState, useCallback, useRef } from 'react';
import { invokeFunction } from '@/lib/api';
import { isIOSDevice } from '@/lib/device/isIOSDevice';
import { unlockAudioContext } from '@/hooks/useMobileAudio';

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
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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

    const isIOS = isIOSDevice();
    let stream: MediaStream | null = null;

    try {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorderUnsupported');
      }

      // CRITICAL: getUserMedia MUST be the FIRST awaited browser permission call
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;
      unlockAudioContext().catch(() => {});

      const mimeTypes = isIOS
        ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/wav']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      setSelectedMimeType(mimeType || 'default');
      console.log('Selected MIME type:', mimeType || 'default (browser choice)');

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording error');
        setLastFailureStage('capture');
        setIsRecording(false);
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      
    } catch (err) {
      console.error('Recording start failed:', err);
      setLastFailureStage('capture');
      setLastErrorCode('capture_failed');

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      let msg = 'Unable to start microphone recording';
      if (err instanceof Error) {
        if (err.message === 'MediaRecorderUnsupported') {
          msg = 'Audio recording is not supported on this iOS Safari version';
        } else if (err.name === 'NotFoundError') {
          msg = 'No microphone found';
        } else if (err.name === 'NotAllowedError' && isIOS) {
          msg = 'iOS blocked microphone access. Enable Microphone for Safari and try again.';
        } else if (err.name === 'NotAllowedError') {
          msg = 'Microphone access denied. Allow microphone in browser settings.';
        } else if (err.name === 'NotReadableError') {
          msg = 'Microphone is busy in another app. Close other apps and retry.';
        } else if (err.name === 'OverconstrainedError' || err.name === 'TypeError') {
          msg = 'Microphone constraints unsupported on this device. Please retry.';
        }
      }

      setError(msg);
      throw new Error(msg);
    }
  }, [isSupported, cleanupStream]);

  const stopRecording = useCallback(async (): Promise<{ text: string; language: string }> => {
    return new Promise((resolve) => {
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
