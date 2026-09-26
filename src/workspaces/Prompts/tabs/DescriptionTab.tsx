import type { Prompt } from '../../../db/schema'
import { PromptService } from '../../../services/PromptService'

export default function DescriptionTab({ activePrompt, reloadPrompts }: { activePrompt: Prompt; reloadPrompts: () => void }) {
    const isSystem = activePrompt.scope === 'built-in'

    const handleUpdate = async (updates: Partial<Prompt>) => {
        if (isSystem) return
        await PromptService.updatePrompt(activePrompt.id, updates)
        await reloadPrompts()
    }

    return (
        <div style={{ padding: '2rem' }}>
            <div className="surface-panel">
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>Prompt Documentation</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Provide instructions for authors on how and when to use this prompt. This acts as the readme for standardizing project context usage.
                </p>
                <textarea
                    defaultValue={activePrompt.description}
                    disabled={isSystem}
                    placeholder="# Usage Instructions\n\nExplain the context requirements..."
                    onBlur={e => { if (e.target.value !== activePrompt.description) handleUpdate({ description: e.target.value }); }}
                    style={{ width: '100%', minHeight: '400px', padding: '1.5rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', resize: 'vertical', fontSize: '1rem', lineHeight: 1.5 }}
                />
            </div>
        </div>
    )
}
