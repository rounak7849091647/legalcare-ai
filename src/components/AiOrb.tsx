import { useState, useEffect, useRef, useMemo } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisperRecognition } from '@/hooks/useWhisperRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useLanguage } from '@/contexts/LanguageContext';
import { isIOSDevice } from '@/lib/device/isIOSDevice';
import { isMacDevice } from '@/lib/device/isMacDevice';
import { useTheme } from '@/contexts/ThemeContext';
import { unlockAudioContext } from '@/hooks/useMobileAudio';

interface AiOrbProps {
  onTranscript?: (transcript: string, language: string) => void;
  isProcessing?: boolean;
  responseText?: string;
  responseLanguage?: string;
}

const AiOrb = ({ onTranscript, isProcessing = false, responseText, responseLanguage = 'en-IN' }: AiOrbProps) => {
  const [isActive, setIsActive] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false); // CHANGED TO FALSE: Manual Tap Only
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  const isIOS = useMemo(() => isIOSDevice(), []);
  const isMac = useMemo(() => isMacDevice(), []);

  // Mac users get a 30% larger orb + title for better presence on big displays.
  const orbSizeClasses = isMac
    ? 'w-32 h-32 sm:w-44 sm:h-44 lg:w-48 lg:h-48'
    : 'w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36';
  const titleSizeClasses = isMac
    ? 'text-3xl sm:text-4xl lg:text-5xl'
    : 'text-2xl sm:text-3xl lg:text-4xl';
  const subtitleSizeClasses = isMac
    ? 'text-sm sm:text-base lg:text-lg'
    : 'text-xs sm:text-sm lg:text-base';

  const { currentLanguage } = useLanguage();

  const {
    isListening: webIsListening,
    transcript: webTranscript,
    detectedLanguage: webDetectedLanguage,
    startListening: startWebListening,
    stopListening: stopWebListening,
    resetTranscript: resetWebTranscript,
    isSupported: webSpeechSupported,
    error: webSpeechError,
  } = useSpeechRecognition(currentLanguage.code);

  const {
    isRecording,
    transcript: whisperTranscript,
    error: whisperError,
    startRecording,
    stopRecording,
    resetTranscript: resetWhisperTranscript,
    isSupported: whisperSupported,
    isProcessing: isProcessingVoice,
    lastErrorCode: whisperLastErrorCode,
  } = useWhisperRecognition();

  // Prefer Native Web Speech API (SFSpeechRecognizer on iOS) if supported
  // Only fall back to Whisper (WavRecorder) if native is not available
  const useNativeSpeech = webSpeechSupported;

  const isListening = useNativeSpeech ? webIsListening : isRecording;
  const transcript = useNativeSpeech ? webTranscript : whisperTranscript;
  const detectedLanguage = useNativeSpeech ? webDetectedLanguage : (isIOS ? 'en-IN' : 'en-IN'); 
  const speechSupported = useNativeSpeech ? webSpeechSupported : whisperSupported;
  const speechError = useNativeSpeech ? webSpeechError : whisperError;

  const resetTranscript = () => (useNativeSpeech ? resetWebTranscript() : resetWhisperTranscript());

  const { isSpeaking, speak, stop: stopSpeaking, isSupported: ttsSupported, isLoading } = useTextToSpeech();
  
  // Auto-send timer ref
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const hasSpokenRef = useRef<boolean>(false);
  const wasSpeakingRef = useRef<boolean>(false);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
    };
  }, []);

  // NUCLEAR OPTION: Listen for Global Speech Events to Hard-Stop Microphone
  useEffect(() => {
    const handleSpeechStart = () => {
      console.log('AI Started Speaking - HARD STOP MIC');
      if (useNativeSpeech) stopWebListening();
      else stopRecording();
      setIsActive(false);
      wasSpeakingRef.current = true;
    };

    const handleSpeechStop = () => {
      console.log('AI Stopped Speaking - Ready for manual tap');
      // In manual mode, we do NOT queue a mic restart. We wait for user tap.
    };

    window.addEventListener('ai-speech-started', handleSpeechStart);
    window.addEventListener('ai-speech-stopped', handleSpeechStop);

    return () => {
      window.removeEventListener('ai-speech-started', handleSpeechStart);
      window.removeEventListener('ai-speech-stopped', handleSpeechStop);
    };
  }, [continuousMode, isProcessing, isLoading, useNativeSpeech, startWebListening, stopWebListening, startRecording, stopRecording, resetTranscript]);

  // Auto-send after 2 seconds of pause while listening
  useEffect(() => {
    // On iOS native, we might not get partial results as frequently, but this logic still holds
    if (isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      
      autoSendTimerRef.current = setTimeout(() => {
        if (transcript.trim() && onTranscript) {
          
          // MANUAL MODE FIX:
          // Immediately STOP listening when we detect a pause and send the message.
          if (useNativeSpeech) {
             stopWebListening();
          } else {
             stopRecording();
          }
          setIsActive(false); // Turn off the Orb
          
          onTranscript(transcript.trim(), detectedLanguage);
          resetTranscript();
          lastTranscriptRef.current = '';
        }
      }, 1000); // Reduced delay to 1.0s for snappier "Stop & Send"
    }
  }, [isIOS, transcript, isListening, onTranscript, stopWebListening, resetTranscript, detectedLanguage, useNativeSpeech, responseText]);

  // Auto-speak response when received (only after user interaction for mobile)
  useEffect(() => {
    if (responseText && !isProcessing && ttsSupported && !hasSpokenRef.current && hasUserInteracted) {
      // CRITICAL FIX: Ensure we don't start listening immediately while speaking
      // HARD LOCK: Stop listening immediately
      if (isListening) {
        if (useNativeSpeech) stopWebListening();
        else stopRecording(); 
        setIsActive(false);
      }

      hasSpokenRef.current = true;
      speak(responseText, responseLanguage);
    }
    
    if (isProcessing) {
      hasSpokenRef.current = false;
    }
  }, [responseText, isProcessing, speak, ttsSupported, responseLanguage, hasUserInteracted, isListening, useNativeSpeech, stopWebListening, stopRecording]);

  // Continuous conversation: auto-start listening when speaking ends
  useEffect(() => {
    // Note: We removed the !continuousMode check to allow auto-restart
    if (isIOS) return; 

    if (isSpeaking) {
      wasSpeakingRef.current = true;
      // HARD LOCK: Ensure listening is OFF while speaking
      if (isListening) {
         if (useNativeSpeech) stopWebListening();
         else stopRecording();
         setIsActive(false);
      }
    }
    
    if (!isSpeaking && wasSpeakingRef.current && continuousMode && speechSupported && !isProcessing && !isLoading) {
      wasSpeakingRef.current = false;
      // We are in manual mode now, so this won't trigger, but leaving it for safety
      const timer = setTimeout(async () => {
        // DOUBLE CHECK: Are we still NOT speaking?
        if (!isListening && !isProcessing && !isSpeaking) { 
          try {
            // HARD RESET: Clear any buffered transcript
            resetTranscript();
            lastTranscriptRef.current = '';
            
            if (useNativeSpeech) {
              await startWebListening();
            } else {
              await startRecording();
            }
            setIsActive(true);
          } catch (e) {
            console.error('Failed to auto-start listening:', e);
          }
        }
      }, 1200); // 1.2 SECONDS DELAY - Optimal balance for echo vs speed
      return () => clearTimeout(timer);
    }
  }, [isIOS, isSpeaking, continuousMode, speechSupported, isProcessing, isListening, startWebListening, startRecording, isLoading, useNativeSpeech, stopWebListening, stopRecording, resetTranscript]);

  const handleOrbClick = async () => {
    // Mark that user has interacted (enables audio on mobile)
    setHasUserInteracted(true);
    unlockAudioContext(); // Unlock audio immediately on gesture

    // DO NOT await unlockAudioContext here - it breaks iOS gesture chain for getUserMedia
    // Audio unlock happens inside startRecording after getUserMedia succeeds

    if (isSpeaking || isLoading) {
      stopSpeaking();
      return;
    }

    if (isListening) {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      
      if (transcript.trim() && onTranscript) {
        onTranscript(transcript.trim(), detectedLanguage);
        resetTranscript();
        lastTranscriptRef.current = '';
      }
      
      if (useNativeSpeech) {
        stopWebListening();
      } else {
        await stopRecording();
      }
      setIsActive(false);
    } else {
       // Start listening
       if (useNativeSpeech) {
         try {
           await startWebListening();
           setIsActive(true);
         } catch (e) {
            console.error('Failed to start native listening:', e);
            setIsActive(false);
         }
       } else if (speechSupported) {
          try {
            await startRecording();
            setIsActive(true);
          } catch (e) {
            console.error('Failed to start recording:', e);
            setIsActive(false);
          }
       }
    }
  };

  const displayState = (isLoading || isProcessing || isProcessingVoice) ? 'thinking' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  const languageNames: Record<string, string> = {
    'hi-IN': 'हिंदी',
    'ta-IN': 'தமிழ்',
    'te-IN': 'తెలుగు',
    'kn-IN': 'ಕನ್ನಡ',
    'ml-IN': 'മലയാളം',
    'bn-IN': 'বাংলা',
    'gu-IN': 'ગુજરાતી',
    'pa-IN': 'ਪੰਜਾਬੀ',
    'mr-IN': 'मराठी',
    'or-IN': 'ଓଡ଼ିଆ',
    'en-IN': 'English'
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleOrbClick}
        disabled={isProcessing}
        className="relative group cursor-pointer disabled:cursor-wait touch-manipulation"
        aria-label={displayState === 'idle' ? 'Tap to start speaking' : displayState === 'listening' ? 'Tap to stop' : 'Voice assistant'}
      >
        {/* Outer glow ring */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          displayState !== 'idle' 
            ? 'scale-150 opacity-100' 
            : 'scale-100 opacity-60'
        } ${
          displayState === 'speaking' 
            ? isLightMode ? 'bg-gray-400/40 blur-xl' : 'bg-primary/40 blur-xl' 
            : displayState === 'thinking'
            ? isLightMode ? 'bg-gray-300/40 blur-xl' : 'bg-accent/30 blur-xl'
            : displayState === 'listening'
            ? 'bg-green-400/30 blur-xl'
            : isLightMode ? 'bg-gray-400/30 blur-xl' : 'bg-white/20 blur-xl'
        }`} />
        
        {/* Main orb */}
        <div className={`relative ${orbSizeClasses} rounded-full backdrop-blur-sm border flex items-center justify-center orb-glow orb-pulse transition-all duration-300 shadow-2xl ${
          displayState !== 'idle' ? 'scale-110' : 'scale-100'
        } ${
          displayState === 'speaking' 
            ? isLightMode 
              ? 'bg-gradient-to-br from-gray-500/50 to-gray-400/30 border-gray-500/60' 
              : 'bg-gradient-to-br from-primary/40 to-primary/20 border-primary/60' 
            : displayState === 'thinking'
            ? isLightMode
              ? 'bg-gradient-to-br from-gray-400/40 to-gray-300/20 border-gray-400/50'
              : 'bg-gradient-to-br from-accent/30 to-accent/10 border-accent/40'
            : displayState === 'listening'
            ? 'bg-gradient-to-br from-green-400/30 to-green-400/10 border-green-400/50'
            : isLightMode 
              ? 'bg-gradient-to-br from-gray-400/40 to-gray-300/20 border-gray-400/50'
              : 'bg-gradient-to-br from-white/20 to-white/5 border-white/30'
        }`}>
          {/* Inner glow */}
          <div className={`absolute inset-4 rounded-full bg-gradient-to-br to-transparent ${
            displayState === 'speaking' 
              ? isLightMode ? 'from-gray-500/40' : 'from-primary/30' 
              : displayState === 'thinking'
              ? isLightMode ? 'from-gray-400/30' : 'from-accent/20'
              : displayState === 'listening'
              ? 'from-green-400/20'
              : isLightMode ? 'from-gray-400/30' : 'from-white/20'
          }`} />
          
          {/* Waveform animation */}
          <div className="flex items-center justify-center gap-1 z-10">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  displayState === 'speaking' 
                    ? isLightMode ? 'bg-gray-600' : 'bg-primary' 
                    : displayState === 'listening' 
                    ? 'bg-green-400' 
                    : isLightMode ? 'bg-gray-500' : 'bg-white/80'
                } ${
                  displayState !== 'idle' ? 'waveform-bar' : 'h-1'
                }`}
                style={{ 
                  height: displayState !== 'idle' ? undefined : '4px',
                  animationDelay: `${i * 0.1}s` 
                }}
              />
            ))}
          </div>
        </div>

        {/* Hover ring */}
        <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 scale-110 ${
          isLightMode 
            ? 'border-gray-400/0 group-hover:border-gray-500/40' 
            : 'border-primary/0 group-hover:border-primary/30'
        }`} />
      </button>

      {/* Text labels */}
      <div className="text-center mt-2">
        <h2 className={`${titleSizeClasses} font-extrabold text-foreground tracking-[0.3em]`}>
          CARE
        </h2>
        <p className={`text-muted-foreground ${subtitleSizeClasses} mt-2 tracking-wide`}>
          {displayState === 'thinking' && (isLoading ? 'Preparing audio...' : 'Thinking...')}
          {displayState === 'speaking' && 'Speaking...'}
          {displayState === 'listening' && `Listening... (${languageNames[detectedLanguage] || 'English'})`}
          {displayState === 'idle' && (speechSupported ? 'Tap to speak' : 'Voice not supported')}
        </p>
        
        {/* Error display */}
        {speechError && (
          <p className="text-destructive text-xs mt-1">
            {speechError}
            {isIOS && whisperLastErrorCode && (
              <span className="block text-muted-foreground/60 text-[10px]">[{whisperLastErrorCode}]</span>
            )}
          </p>
        )}
      </div>

      {/* Live transcript */}
      {isListening && transcript && (
        <div className="text-center max-w-xs sm:max-w-md px-4 animate-fade-in">
          <p className="text-foreground/80 text-xs sm:text-sm italic">"{transcript}"</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Auto-sending in 2 seconds...
          </p>
        </div>
      )}

    </div>
  );
};

export default AiOrb;
