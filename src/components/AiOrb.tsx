import { useState, useEffect, useRef, useMemo } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisperRecognition } from '@/hooks/useWhisperRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useLanguage } from '@/contexts/LanguageContext';
import { isIOSDevice } from '@/lib/device/isIOSDevice';
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
  const [continuousMode, setContinuousMode] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  const isIOS = useMemo(() => isIOSDevice(), []);
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

  const isListening = isIOS ? isRecording : webIsListening;
  const transcript = isIOS ? whisperTranscript : webTranscript;
  const detectedLanguage = isIOS ? 'en-IN' : webDetectedLanguage;
  const speechSupported = isIOS ? whisperSupported : webSpeechSupported;
  const speechError = isIOS ? whisperError : webSpeechError;

  const resetTranscript = () => (isIOS ? resetWhisperTranscript() : resetWebTranscript());

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

  // Auto-send after 2 seconds of pause while listening
  useEffect(() => {
    if (isIOS) return;

    if (isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      
      autoSendTimerRef.current = setTimeout(() => {
        if (transcript.trim() && onTranscript) {
          stopWebListening();
          setIsActive(false);
          onTranscript(transcript.trim(), detectedLanguage);
          resetTranscript();
          lastTranscriptRef.current = '';
        }
      }, 2000);
    }
  }, [isIOS, transcript, isListening, onTranscript, stopWebListening, resetTranscript, detectedLanguage]);

  // Auto-speak response when received (only after user interaction for mobile)
  useEffect(() => {
    if (responseText && !isProcessing && ttsSupported && !hasSpokenRef.current && hasUserInteracted) {
      hasSpokenRef.current = true;
      speak(responseText, responseLanguage);
    }
    
    if (isProcessing) {
      hasSpokenRef.current = false;
    }
  }, [responseText, isProcessing, speak, ttsSupported, responseLanguage, hasUserInteracted]);

  // Continuous conversation: auto-start listening when speaking ends
  useEffect(() => {
    if (isIOS) return;

    if (isSpeaking) {
      wasSpeakingRef.current = true;
    }
    
    if (!isSpeaking && wasSpeakingRef.current && continuousMode && speechSupported && !isProcessing && !isLoading) {
      wasSpeakingRef.current = false;
      const timer = setTimeout(async () => {
        if (!isListening && !isProcessing) {
          try {
            await startWebListening();
            setIsActive(true);
          } catch (e) {
            console.error('Failed to auto-start listening:', e);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isIOS, isSpeaking, continuousMode, speechSupported, isProcessing, isListening, startWebListening, isLoading]);

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

    if (isIOS) {
      if (isRecording) {
        if (autoSendTimerRef.current) {
          clearTimeout(autoSendTimerRef.current);
        }

        try {
          const result = await stopRecording();
          setIsActive(false);
          if (result.text.trim() && onTranscript) {
            onTranscript(result.text.trim(), result.language);
          }
          resetTranscript();
          lastTranscriptRef.current = '';
        } catch (e) {
          console.error('Failed to stop recording:', e);
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
      stopWebListening();
      setIsActive(false);
    } else if (speechSupported) {
      try {
        await startWebListening();
        setIsActive(true);
      } catch (e) {
        console.error('Failed to start listening:', e);
        setIsActive(false);
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
        <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full backdrop-blur-sm border flex items-center justify-center orb-glow orb-pulse transition-all duration-300 ${
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
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-widest">
          CARE
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
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

      <p className="text-muted-foreground/70 text-xs sm:text-sm">
        {isSpeaking ? 'Tap to stop' : 'Speak in Hindi, Tamil, Telugu, or any Indian language'}
      </p>
    </div>
  );
};

export default AiOrb;
