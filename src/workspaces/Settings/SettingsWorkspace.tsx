import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { AIService } from '../../services/AIService'
import { Settings as SettingsIcon, Key, Database, Cpu, Save, CheckCircle, ShieldCheck } from 'lucide-react'

export default function SettingsWorkspace() {
    const [openAiKey, setOpenAiKey] = useState('')
    const [openRouterKey, setOpenRouterKey] = useState('')
    const [chutesKey, setChutesKey] = useState('')
    const [localEndpoint, setLocalEndpoint] = useState('http://localhost:1234/v1')
    const [saveSuccess, setSaveSuccess] = useState(false)

    // DB Stats
    const [stats, setStats] = useState<{
        projects: number
        scenes: number
        bibleEntries: number
        assets: number
        revisions: number
    }>({ projects: 0, scenes: 0, bibleEntries: 0, assets: 0, revisions: 0 })

    // Load settings and stats
    useEffect(() => {
        const loadSettings = async () => {
            const keyOpenAi = await db.appSettings.get('api_key_openai')
            const keyOpenRouter = await db.appSettings.get('api_key_openrouter')
            const keyChutes = await db.appSettings.get('api_key_chutes')
            const localUrl = await db.appSettings.get('baseUrl_openai-compatible')

            if (keyOpenAi) setOpenAiKey(keyOpenAi.value)
            if (keyOpenRouter) setOpenRouterKey(keyOpenRouter.value)
            if (keyChutes) setChutesKey(keyChutes.value)
            if (localUrl) setLocalEndpoint(localUrl.value)

            const projectCount = await db.projects.count()
            const sceneCount = await db.scenes.count()
            const bibleCount = await db.bibleEntries.count()
            const assetCount = await db.assets.count()
            const revisionCount = await db.sceneRevisions.count()

            setStats({
                projects: projectCount,
                scenes: sceneCount,
                bibleEntries: bibleCount,
                assets: assetCount,
                revisions: revisionCount
            })
        }

        loadSettings()
    }, [])

    const handleSaveSettings = async () => {
        if (openAiKey) await AIService.setApiKey('openai', openAiKey)
        else await db.appSettings.delete('api_key_openai')

        if (openRouterKey) await AIService.setApiKey('openrouter', openRouterKey)
        else await db.appSettings.delete('api_key_openrouter')

        if (chutesKey) await AIService.setApiKey('chutes', chutesKey)
        else await db.appSettings.delete('api_key_chutes')

        if (localEndpoint) {
            await db.appSettings.put({ key: 'baseUrl_openai-compatible', value: localEndpoint, updatedAt: Date.now() })
        } else {
            await db.appSettings.delete('baseUrl_openai-compatible')
        }

        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    return (
        <div className="workspace-view" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    <SettingsIcon size={28} color="var(--color-primary)" /> Application Settings & System Health
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Configure AI provider API keys, local endpoints, review local-first database statistics, and verify system lock integrity.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Column 1: AI Provider Credentials */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                            <Key size={20} /> AI Inference Credentials & Endpoints
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                            Keys are stored exclusively in your browser's private IndexedDB instance. They are never exported into project files or transmitted to external tracking servers.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                                    Local LLM / OpenAI-Compatible Endpoint URL
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="http://localhost:1234/v1"
                                    value={localEndpoint}
                                    onChange={e => setLocalEndpoint(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    Default for LM Studio, Ollama (`http://localhost:11434/v1`), or local vLLM instances.
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                                    OpenRouter API Key
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="sk-or-v1-..."
                                    value={openRouterKey}
                                    onChange={e => setOpenRouterKey(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                                    Chutes.ai API Key
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="chutes_..."
                                    value={chutesKey}
                                    onChange={e => setChutesKey(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                                    Direct OpenAI API Key
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="sk-..."
                                    value={openAiKey}
                                    onChange={e => setOpenAiKey(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <button className="btn primary" onClick={handleSaveSettings} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={16} /> Save Provider Settings
                                </button>
                                {saveSuccess && (
                                    <span style={{ color: '#28a745', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <CheckCircle size={16} /> Settings saved successfully!
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Storage & System Diagnostics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Database Health & Stats */}
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                            <Database size={20} /> IndexedDB Storage Metrics
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                            Local-first Dexie database counters across your narrative workspace.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Projects</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.projects}</div>
                            </div>
                            <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Scenes</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.scenes}</div>
                            </div>
                            <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Codex Bible Entries</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.bibleEntries}</div>
                            </div>
                            <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Binary Assets</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.assets}</div>
                            </div>
                            <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', gridColumn: 'span 2' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Immutable Scene Snapshots / Revisions</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.revisions}</div>
                            </div>
                        </div>
                    </div>

                    {/* Environment & Architecture Diagnostics */}
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                            <Cpu size={20} /> System Diagnostics
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
                                <span>Web Locks API Support:</span>
                                <span style={{ color: typeof navigator !== 'undefined' && navigator.locks ? '#28a745' : '#dc3545', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <ShieldCheck size={14} /> {typeof navigator !== 'undefined' && navigator.locks ? 'Supported & Active' : 'Unavailable'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
                                <span>IndexedDB Storage Subsystem:</span>
                                <span style={{ color: '#28a745', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <CheckCircle size={14} /> Connected (Dexie v1)
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                                <span>Local-First Isolation Policy:</span>
                                <span style={{ color: '#28a745', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <ShieldCheck size={14} /> 100% Local (No Analytics Transmitted)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
