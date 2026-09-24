import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { PromptService } from '../../services/PromptService'
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
        PromptService.getPrompts(activeProjectId).then((p: any) => {
            setPrompts(p)
            if (p.length > 0) {
                setPromptA(p[0].id)
                setPromptB(p.length > 1 ? p[1].id : p[0].id)
            }
        })
        db.aiModels.where({ projectId: activeProjectId }).filter((m: any) => !!m.isEnabled).toArray().then((m: any) => {
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
                    <label htmlFor="prompt-a" className="sr-only" aria-label="Endpoint Prompt Path A">Prompt Template Node Path A</label>
                    <select id="prompt-a" className="input" aria-label="Select Prompt A" value={promptA} onChange={e => setPromptA(e.target.value)}>
                        {prompts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <label htmlFor="model-a" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>AI Model Allocation - Path A</label>
                    <select id="model-a" className="input" aria-label="Select Model A" value={modelA} onChange={e => setModelA(e.target.value)}>
                        {models.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
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
                    <label htmlFor="prompt-b" className="sr-only" aria-label="Endpoint Prompt Path B">Prompt Template Node Path B</label>
                    <select id="prompt-b" className="input" aria-label="Select Prompt B" value={promptB} onChange={e => setPromptB(e.target.value)}>
                        {prompts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <label htmlFor="model-b" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>AI Model Allocation - Path B</label>
                    <select id="model-b" className="input" aria-label="Select Model B" value={modelB} onChange={e => setModelB(e.target.value)}>
                        {models.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                    </select>
                    <div style={{ flex: 1, background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--color-border)' }}>
                        {loading ? <span style={{ color: 'var(--color-warning)' }}>Querying endpoint B...</span> : outputB || 'Awaiting execution...'}
                    </div>
                </div>

            </div>
        </div>
    )
}
