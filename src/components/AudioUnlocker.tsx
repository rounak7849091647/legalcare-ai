import React, { useEffect, useState } from 'react';
import { isIOSDevice } from '@/lib/device/isIOSDevice';
import { unlockAudioContext } from '@/hooks/useMobileAudio';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

const AudioUnlocker = () => {
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on iOS/Android if audio context is locked
    if (isIOSDevice() || /Android/i.test(navigator.userAgent)) {
      setNeedsUnlock(true);
      setIsVisible(true);
    }
  }, []);

  const handleUnlock = async () => {
    try {
      await unlockAudioContext();
      setIsVisible(false); // Hide immediately after tap
    } catch (e) {
      console.error('Unlock failed', e);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button 
        onClick={handleUnlock}
        className="bg-primary/90 hover:bg-primary text-white shadow-lg rounded-full px-6 py-6 h-auto flex items-center gap-3 backdrop-blur-sm border border-white/20"
      >
        <Volume2 className="w-6 h-6 animate-pulse" />
        <div className="flex flex-col items-start">
          <span className="font-semibold text-sm">Enable Voice Features</span>
          <span className="text-xs opacity-80">Tap once to activate AI voice</span>
        </div>
      </Button>
    </div>
  );
};

export default AudioUnlocker;
