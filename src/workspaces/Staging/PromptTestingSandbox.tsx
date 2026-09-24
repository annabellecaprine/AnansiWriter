import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Play, Sparkles } from 'lucide-react'
import { AIService } from '../../services/AIService'
import type { Prompt, AIModel } from '../../db/schema'

export default function PromptTestingSandbox() {
    const { activeProjectId } = useWorkspaceStore()
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [models, setModels] = useState<AIModel[]>([])

    const [promptA, setPromptA] = useState('')
    const [promptB, setPromptB] = useState('')
    const [modelA, setModelA] = useState('')
    const [modelB, setModelB] = useState('')

    const [sampleContext, setSampleContext] = useState("We stood outside the cathedral waiting for dawn. She hadn't said a word.")

    const [outputA, setOutputA] = useState('')
    const [outputB, setOutputB] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!activeProjectId) return
        db.prompts.where({ projectId: activeProjectId }).toArray().then(p => {
            setPrompts(p)
            if (p.length > 0) {
                setPromptA(p[0].id)
                setPromptB(p[0].id)
            }
        })
        db.aiModels.where({ projectId: activeProjectId }).toArray().then(m => {
            setModels(m)
            if (m.length > 0) {
                setModelA(m[0].id)
                setModelB(m.length > 1 ? m[1].id : m[0].id)
            }
        })
    }, [activeProjectId])

    const runComparison = async () => {
        if (!activeProjectId) return
        setLoading(true)
        try {
            const pA = prompts.find(p => p.id === promptA)
            const pB = prompts.find(p => p.id === promptB)
            const mA = models.find(m => m.id === modelA)
            const mB = models.find(m => m.id === modelB)

            if (!pA || !pB || !mA || !mB) return

            const contextA = pA.userTemplate.replace(/\{\{\s*content\s*\}\}/gi, sampleContext)
            const contextB = pB.userTemplate.replace(/\{\{\s*content\s*\}\}/gi, sampleContext)

            const [resA, resB] = await Promise.all([
                AIService.generate(activeProjectId, pA.systemInstruction, contextA, mA.modelId, mA.provider, 'sandbox'),
                AIService.generate(activeProjectId, pB.systemInstruction, contextB, mB.modelId, mB.provider, 'sandbox')
            ])

            setOutputA(resA)
            setOutputB(resB)
        } catch (e: any) {
            alert(`Comparison failed: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100vh' }}>
            <header>
                <h2><Sparkles size={20} /> Prompt Testing Sandbox</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Non-destructive evaluation arrays spanning logic and latency tracking.</p>
            </header>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <textarea
                    style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', minHeight: '80px', resize: 'vertical' }}
                    value={sampleContext}
                    onChange={e => setSampleContext(e.target.value)}
                    placeholder="Sample payload context used generically across both test instances (e.g. {{content}} map)"
                />
            </div>

            <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>

                {/* Variant A */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '0.5rem' }}>Variant A</h3>
                    <select value={promptA} onChange={e => setPromptA(e.target.value)} className="select-box">
                        {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={modelA} onChange={e => setModelA(e.target.value)} className="select-box">
                        {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                    </select>
                    <div style={{ flex: 1, background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--color-border)' }}>
                        {loading ? <span style={{ color: 'var(--color-warning)' }}>Querying endpoint A...</span> : outputA || 'Awaiting execution...'}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="btn" onClick={runComparison} disabled={loading} style={{ padding: '1rem', height: 'fit-content' }}>
                        <Play size={24} />
                    </button>
                </div>

                {/* Variant B */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: '0.5rem' }}>Variant B</h3>
                    <select value={promptB} onChange={e => setPromptB(e.target.value)} className="select-box">
                        {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={modelB} onChange={e => setModelB(e.target.value)} className="select-box">
                        {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                    </select>
                    <div style={{ flex: 1, background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--color-border)' }}>
                        {loading ? <span style={{ color: 'var(--color-warning)' }}>Querying endpoint B...</span> : outputB || 'Awaiting execution...'}
                    </div>
                </div>

            </div>
        </div>
    )
}
