import { Routes, Route, Link } from 'react-router-dom'
import Phase0Spike from './pages/Phase0Spike'

export default function App() {
    return (
        <div className="app">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/spike" element={<Phase0Spike />} />
                {/* Future workspaces will be registered here */}
            </Routes>
        </div>
    )
}

function Home() {
    return (
        <div className="home">
            <h1>AnansiWriter</h1>
            <p className="tagline">Write the story. Track the world. Follow the threads.</p>
            <nav>
                <Link to="/spike" className="btn">Phase 0 — CORS &amp; Routing Spike →</Link>
            </nav>
        </div>
    )
}
