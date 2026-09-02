import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA / offline support.
// NOT in development: the worker serves cached copies of the app bundle and of
// /legalcare-config.js, so edits appear not to take effect and Vite's HMR socket
// breaks. Any worker left over from a previous run is actively removed.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then(rs => rs.forEach(r => r.unregister()))
      .catch(() => { /* ignore */ });
    if ('caches' in window) {
      caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => { /* ignore */ });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.warn('[SW] Registration failed:', err));
    });
  }
}
