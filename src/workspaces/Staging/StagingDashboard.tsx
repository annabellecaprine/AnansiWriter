import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { AIService } from '../../services/AIService'
import { PromptService } from '../../services/PromptService'
import { db } from '../../db/database'
import { Ghost, Play, Check, X, Key, Settings as SettingsIcon } from 'lucide-react'
import { confirmAction, confirmAlert } from '../../store/dialogStore'

// Simple helper to isolate HTML text representation for Diff logic
function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
}

export default function AIWorkshop() {
    const { activeNovelId } = useWorkspaceStore()

    // Configurations
    const [openRouterKey, setOpenRouterKey] = useState('')
    const [chutesKey, setChutesKey] = useState('')
    const [localEndpoint, setLocalEndpoint] = useState('http://localhost:1234/v1')
    const [model, setModel] = useState('anthropic/claude-3-haiku')
    const [provider, setProvider] = useState('openrouter')

    // Execution Context
    const [prompts, setPrompts] = useState<any[]>([])
    const [scenes, setScenes] = useState<any[]>([])
    const [selectedPromptId, setSelectedPromptId] = useState<string>('')
    const [selectedSceneId, setSelectedSceneId] = useState<string>('')

    // Operation State
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [generatedDiff, setGeneratedDiff] = useState<string | null>(null)
    const [originalContentSpan, setOriginalContentSpan] = useState<string>('')

    useEffect(() => {
        if (!activeNovelId) return
        PromptService.getPrompts(activeNovelId).then(p => {
            setPrompts(p)
            if (p.length > 0) setSelectedPromptId(p[0].id)
        })
        db.scenes.where({ novelId: activeNovelId }).toArray().then(s => {
            setScenes(s)
            if (s.length > 0) setSelectedSceneId(s[0].id)
        })

        // Load isolated credentials independently 
        AIService.getApiKey('openrouter').then(key => { if (key) setOpenRouterKey(key) })
        AIService.getApiKey('chutes').then(key => { if (key) setChutesKey(key) })
        db.appSettings.get('baseUrl_openai-compatible').then(url => { if (url) setLocalEndpoint(url.value) })

    }, [activeNovelId])

    const handleSaveKey = async () => {
        if (provider === 'openrouter') {
            AIService.setApiKey('openrouter', openRouterKey)
        } else if (provider === 'chutes') {
            AIService.setApiKey('chutes', chutesKey)
        } else if (provider === 'openai-compatible') {
            // Save the base URL in our app settings for local deployment mapping
            db.appSettings.put({
                key: `baseUrl_openai-compatible`,
                value: localEndpoint,
                description: 'Base URL for local OpenAI-compatible inference (e.g. LM Studio, Ollama).',
                updatedAt: Date.now()
            })
        }
        await confirmAlert({
            title: 'Configuration Saved',
            message: `Configuration secured gracefully in system local settings for ${provider}.`
        })
    }

    const handleDeleteKey = async () => {
        const confirmed = await confirmAction({
            title: 'Delete Key Configuration',
            message: `Remove the local API configuration for ${provider}?`,
            isDestructive: true,
            confirmLabel: 'Remove'
        })
        if (confirmed) {
            if (provider === 'openai-compatible') {
                await db.appSettings.delete(`baseUrl_openai-compatible`)
                setLocalEndpoint('http://localhost:1234/v1')
            } else {
                await db.appSettings.delete(`api_key_${provider}`)
                if (provider === 'openrouter') setOpenRouterKey('')
                else setChutesKey('')
            }
        }
    }

    const handleTestKey = async () => {
        const currentKey = provider === 'openrouter' ? openRouterKey : provider === 'chutes' ? chutesKey : 'not_required'
        if (!currentKey && provider !== 'openai-compatible') {
            await confirmAlert({
                title: 'Validation Error',
                message: 'Must supply a key to run network validation.',
                isDestructive: true
            })
            return
        }
        try {
            // Dispatch a tiny minimal payload
            await AIService.generate(activeNovelId!, "Connection validation", "Ack", model, provider, "test-connection")
            await confirmAlert({
                title: 'Validation Successful',
                message: 'Validation successful: Key resolves on designated endpoint securely.'
            })
        } catch (e: any) {
            await confirmAlert({
                title: 'Validation Failed',
                message: `Validation failed: ${e.message}`,
                isDestructive: true
            })
        }
    }

    const handleGenerate = async () => {
        if (!activeNovelId || !selectedPromptId || !selectedSceneId) return
        setIsLoading(true)
        setError('')
        setGeneratedDiff(null)
        setOriginalContentSpan('')

        try {
            const p = prompts.find(pr => pr.id === selectedPromptId)
            const s = scenes.find(sc => sc.id === selectedSceneId)

            if (!p || !s) throw new Error("Context boundaries lost.")

            let contentStr = s.content ? extractTextFromJson(s.content) : ''
            setOriginalContentSpan(contentStr || '<< Empty Scene >>')

            // Compile template
            const compiledPrompt = p.userTemplate.replace(/\{\{\s*content\s*\}\}/gi, contentStr)

            const responseText = await AIService.generate(activeNovelId, p.systemInstruction, compiledPrompt, model, provider, s.id)
            setGeneratedDiff(responseText)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleApplyDiff = async () => {
        if (!selectedSceneId || !generatedDiff) return
        try {
            // Apply straight to tip tap as a single paragraph text node for demo purposes. Phase 3 diff resolution is usually character-array level.
            await db.scenes.update(selectedSceneId, {
                content: {
                    type: 'doc',
                    content: [
                        { type: 'paragraph', content: [{ type: 'text', text: generatedDiff }] }
                    ]
                },
                updatedAt: Date.now()
            })
            await confirmAlert({
                title: 'Diff Applied',
                message: 'Diff correctly applied to Manuscript index.'
            })
            setGeneratedDiff(null)
        } catch (e: any) {
            await confirmAlert({
                title: 'Write Failed',
                message: 'Write failed: ' + e.message,
                isDestructive: true
            })
        }
    }

    if (!activeNovelId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Please open a project to access the AI Staging facility.</p>
            </div>
        )
    }

    return (
        <div className="workspace-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>

                {/* Control Panel (Left) */}
                <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                    <div className="surface-panel">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Ghost size={18} /> Engine Config</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>Provider Target</label>
                                <select className="input" value={provider} onChange={e => {
                                    setProvider(e.target.value)
                                    if (e.target.value === 'chutes') setModel('Qwen/Qwen2.5-7B-Instruct')
                                    if (e.target.value === 'openrouter') setModel('anthropic/claude-3-haiku')
                                    if (e.target.value === 'openai-compatible') setModel('local-model-id')
                                }} style={{ width: '100%', padding: '0.6rem' }}>
                                    <option value="openrouter">OpenRouter (Federated Commercial)</option>
                                    <option value="chutes">Chutes.ai (Decentralized Open Source)</option>
                                    <option value="openai-compatible">Local Endpoint (LM Studio/Ollama)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>Model Instruction Boundary (Model ID)</label>
                                <input
                                    className="input"
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                    placeholder="eg: minstral-8x7b"
                                    style={{ width: '100%', padding: '0.6rem', fontFamily: 'monospace' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {provider === 'openai-compatible' ? 'Local Base URL' : 'Credential Pipeline'}
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type={provider === 'openai-compatible' ? 'text' : 'password'}
                                    value={provider === 'openrouter' ? openRouterKey : provider === 'chutes' ? chutesKey : localEndpoint}
                                    onChange={e => {
                                        if (provider === 'openrouter') setOpenRouterKey(e.target.value)
                                        else if (provider === 'chutes') setChutesKey(e.target.value)
                                        else setLocalEndpoint(e.target.value)
                                    }}
                                    style={{ flex: 1, padding: '0.6rem' }}
                                    placeholder={provider === 'openai-compatible' ? 'http://localhost:1234/v1' : 'sk-...'}
                                />
                                <button className="icon-btn" onClick={handleSaveKey} title="Save to local device storage"><Key size={16} /></button>
                                <button className="icon-btn" style={{ color: 'var(--color-danger)' }} onClick={handleDeleteKey} title="Destroy key locally"><X size={16} /></button>
                            </div>
                            <button className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem', marginTop: '0.2rem' }} onClick={handleTestKey}>Validate Active Connection</button>
                            <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}>
                                <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Fast)</option>
                                <option value="anthropic/claude-3-opus">Claude 3 Opus (Logical)</option>
                                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                                <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                            </select>
                        </div>
                    </div>

                    <div className="surface-panel">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><SettingsIcon size={18} /> Inference Source</h3>

                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Target Scene Context</label>
                        <select value={selectedSceneId} onChange={e => setSelectedSceneId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                            {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Macro Prompt Filter</label>
                        <select value={selectedPromptId} onChange={e => setSelectedPromptId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}>
                            {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <button className="btn" onClick={handleGenerate} disabled={isLoading} style={{ padding: '1rem', justifyContent: 'center', display: 'flex', gap: '0.5rem', fontWeight: 700 }}>
                        {isLoading ? 'Synthesizing...' : <><Play size={18} /> Invoke Intelligence</>}
                    </button>

                    {error && (
                        <div style={{ padding: '1rem', background: 'rgba(255,50,50,0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)' }}>
                            <strong>Transmission Failure:</strong> {error}
                        </div>
                    )}
                </div>

                {/* Diff Viewer (Right) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <header className="workspace-header" style={{ padding: 0 }}>
                        <h1>AI Workshop (Inline Diff)</h1>
                        {generatedDiff && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-danger)' }} onClick={() => setGeneratedDiff(null)}>
                                    <X size={16} /> Reject
                                </button>
                                <button className="btn" onClick={handleApplyDiff}>
                                    <Check size={16} /> Override Target Scene
                                </button>
                            </div>
                        )}
                    </header>

                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Original */}
                        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Current Topographic Map</h4>
                            <div style={{ flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {originalContentSpan || 'Select a prompt array and run inference to pull memory maps locally.'}
                            </div>
                        </div>

                        {/* AI Output (Diff) */}
                        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ color: 'var(--color-accent)', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Constructed Revision</h4>
                            <div style={{ flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                {isLoading ? (
                                    <span style={{ color: 'var(--color-warning)', fontStyle: 'italic' }}>Evaluating structural vectors via secure LLM connection...</span>
                                ) : (
                                    generatedDiff || 'Output payload drops here.'
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
