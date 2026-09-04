import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for Mobile PWA with auto-update & cleanup
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for worker updates
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker != null) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available; reloading for update...');
                window.location.reload();
              }
            }
          };
        }
      };
    }).catch((err) => {
      console.warn('PWA ServiceWorker registration failed:', err);
    });
  });
}
