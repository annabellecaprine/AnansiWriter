import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { confirmAlert } from '../store/dialogStore'

/* ============================================================
   Phase 0 — CORS Spike & Routing Validation
   
   This page tests two architectural assumptions:
   1. Chutes API is reachable via fetch() from a browser
      (GitHub Pages origin) with a user-supplied key.
   2. Hash routing (/#/spike) survives a hard page refresh.
   ============================================================ */

type TestStatus = 'idle' | 'running' | 'pass' | 'fail'

interface ChutesResult {
    status: TestStatus
    responseText: string
    corsError: boolean
    httpStatus?: number
    latencyMs?: number
}

export default function Phase0Spike() {
    const location = useLocation()

    // --- Routing test (always immediate) ---
    const routingPassed = location.pathname === '/spike'

    // --- Chutes test state ---
    const [apiKey, setApiKey] = useState('')
    const [model, setModel] = useState('deepseek-ai/DeepSeek-V3-0324')
    const [chutes, setChutes] = useState<ChutesResult>({
        status: 'idle',
        responseText: '',
        corsError: false,
    })

    async function runChutesTest() {
        if (!apiKey.trim()) {
            await confirmAlert({
                title: 'Key Required',
                message: 'Please enter a Chutes API key first.',
                isDestructive: true
            })
            return
        }
        setChutes({ status: 'running', responseText: 'Sending request…', corsError: false })

        const t0 = performance.now()
        try {
            const res = await fetch('https://llm.chutes.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'user',
                            content: 'Reply with exactly one word: hello',
                        },
                    ],
                    max_tokens: 10,
                    temperature: 0,
                    stream: false,
                }),
            })

            const latencyMs = Math.round(performance.now() - t0)
            const text = await res.text()

            if (res.ok) {
                setChutes({
                    status: 'pass',
                    responseText: text,
                    corsError: false,
                    httpStatus: res.status,
                    latencyMs,
                })
            } else {
                setChutes({
                    status: 'fail',
                    responseText: `HTTP ${res.status}: ${text}`,
                    corsError: false,
                    httpStatus: res.status,
                    latencyMs,
                })
            }
        } catch (err: unknown) {
            const latencyMs = Math.round(performance.now() - t0)
            const message = err instanceof Error ? err.message : String(err)
            // CORS failures typically surface as TypeError: Failed to fetch
            const isCors = message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')
            setChutes({
                status: 'fail',
                responseText: isCors
                    ? `Network/CORS error: ${message}\n\nThis error typically means the Chutes endpoint does not send ` +
                    'Access-Control-Allow-Origin headers that permit this browser origin. ' +
                    'See implementation_plan.md Phase 0 — if CORS fails, a thin proxy is required.'
                    : `Error: ${message}`,
                corsError: isCors,
                latencyMs,
            })
        }
    }

    const badgeClass = (s: TestStatus) =>
        `status-badge ${s}`

    const checkIcon = (pass: boolean | null) =>
        pass === null ? '○' : pass ? '✓' : '✗'

    const chutesPass = chutes.status === 'pass'
    const chutesRun = chutes.status !== 'idle'

    return (
        <div className="spike">
            <Link to="/" className="back-link">← Back</Link>
            <h1>Phase 0 — Spike Validation</h1>
            <p className="subtitle">
                Proves two architectural assumptions before Phase 1 begins.
                Run this page from the deployed GitHub Pages URL, not localhost.
            </p>

            {/* ── Test 1: Hash Routing ─────────────────────────── */}
            <div className="surface-panel">
                <h2>
                    Test 1 — Hash Routing
                    <span className={badgeClass(routingPassed ? 'pass' : 'fail')}>
                        {routingPassed ? 'PASS' : 'FAIL'}
                    </span>
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    Open this page directly at <code>/#/spike</code> and press F5 / Cmd+R.
                    If you see this page (not a 404), routing works on static hosting.
                </p>
                <div className="route-info">
                    Current route: <strong>{location.pathname}</strong>
                    {' '}(expected: /spike)
                </div>
                <ul className="checklist" style={{ marginTop: '0.75rem' }}>
                    <li>
                        <span className={`check-icon ${routingPassed ? 'pass' : 'fail'}`}>
                            {routingPassed ? '✓' : '✗'}
                        </span>
                        Route is <code>/spike</code>
                    </li>
                    <li>
                        <span className="check-icon idle">○</span>
                        Hard-refresh this page (F5) and verify it still loads — manual check
                    </li>
                </ul>
            </div>

            {/* ── Test 2: Chutes CORS ───────────────────────────── */}
            <div className="surface-panel">
                <h2>
                    Test 2 — Chutes Browser CORS
                    <span className={badgeClass(chutes.status)}>
                        {chutes.status.toUpperCase()}
                    </span>
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Enter your Chutes API key below. The key is <strong>never stored</strong> — it
                    lives only in this input for the duration of the test. Run this from the
                    deployed GitHub Pages URL to get an accurate CORS result.
                </p>

                <div className="form-row">
                    <label htmlFor="api-key">API Key</label>
                    <input
                        id="api-key"
                        type="password"
                        placeholder="cpk_..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                <div className="form-row">
                    <label htmlFor="model-id">Model</label>
                    <input
                        id="model-id"
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                    />
                </div>

                <button
                    className="btn"
                    onClick={runChutesTest}
                    disabled={chutes.status === 'running'}
                    style={{ marginBottom: '0.5rem' }}
                >
                    {chutes.status === 'running' ? 'Running…' : 'Run Chutes Test'}
                </button>

                {chutes.latencyMs !== undefined && (
                    <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {chutes.latencyMs} ms
                    </span>
                )}

                {chutesRun && (
                    <div className="response-box">
                        {chutes.responseText}
                    </div>
                )}

                <ul className="checklist">
                    <li>
                        <span className={`check-icon ${!chutesRun ? 'idle' : chutesPass ? 'pass' : 'fail'}`}>
                            {!chutesRun ? '○' : checkIcon(chutesPass)}
                        </span>
                        fetch() completes without CORS/network error
                    </li>
                    <li>
                        <span className={`check-icon ${!chutesRun ? 'idle' : (chutes.httpStatus === 200) ? 'pass' : 'fail'}`}>
                            {!chutesRun ? '○' : checkIcon(chutes.httpStatus === 200)}
                        </span>
                        HTTP 200 received
                    </li>
                    <li>
                        <span className={`check-icon ${!chutesRun ? 'idle' : (chutesPass && !chutes.corsError) ? 'pass' : 'fail'}`}>
                            {!chutesRun ? '○' : checkIcon(chutesPass && !chutes.corsError)}
                        </span>
                        Response body contains model output
                    </li>
                </ul>

                {chutes.corsError && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#450a0a',
                        border: '1px solid #7f1d1d',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                    }}>
                        <strong style={{ color: 'var(--color-error)' }}>CORS failure detected.</strong>
                        {' '}The static BYOK architecture requires a proxy. Options: Cloudflare Worker,
                        Vercel Edge Function, or another provider with permissive CORS headers.
                        See the implementation plan for next steps.
                    </div>
                )}
            </div>

            {/* ── Overall Summary ───────────────────────────────── */}
            <div className="surface-panel">
                <h2>Overall Gate</h2>
                <ul className="checklist">
                    <li>
                        <span className={`check-icon ${routingPassed ? 'pass' : 'fail'}`}>
                            {checkIcon(routingPassed)}
                        </span>
                        Hash routing — /#/spike survives hard refresh
                    </li>
                    <li>
                        <span className={`check-icon ${!chutesRun ? 'idle' : chutesPass ? 'pass' : 'fail'}`}>
                            {!chutesRun ? '○' : checkIcon(chutesPass)}
                        </span>
                        Chutes API reachable from browser (no CORS block)
                    </li>
                </ul>
                {routingPassed && chutesPass && (
                    <p style={{ marginTop: '1rem', color: 'var(--color-success)', fontWeight: 600 }}>
                        ✓ Phase 0 complete. Architecture validated. Phase 1A can begin.
                    </p>
                )}
            </div>
        </div>
    )
}
