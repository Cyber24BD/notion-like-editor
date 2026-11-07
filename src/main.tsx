import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/editor.css'
import './styles/image.css'
import './styles/table.css'
import './styles/colors.css'
import './styles/video.css'
import './styles/iframe.css'
import './styles/chart.css'
import './styles/menu.css'
import './styles/ui.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
