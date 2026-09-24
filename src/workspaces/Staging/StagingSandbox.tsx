import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { MessageSquare, Save, RotateCcw, Crosshair, ArrowRightCircle } from 'lucide-react'
import { AIService } from '../../services/AIService'
import ContextPreview from '../../components/ContextPreview'
import type { ContextAssembly } from '../../services/ai/ContextEngine'

export default function StagingSandbox() {
    const { activeProjectId } = useWorkspaceStore()
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([])
    const [input, setInput] = useState('')
    const [assemblyCache, setAssemblyCache] = useState<ContextAssembly | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Load defaults
    const [characterId, setCharacterId] = useState<string>('')
    const [characters, setCharacters] = useState<any[]>([])

    useEffect(() => {
        if (!activeProjectId) return
        db.bibleEntries.where({ projectId: activeProjectId }).toArray().then(entries => {
            const chars = entries.filter(e => e.type === 'Character')
            setCharacters(chars)
            if (chars.length > 0) setCharacterId(chars[0].id)
        })
    }, [activeProjectId])

    const constructContext = async () => {
        if (!activeProjectId || !characterId) return
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
        if (!input.trim() || !activeProjectId || !assemblyCache) return

        const newMsgs = [...messages, { role: 'user', content: input }]
        setMessages(newMsgs)
        setInput('')
        setIsLoading(true)

        try {
            // Aggregate history natively
            const priorHistoryContext = newMsgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

            const responseText = await AIService.generate(
                activeProjectId,
                assemblyCache.assembledSystemInstruction,
                `${priorHistoryContext}\n\nCHARACTER:`,
                'anthropic/claude-3-haiku',
                'openrouter',
                characterId
            )

            setMessages([...newMsgs, { role: 'Character', content: responseText }])
        } catch (e: any) {
            alert(`Staging fault: ${e.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const promoteToCanon = () => {
        alert("Discovery captured! Staging nodes are non-canon. Implementing cross-bridge export to Bible soon.")
    }

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100vh', overflow: 'hidden' }}>

            {/* Sidebar Context Maps */}
            <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <div className="spike-section">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Crosshair size={18} /> Non-Canon Sandbox</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Experiments here do not affect your manuscript organically.</p>

                    <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Target Character / Role</label>
                    <select value={characterId} onChange={e => setCharacterId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                    <button className="btn" onClick={promoteToCanon} style={{ color: 'var(--color-primary)' }}><ArrowRightCircle size={16} /> Promote Insight</button>
                </header>

                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.length === 0 && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>Sandbox initialized. System is completely isolated from Canon arrays. Send a message to begin.</p>}
                    {messages.map((m, idx) => (
                        <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', maxWidth: '80%' }}>
                            <strong style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>{m.role.toUpperCase()}</strong>
                            <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                        </div>
                    ))}
                    {isLoading && <div style={{ alignSelf: 'flex-start', padding: '1rem', color: 'var(--color-warning)' }}>Synthesizing cognitive branch...</div>}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', background: 'var(--color-bg)' }}>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Interject prompt..."
                        style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', resize: 'none', height: '60px' }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
                    />
                    <button className="btn" onClick={submitChat} disabled={isLoading}><MessageSquare size={18} /></button>
                </div>

            </div>
        </div>
    )
}
