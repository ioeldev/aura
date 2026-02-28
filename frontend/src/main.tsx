import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { BASE_PATH } from '@/lib/basePath'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <BrowserRouter basename={BASE_PATH || undefined}>
      <App />
    </BrowserRouter>
)
