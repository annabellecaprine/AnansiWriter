import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { MessageSquare, Save, RotateCcw, Crosshair, ArrowRightCircle } from 'lucide-react'
import { AIService } from '../../services/AIService'
import ContextPreview from '../../components/ContextPreview'
import type { ContextAssembly } from '../../services/ai/ContextEngine'
import { confirmAlert } from '../../store/dialogStore'

export default function StagingSandbox() {
    const { activeNovelId } = useWorkspaceStore()
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([])
    const [input, setInput] = useState('')
    const [assemblyCache, setAssemblyCache] = useState<ContextAssembly | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [models, setModels] = useState<any[]>([])
    const [selectedModel, setSelectedModel] = useState<{ id: string, provider: string } | null>(null)

    // Load defaults
    const [characterId, setCharacterId] = useState<string>('')
    const [characters, setCharacters] = useState<any[]>([])

    useEffect(() => {
        if (!activeNovelId) return
        db.bibleEntries.where({ novelId: activeNovelId }).toArray().then(entries => {
            const chars = entries.filter(e => e.type === 'Character')
            setCharacters(chars)
            if (chars.length > 0) setCharacterId(chars[0].id)
        })
        db.aiModels.where({ novelId: activeNovelId }).filter(m => !!m.isEnabled).toArray().then(setModels)
    }, [activeNovelId])

    useEffect(() => {
        if (!characterId) return
        const fetchPreferences = async () => {
            const prefs = await db.fieldValues.where({ entryId: characterId }).toArray()
            const modelPref = prefs.find(f => f.fieldKey === 'STAGING_MODEL_ID')
            const provPref = prefs.find(f => f.fieldKey === 'STAGING_PROVIDER')

            if (modelPref && provPref) {
                setSelectedModel({ id: modelPref.value, provider: provPref.value })
            } else {
                setSelectedModel(null) // Fallback when submitting
            }
        }
        fetchPreferences()
    }, [characterId])

    const setCharacterModel = async (modelId: string) => {
        const model = models.find(m => m.modelId === modelId)
        if (!model) return
        setSelectedModel({ id: model.modelId, provider: model.provider })

        const prefs = await db.fieldValues.where({ entryId: characterId }).toArray()
        let mPref = prefs.find(f => f.fieldKey === 'STAGING_MODEL_ID')
        let pPref = prefs.find(f => f.fieldKey === 'STAGING_PROVIDER')

        const now = Date.now()
        if (mPref) {
            await db.fieldValues.update(mPref.id, { value: model.modelId, updatedAt: now })
        } else {
            const { v4: uuidv4 } = await import('uuid')
            await db.fieldValues.add({ id: uuidv4(), novelId: activeNovelId!, entryId: characterId, fieldKey: 'STAGING_MODEL_ID', value: model.modelId, state: 'Canon', validFrom: null, validUntil: null, provenance: [], createdAt: now, updatedAt: now })
        }

        if (pPref) {
            await db.fieldValues.update(pPref.id, { value: model.provider, updatedAt: now })
        } else {
            const { v4: uuidv4 } = await import('uuid')
            await db.fieldValues.add({ id: uuidv4(), novelId: activeNovelId!, entryId: characterId, fieldKey: 'STAGING_PROVIDER', value: model.provider, state: 'Canon', validFrom: null, validUntil: null, provenance: [], createdAt: now, updatedAt: now })
        }
    }

    const constructContext = async () => {
        if (!activeNovelId || !characterId) return
        try {
            // Mock standard Context Engine extraction for an "Interview Mode" staging
            const char = await db.bibleEntries.get(characterId)
            let assembly: ContextAssembly = {
                assembledSystemInstruction: `You are playing the role of ${char?.name || 'a character'}. Respond directly in their voice. This is a non-canon staging sandbox.`,
                assembledUserPrompt: '',
                budgetLimit: 50000,
                totalEstimatedTokens: 500,
                includedSources: [
                    { id: characterId, name: char?.name || 'Character', type: 'Character', estimatedTokens: 500, contentSpan: '' }
                ],
                excludedSources: []
            }
            setAssemblyCache(assembly)
        } catch (e) { }
    }

    useEffect(() => { constructContext() }, [characterId])

    const submitChat = async () => {
        if (!input.trim() || !activeNovelId || !assemblyCache) return

        const newMsgs = [...messages, { role: 'user', content: input }]
        setMessages(newMsgs)
        setInput('')
        setIsLoading(true)

        try {
            // Aggregate history natively
            const priorHistoryContext = newMsgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

            const runModel = selectedModel?.id || (models.length > 0 ? models[0].modelId : 'anthropic/claude-3-haiku')
            const runProvider = selectedModel?.provider || (models.length > 0 ? models[0].provider : 'openrouter')

            const responseText = await AIService.generate(
                activeNovelId,
                assemblyCache.assembledSystemInstruction,
                `${priorHistoryContext}\n\nCHARACTER:`,
                runModel,
                runProvider,
                characterId
            )

            setMessages([...newMsgs, { role: 'Character', content: responseText }])
        } catch (e: any) {
            await confirmAlert({
                title: 'Staging Fault',
                message: `Staging fault: ${e.message}`,
                isDestructive: true
            })
        } finally {
            setIsLoading(false)
        }
    }

    const promoteToCanon = async () => {
        await confirmAlert({
            title: 'Insight Promotion',
            message: 'Discovery captured! Staging nodes are non-canon. Cross-bridge export to Bible available soon.'
        })
    }

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100%', overflow: 'hidden' }}>

            {/* Sidebar Context Maps */}
            <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <div className="surface-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Crosshair size={18} /> Non-Canon Sandbox</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Experiments here do not affect your manuscript organically.</p>

                    <label htmlFor="target-character" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Target Character / Role</label>
                    <select id="target-character" aria-label="Select Target Character" value={characterId} onChange={e => setCharacterId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <label htmlFor="target-model" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Identity Execution Core (Model)</label>
                    <select id="target-model" aria-label="Select Target Model" value={selectedModel?.id || ''} onChange={e => setCharacterModel(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}>
                        {models.map(m => <option key={m.id} value={m.modelId}>{m.name} ({m.provider})</option>)}
                        {!models.length && <option value="">No Active Models...</option>}
                    </select>

                    <button className="btn" style={{ marginTop: '1rem', background: 'var(--color-surface-hover)' }}><Save size={16} /> Save Session</button>
                    <button className="btn" style={{ marginTop: '0.5rem', background: 'var(--color-surface-hover)' }}><RotateCcw size={16} /> Branch Node</button>
                </div>

                <ContextPreview assembly={assemblyCache} />
            </div>

            {/* Chat Tree */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>

                <header style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <h4>Interview Session</h4>
                    <button className="btn" onClick={promoteToCanon} style={{ color: 'var(--color-accent)' }}><ArrowRightCircle size={16} /> Promote Insight</button>
                </header>

                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.length === 0 && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>Sandbox initialized. System is completely isolated from Canon arrays. Send a message to begin.</p>}
                    {messages.map((m, idx) => (
                        <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', maxWidth: '80%' }}>
                            <strong style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>{m.role.toUpperCase()}</strong>
                            <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                        </div>
                    ))}
                    {isLoading && <div style={{ alignSelf: 'flex-start', padding: '1rem', color: 'var(--color-warning)' }}>Synthesizing cognitive branch...</div>}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', background: 'var(--color-bg)' }}>
                    <textarea
                        id="chat-input"
                        aria-label="Chat Input Box"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Interject prompt..."
                        style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', resize: 'none', height: '60px' }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
                    />
                    <button className="btn" aria-label="Submit Message" onClick={submitChat} disabled={isLoading}><MessageSquare size={18} /></button>
                </div>

            </div>
        </div>
    )
}
