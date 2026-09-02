// Detects desktop macOS (not iOS, not iPadOS-as-Mac).
// Used to apply Mac-specific UI scaling.
export const isMacDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Manual override via ?platform=mac for testing
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('platform') === 'mac') return true;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // Exclude iOS / iPadOS-pretending-to-be-Mac (touch-capable "MacIntel")
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  if (isIOS) return false;

  // True desktop Mac
  return /Macintosh|Mac OS X/.test(ua) || /Mac/.test(platform);
};
