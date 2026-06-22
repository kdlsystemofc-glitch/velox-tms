import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { reportError } from '@/lib/reportError'

// Observabilidade: captura erros assíncronos não tratados (rejeições de promessa, etc.)
window.addEventListener('unhandledrejection', (e) => reportError(e?.reason || e, { type: 'unhandledrejection' }))
window.addEventListener('error', (e) => { if (e?.error) reportError(e.error, { type: 'window.error' }) })

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
