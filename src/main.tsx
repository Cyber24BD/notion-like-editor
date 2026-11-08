import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import App from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/editor.css'
import './styles/cover.css'
import './styles/find.css'
import './styles/shortcuts.css'
import './styles/image.css'
import './styles/lightbox.css'
import './styles/table.css'
import './styles/colors.css'
import './styles/video.css'
import './styles/audio.css'
import './styles/iframe.css'
import './styles/bookmark.css'
import './styles/code.css'
import './styles/toc.css'
import './styles/math.css'
import './styles/mermaid.css'
import './styles/custom-html.css'
import './styles/chart.css'
import './styles/menu.css'
import './styles/ui.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
