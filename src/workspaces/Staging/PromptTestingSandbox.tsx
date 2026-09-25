import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { PromptService } from '../../services/PromptService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Play, Sparkles } from 'lucide-react'
import { AIService } from '../../services/AIService'
import { ContextEngine } from '../../services/ai/ContextEngine'
import type { Prompt, AIModel } from '../../db/schema'
import { confirmAlert } from '../../store/dialogStore'
import { useSearchParams } from 'react-router-dom'

export default function PromptTestingSandbox() {
    const { activeNovelId, activeSceneId } = useWorkspaceStore()
    const [searchParams] = useSearchParams()

    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [models, setModels] = useState<AIModel[]>([])

    const [promptA, setPromptA] = useState('')
    const [promptB, setPromptB] = useState('')
    const [modelA, setModelA] = useState('')
    const [modelB, setModelB] = useState('')

    const [manualInputsA, setManualInputsA] = useState<Record<string, string>>({})
    const [manualInputsB, setManualInputsB] = useState<Record<string, string>>({})

    const [outputA, setOutputA] = useState('')
    const [outputB, setOutputB] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!activeNovelId) return
        PromptService.getPrompts(activeNovelId).then((p: any) => {
            setPrompts(p)
            if (p.length > 0) {
                const targetId = searchParams.get('promptId')
                if (targetId && p.find((pr: any) => pr.id === targetId)) {
                    setPromptA(targetId)
                    setPromptB(p.length > 1 ? (p[0].id === targetId ? p[1].id : p[0].id) : targetId)
                } else {
                    setPromptA(p[0].id)
                    setPromptB(p.length > 1 ? p[1].id : p[0].id)
                }
            }
        })
        db.aiModels.where({ novelId: activeNovelId }).filter((m: any) => !!m.isEnabled).toArray().then((m: any) => {
            setModels(m)
            if (m.length > 0) {
                setModelA(m[0].id)
                setModelB(m.length > 1 ? m[1].id : m[0].id)
            }
        })
    }, [activeNovelId])

    const previewPayload = async (variant: 'A' | 'B') => {
        if (!activeNovelId) return
        const p = variant === 'A' ? prompts.find(pr => pr.id === promptA) : prompts.find(pr => pr.id === promptB)
        const inputs = variant === 'A' ? manualInputsA : manualInputsB
        if (!p) return

        try {
            const assembly = await ContextEngine.assemble(p, activeSceneId, inputs)
            const json = JSON.stringify(assembly, null, 2)
            if (variant === 'A') setOutputA(json)
            else setOutputB(json)
        } catch (e: any) {
            alert(e.message)
        }
    }

    const runComparison = async () => {
        if (!activeNovelId) return
        setLoading(true)
        try {
            const pA = prompts.find(p => p.id === promptA)
            const pB = prompts.find(p => p.id === promptB)
            const mA = models.find(m => m.id === modelA)
            const mB = models.find(m => m.id === modelB)

            if (!pA || !pB || !mA || !mB) return

            // 1. Process variables via Context Engine
            const [assemblyA, assemblyB] = await Promise.all([
                ContextEngine.assemble(pA, activeSceneId, manualInputsA),
                ContextEngine.assemble(pB, activeSceneId, manualInputsB)
            ])

            // 2. Transmit assembled payloads
            const [resA, resB] = await Promise.all([
                AIService.generate(activeNovelId, assemblyA.assembledSystemInstruction, assemblyA.assembledUserPrompt, mA.modelId, mA.provider, 'sandbox', pA, manualInputsA),
                AIService.generate(activeNovelId, assemblyB.assembledSystemInstruction, assemblyB.assembledUserPrompt, mB.modelId, mB.provider, 'sandbox', pB, manualInputsB)
            ])

            setOutputA(resA)
            setOutputB(resB)
        } catch (e: any) {
            await confirmAlert({
                title: 'Comparison Failed',
                message: `Comparison failed: ${e.message}`,
                isDestructive: true
            })
        } finally {
            setLoading(false)
        }
    }

    const renderDynamicForm = (promptId: string, setInputs: Function, currentInputs: Record<string, string>) => {
        const p = prompts.find(pr => pr.id === promptId)
        if (!p || !p.inputs) return null

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-primary)' }}>Execution Variables</h4>
                {p.inputs.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No inputs configured.</span>}
                {p.inputs.map(rule => (
                    <div key={rule.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>{rule.name}</label>
                        {rule.kind === 'context' ? (
                            <input className="input" style={{ opacity: 0.5 }} disabled value={`[Context: ${rule.type}]`} />
                        ) : (
                            <input
                                className="input"
                                placeholder={String(rule.defaultValue || '')}
                                value={currentInputs[rule.name] || ''}
                                onChange={e => setInputs((prev: any) => ({ ...prev, [rule.name]: e.target.value }))}
                            />
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100vh' }}>
            <header>
                <h2><Sparkles size={20} /> Prompt Testing Sandbox</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Non-destructive evaluation arrays spanning logic and latency tracking. Tests use Context Engine bindings for accurate staging.</p>
            </header>

            <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>

                {/* Variant A */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                    <h3 style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '0.5rem' }}>Variant A</h3>
                    <select id="prompt-a" className="input" aria-label="Select Prompt A" value={promptA} onChange={e => setPromptA(e.target.value)}>
                        {prompts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <select id="model-a" className="input" aria-label="Select Model A" value={modelA} onChange={e => setModelA(e.target.value)}>
                        {models.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                    </select>

                    {renderDynamicForm(promptA, setManualInputsA, manualInputsA)}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" onClick={() => previewPayload('A')} disabled={loading}>
                            Preview Payload
                        </button>
                    </div>

                    <div style={{ flex: 1, background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {loading ? <span style={{ color: 'var(--color-warning)' }}>Querying endpoint A...</span> : outputA || 'Awaiting execution...'}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="btn" onClick={runComparison} disabled={loading} style={{ padding: '1rem', height: 'fit-content' }}>
                        <Play size={24} />
                    </button>
                </div>

                {/* Variant B */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                    <h3 style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: '0.5rem' }}>Variant B</h3>
                    <select id="prompt-b" className="input" aria-label="Select Prompt B" value={promptB} onChange={e => setPromptB(e.target.value)}>
                        {prompts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <select id="model-b" className="input" aria-label="Select Model B" value={modelB} onChange={e => setModelB(e.target.value)}>
                        {models.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                    </select>

                    {renderDynamicForm(promptB, setManualInputsB, manualInputsB)}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" onClick={() => previewPayload('B')} disabled={loading}>
                            Preview Payload
                        </button>
                    </div>

                    <div style={{ flex: 1, background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {loading ? <span style={{ color: 'var(--color-warning)' }}>Querying endpoint B...</span> : outputB || 'Awaiting execution...'}
                    </div>
                </div>

            </div>
        </div>
    )
}
