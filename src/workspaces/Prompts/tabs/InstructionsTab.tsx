import { useState, useEffect } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import type { Prompt } from '../../../db/schema'
import { PromptService } from '../../../services/PromptService'

export default function InstructionsTab({ activePrompt, reloadPrompts }: { activePrompt: Prompt; reloadPrompts: () => void }) {
    const isSystem = activePrompt.scope === 'built-in'

    const [localSystem, setLocalSystem] = useState(activePrompt.systemInstruction || '')
    const [localUser, setLocalUser] = useState(activePrompt.userTemplate || '')

    useEffect(() => {
        setLocalSystem(activePrompt.systemInstruction || '')
        setLocalUser(activePrompt.userTemplate || '')
    }, [activePrompt.id]) // Reset on prompt switch

    const handleUpdate = async (updates: Partial<Prompt>) => {
        if (isSystem) return
        await PromptService.updatePrompt(activePrompt.id, updates)
        await reloadPrompts()
    }

    // Validation Logic
    const extractVariables = (text: string) => {
        const matches = text.match(/\{\{\s*[\w]+\s*\}\}/g) || []
        return [...new Set(matches.map(m => m.replace(/[\{\}\s]/g, '')))]
    }

    const referencedVars = new Set([
        ...extractVariables(localSystem),
        ...extractVariables(localUser)
    ])
    const definedInputs = activePrompt.inputs?.map(i => i.name) || []

    const missingVariables = [...referencedVars].filter(v => !definedInputs.includes(v))
    const unusedInputs = definedInputs.filter(v => !referencedVars.has(v))

    return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Validation Alerts */}
            {(missingVariables.length > 0 || unusedInputs.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {missingVariables.map(v => (
                        <div key={`miss-${v}`} style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <AlertTriangle size={16} /> ⚠ <strong>{`{{${v}}}`}</strong> is referenced but no matching Input is defined.
                        </div>
                    ))}
                    {unusedInputs.map(v => (
                        <div key={`unused-${v}`} style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--color-info)', borderRadius: 'var(--radius-sm)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <Info size={16} /> <em>{v}</em> is defined in Inputs but never referenced in Instructions.
                        </div>
                    ))}
                </div>
            )}

            <div className="spike-section">
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>System Instruction</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Defines the rigid persona and operational rules the AI must follow.</p>
                <textarea
                    value={localSystem}
                    disabled={isSystem}
                    onChange={e => setLocalSystem(e.target.value)}
                    onBlur={e => { if (e.target.value !== activePrompt.systemInstruction) handleUpdate({ systemInstruction: e.target.value }); }}
                    style={{ width: '100%', minHeight: '150px', padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', resize: 'vertical' }}
                />
            </div>

            <div className="spike-section">
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>User Template</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Define dynamic interpolation bindings via <code>{`{{VariableName}}`}</code> for targeted contextual generation.</p>
                <textarea
                    value={localUser}
                    disabled={isSystem}
                    onChange={e => setLocalUser(e.target.value)}
                    onBlur={e => { if (e.target.value !== activePrompt.userTemplate) handleUpdate({ userTemplate: e.target.value }); }}
                    style={{ width: '100%', minHeight: '300px', padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', resize: 'vertical' }}
                />
            </div>

        </div>
    )
}
