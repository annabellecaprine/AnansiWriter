import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const savedTheme = localStorage.getItem('anansi_theme')
if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </StrictMode>,
)
