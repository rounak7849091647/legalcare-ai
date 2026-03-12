export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Allow emulation via query parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('platform') === 'ios') return true;

  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};
