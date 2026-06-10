import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker after first paint so it never competes with
// the initial render. PWA install/offline kicks in on the next visit.
if ('serviceWorker' in navigator) {
  const register = () =>
    import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(register)
  } else {
    window.addEventListener('load', register)
  }
}
