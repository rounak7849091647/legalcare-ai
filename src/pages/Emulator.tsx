import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Emulator = () => {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [rotation, setRotation] = useState<'portrait' | 'landscape'>('portrait');
  const [iframeKey, setIframeKey] = useState(0);

  const toggleRotation = () => {
    setRotation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  };

  const refresh = () => {
    setIframeKey(prev => prev + 1);
  };

  const deviceStyles = {
    iphone: {
      width: rotation === 'portrait' ? '390px' : '844px',
      height: rotation === 'portrait' ? '844px' : '390px',
      borderRadius: '50px',
      borderWidth: '12px',
      notchWidth: '120px',
      notchHeight: '30px',
    },
    android: {
      width: rotation === 'portrait' ? '412px' : '915px',
      height: rotation === 'portrait' ? '915px' : '412px',
      borderRadius: '36px',
      borderWidth: '8px',
      notchWidth: '20px', // hole punch
      notchHeight: '20px',
    }
  };

  const currentStyle = deviceStyles[device];
  const url = `${window.location.origin}/?platform=${device === 'iphone' ? 'ios' : 'android'}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-50 backdrop-blur-sm p-4 rounded-xl border text-white shadow-lg" style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: '#334155' }}>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Device Emulator
        </h1>
        <div className="flex gap-4 items-center">
          <div className="flex p-1 rounded-lg" style={{ backgroundColor: '#334155' }}>
            <Button 
              variant={device === 'iphone' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setDevice('iphone')}
              className="text-xs"
            >
              iPhone 14 Pro
            </Button>
            <Button 
              variant={device === 'android' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setDevice('android')}
              className="text-xs"
            >
              Pixel 7
            </Button>
          </div>
          
          <Button variant="outline" size="icon" onClick={toggleRotation} title="Rotate Device" className="text-black dark:text-white">
            <Smartphone className={`h-4 w-4 transition-transform ${rotation === 'landscape' ? 'rotate-90' : ''}`} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={refresh} className="text-black dark:text-white">
            Refresh
          </Button>

          <Button variant="ghost" size="sm" asChild className="text-white hover:text-white hover:bg-slate-700">
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Open Full
            </a>
          </Button>
        </div>
      </div>

      <div 
        className="relative bg-black shadow-2xl transition-all duration-500 ease-in-out"
        style={{
          width: currentStyle.width,
          height: currentStyle.height,
          borderRadius: currentStyle.borderRadius,
          border: `${currentStyle.borderWidth} solid #1e293b`,
          boxShadow: '0 0 0 2px #334155, 0 20px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Notch / Dynamic Island */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-black z-20 rounded-b-2xl"
          style={{
            width: currentStyle.notchWidth,
            height: currentStyle.notchHeight,
            top: device === 'android' ? '12px' : '0', // Android hole punch offset
            left: device === 'android' ? '24px' : '50%', // Android left punch
            transform: device === 'android' ? 'none' : 'translateX(-50%)',
            borderRadius: device === 'android' ? '50%' : '0 0 16px 16px'
          }}
        />

        {/* Screen Content */}
        <div className="w-full h-full bg-white overflow-hidden rounded-[inherit]">
          <iframe
            key={`${device}-${rotation}-${iframeKey}`}
            src={url}
            title="App Preview"
            className="w-full h-full border-0"
            allow="camera; microphone; geolocation; fullscreen"
          />
        </div>

        {/* Home Indicator (iOS) */}
        {device === 'iphone' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none" />
        )}
      </div>
      
      <p className="mt-8 text-slate-500 text-sm">
        {device === 'iphone' ? 'iOS' : 'Android'} Mode • {rotation === 'portrait' ? 'Portrait' : 'Landscape'} • {currentStyle.width}x{currentStyle.height}
      </p>
    </div>
  );
};

export default Emulator;
