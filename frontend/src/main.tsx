import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from '@/contexts/ToastContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <ToastProvider>
      <App />
    </ToastProvider>
  </HashRouter>,
)
