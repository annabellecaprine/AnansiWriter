import { useState, useEffect } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { PromptService } from '../../services/PromptService'
import { AIService } from '../../services/AIService'
import { Prompt, PromptPreset, PromptInputRule } from '../../db/schema'
import { db } from '../../db/database'
import { X, ChevronDown, ChevronRight, Wand2, Plus, Loader2 } from 'lucide-react'

export default function AIPromptInvocationHub() {
    const { isHubOpen, activeCapability, activeBookmark, closeHub } = useAIStore()
    const { activeNovelId } = useWorkspaceStore()

    // ─────────────────────────────────────────────────────────
    // Multi-Stage State
    // ─────────────────────────────────────────────────────────
    const [step, setStep] = useState<'picker' | 'form'>('picker')
    const [prompts, setPrompts] = useState<Prompt[]>([])

    // Form State
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
    const [activePreset, setActivePreset] = useState<string | null>(null)
    const [freeform, setFreeform] = useState('')
    const [controlValues, setControlValues] = useState<Record<string, any>>({})
    const [showOptions, setShowOptions] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Centralized cancel lifecycle to ensure native field restores its selection visually
    const handleCancel = () => {
        if (activeCapability && activeBookmark) {
            activeCapability.onCancel?.(activeBookmark)
        }
        closeHub()
    }

    useEffect(() => {
        if (isHubOpen && activeCapability) {
            // Load applicable prompts
            PromptService.getPrompts(activeNovelId || undefined, false).then(all => {
                const applicable = all.filter(p => !p.applicableFields || p.applicableFields.includes(activeCapability.kind))
                setPrompts(applicable)
            })
            setStep('picker')
            setSelectedPrompt(null)
            setActivePreset(null)
            setFreeform('')
            setControlValues({})
            setShowOptions(false)
            setErrorMsg('')
        }
    }, [isHubOpen, activeCapability, activeNovelId])

    if (!isHubOpen || !activeCapability) return null

    // ─────────────────────────────────────────────────────────
    // Interactivity
    // ─────────────────────────────────────────────────────────
    const handleSelectPrompt = (p: Prompt) => {
        setSelectedPrompt(p)
        setStep('form')
        if (p.presets?.length > 0) {
            handleApplyPreset(p.presets[0].id, p)
            setShowOptions(false)
        } else {
            setShowOptions(true)

            // Apply defaults
            const defaults: Record<string, any> = {}
            if (p.inputs) {
                p.inputs.forEach(ci => {
                    if (ci.defaultValue !== undefined) defaults[ci.name] = ci.defaultValue
                })
            }
            setControlValues(defaults)
        }
    }

    const handleApplyPreset = (presetId: string, promptRef = selectedPrompt) => {
        if (!promptRef) return
        setActivePreset(presetId)
        const preset = promptRef.presets?.find(pr => pr.id === presetId)
        if (preset) {
            setControlValues({ ...preset.values })
        }
    }

    const handleExecute = async () => {
        if (!selectedPrompt || !activeBookmark) return
        setIsGenerating(true)
        setErrorMsg('')
        try {
            // In a full implementation, we'd pass ContextRequirements into a separate ContextEngine pipeline here.

            // Minimal compiled system instruction based on literal input maps for the verification structure:
            const sys = selectedPrompt.systemInstruction
                + `\n\nConstraints:\n${activeCapability.getFieldConstraints().description}`

            let userContent = freeform ? `Request: ${freeform}\n\n` : ''

            // Inject requested contexts
            const { activeSceneId } = useWorkspaceStore.getState()
            const resolvedSceneId = activeCapability.contextEntityId || activeSceneId

            if (resolvedSceneId && selectedPrompt.contextRecipe?.some(cr => cr.source === 'currentScene')) {
                const scene = await db.scenes.get(resolvedSceneId)
                if (scene && scene.content) {
                    const extractText = (node: any): string => {
                        if (node.type === 'text') return node.text || '';
                        let text = '';
                        if (node.content && Array.isArray(node.content)) {
                            text = node.content.map(extractText).join('');
                        }
                        return node.type === 'paragraph' ? text + '\n' : text;
                    }
                    const plainContent = extractText(scene.content).trim();
                    userContent += `[Context: Active Scene Prose]\n${plainContent}\n\n`
                }
            }
            if (resolvedSceneId && selectedPrompt.contextRecipe?.some(cr => cr.source === 'sceneSummary')) {
                const scene = await db.scenes.get(resolvedSceneId)
                if (scene && scene.summary) {
                    userContent += `[Context: Active Scene Summary]\n${scene.summary}\n\n`
                }
            }

            // Build Context snippet visually (simplification of true Engine resolution)
            const selectedText = activeCapability.getSelectedText(activeBookmark)
            if (selectedText) {
                userContent += `[Context: Active Selection]\n${selectedText}\n\n`
            }

            // Send compiled variable configs deterministically
            const resolvedStr = Object.entries(controlValues)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n')

            if (resolvedStr) {
                userContent += `[Configuration Variables]\n${resolvedStr}\n\n`
            }

            userContent += `Perform the requested action on the provided specific context bounds efficiently.`

            const result = await AIService.generate(
                activeNovelId || 'global',
                sys,
                userContent,
                selectedPrompt.defaultModel,
                'proxy',
                undefined,
                selectedPrompt,
                controlValues
            )

            activeCapability.applyResult(activeBookmark, result)
            closeHub()
        } catch (err: any) {
            setErrorMsg(err.message || 'Generation failed.')
        } finally {
            setIsGenerating(false)
        }
    }

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '6rem', zIndex: 9999
        }}>
            <div style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                width: '100%', maxWidth: '420px',
                border: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent)' }}>
                        <Wand2 size={16} />
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                            {step === 'picker' ? 'AI Writable Actions' : selectedPrompt?.name}
                        </h3>
                    </div>
                    <button onClick={handleCancel} className="icon-btn" style={{ padding: '0.2rem' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {step === 'picker' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {prompts.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No applicable prompts for {activeCapability.kind}.</p>
                            ) : (
                                prompts.map(p => (
                                    <button
                                        key={p.id}
                                        className="btn outline"
                                        style={{ justifyContent: 'flex-start', padding: '0.75rem', fontWeight: 500 }}
                                        onClick={() => handleSelectPrompt(p)}
                                    >
                                        {p.name}
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {step === 'form' && selectedPrompt && (
                        <>
                            {selectedPrompt.presets && selectedPrompt.presets.length > 0 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Preset</label>
                                    <select
                                        className="input"
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem' }}
                                        value={activePreset || ''}
                                        onChange={e => handleApplyPreset(e.target.value)}
                                    >
                                        {selectedPrompt.presets.map(pr => (
                                            <option key={pr.id} value={pr.id}>{pr.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>What do you need?</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Optional instructions..."
                                    value={freeform}
                                    onChange={e => setFreeform(e.target.value)}
                                    style={{ width: '100%', fontSize: '0.85rem', resize: 'none' }}
                                    autoFocus
                                />
                            </div>

                            {/* Options Expander */}
                            {selectedPrompt.inputs && selectedPrompt.inputs.length > 0 && (
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                    <button
                                        className="btn"
                                        style={{ width: '100%', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--color-surface)', border: 'none', borderRadius: 0 }}
                                        onClick={() => setShowOptions(!showOptions)}
                                    >
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Options</span>
                                        {showOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    {showOptions && (
                                        <div style={{ padding: '0.75rem', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {selectedPrompt.inputs.map(input => (
                                                <div key={input.name}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem' }}>{input.name}</label>
                                                    {input.manualType === 'select' ? (
                                                        <select
                                                            className="input"
                                                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.3rem' }}
                                                            value={controlValues[input.name] || ''}
                                                            onChange={e => setControlValues({ ...controlValues, [input.name]: e.target.value })}
                                                        >
                                                            {input.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.3rem' }}
                                                            value={controlValues[input.name] || ''}
                                                            onChange={e => setControlValues({ ...controlValues, [input.name]: e.target.value })}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {errorMsg && <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)' }}>{errorMsg}</p>}
                        </>
                    )}
                </div>

                {/* Footer */}
                {step === 'form' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                        <button className="btn" onClick={() => setStep('picker')} disabled={isGenerating}>Back</button>
                        <button className="btn primary" onClick={handleExecute} disabled={isGenerating} style={{ minWidth: '80px', justifyContent: 'center' }}>
                            {isGenerating ? <Loader2 size={16} className="spin" /> : 'Go'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
