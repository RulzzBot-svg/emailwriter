import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Privacy from './pages/Privacy.jsx'

function Root() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path === '/privacy' || path === '/privacy.html') {
    return <Privacy />
  }
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
