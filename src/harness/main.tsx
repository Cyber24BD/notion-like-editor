import { createRoot } from 'react-dom/client'
import '../lib/notion-editor.css'
import './harness.css'
import { Harness } from './Harness'

createRoot(document.getElementById('root')!).render(<Harness />)
