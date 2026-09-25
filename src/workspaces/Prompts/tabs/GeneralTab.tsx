import { useState, useEffect } from 'react'
import type { Prompt, PromptCategory, AIModel } from '../../../db/schema'
import { PromptService } from '../../../services/PromptService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { db } from '../../../db/database'
import { promptInput } from '../../../store/dialogStore'

export default function GeneralTab({ activePrompt, reloadPrompts, categories }: { activePrompt: Prompt; reloadPrompts: () => void; categories: PromptCategory[] }) {
    const { activeNovelId } = useWorkspaceStore()
    const isSystem = activePrompt.scope === 'built-in'

    const [models, setModels] = useState<AIModel[]>([])

    useEffect(() => {
        if (!activeNovelId) return
        db.aiModels.where({ novelId: activeNovelId }).filter(m => !!m.isEnabled).toArray().then(setModels)
    }, [activeNovelId])

    const handleUpdate = async (updates: Partial<Prompt>) => {
        if (isSystem) return
        await PromptService.updatePrompt(activePrompt.id, updates)
        await reloadPrompts()
    }

    const handleCreateCategory = async () => {
        const name = await promptInput({
            title: 'Create Category',
            message: 'Enter a name for the new Category:',
            placeholder: 'Category Name'
        })
        if (!name) return
        const newId = await PromptService.createCategory(name, false, activeNovelId || undefined)
        await reloadPrompts()
        // Automatically assign the current prompt to this category
        await handleUpdate({ categoryId: newId })
    }

    const toggleAllowedModel = (modelId: string) => {
        if (isSystem) return
        const current = activePrompt.allowedModels || []
        const newAllowed = current.includes(modelId) ? current.filter(id => id !== modelId) : [...current, modelId]
        handleUpdate({ allowedModels: newAllowed })
    }

    const TagsEditor = () => {
        const [tagInput, setTagInput] = useState('')
        return (
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Tags</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {(activePrompt.tags || []).map(t => (
                        <span key={t} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {t}
                            {!isSystem && <button className="icon-btn" style={{ padding: 0 }} onClick={() => handleUpdate({ tags: activePrompt.tags.filter(tag => tag !== t) })}>×</button>}
                        </span>
                    ))}
                </div>
                {!isSystem && (
                    <input
                        type="text"
                        className="input"
                        placeholder="Add tag and press Enter..."
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && tagInput.trim()) {
                                handleUpdate({ tags: [...(activePrompt.tags || []), tagInput.trim()] })
                                setTagInput('')
                            }
                        }}
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                )}
            </div>
        )
    }

    return (
        <div style={{ padding: '2rem' }}>
            <div className="spike-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Core Metadata */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--color-accent)' }}>Core Metadata</h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                            <input
                                type="checkbox"
                                checked={activePrompt.isEnabled ?? true}
                                disabled={isSystem}
                                onChange={e => handleUpdate({ isEnabled: e.target.checked })}
                            />
                            Enabled
                        </label>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Prompt Name</label>
                        <input
                            type="text"
                            className="input"
                            style={{ width: '100%', padding: '0.5rem' }}
                            defaultValue={activePrompt.name}
                            disabled={isSystem}
                            onBlur={e => { if (e.target.value !== activePrompt.name) handleUpdate({ name: e.target.value }) }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Category</label>
                            {!isSystem && (
                                <button className="icon-btn" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', padding: 0 }} onClick={handleCreateCategory}>
                                    + Add New Category
                                </button>
                            )}
                        </div>
                        <select
                            className="input"
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={activePrompt.categoryId}
                            disabled={isSystem}
                            onChange={e => handleUpdate({ categoryId: e.target.value })}
                        >
                            <option value="">Uncategorized</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <TagsEditor />

                    {/* Output Mode */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Output Mode</label>
                        <select
                            className="input"
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={activePrompt.outputMode}
                            disabled={isSystem}
                            onChange={e => handleUpdate({ outputMode: e.target.value as any })}
                        >
                            <option value="chat">Chat / Freeform</option>
                            <option value="suggestion">Inline Suggestion</option>
                            <option value="diff">Code/Text Diff</option>
                            <option value="structured">Structured JSON</option>
                        </select>
                    </div>

                    {/* Scope Definition */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Scope</label>
                        <div style={{ display: 'flex', gap: '1rem', background: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', opacity: isSystem ? 0.5 : 1 }}>
                                <input
                                    type="radio"
                                    name="scope"
                                    value="project"
                                    checked={activePrompt.scope === 'project'}
                                    disabled={isSystem}
                                    onChange={() => handleUpdate({ scope: 'project', novelId: activeNovelId || undefined })}
                                />
                                Project
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', opacity: isSystem ? 0.5 : 1 }}>
                                <input
                                    type="radio"
                                    name="scope"
                                    value="global"
                                    checked={activePrompt.scope === 'global'}
                                    disabled={isSystem}
                                    onChange={() => handleUpdate({ scope: 'global', novelId: undefined })}
                                />
                                Global
                            </label>
                        </div>
                    </div>

                </div>

                {/* Inference Settings */}
                <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>Inference Settings</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Default Model</label>
                        <select
                            className="input"
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={activePrompt.defaultModel}
                            disabled={isSystem}
                            onChange={e => handleUpdate({ defaultModel: e.target.value })}
                        >
                            <option value="">-- Unrestricted / Use Any --</option>
                            {models.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Allowed Models</label>
                        <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {models.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No models found in Directory</span>}
                            {models.map(m => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', opacity: isSystem ? 0.5 : 1 }}>
                                    <input
                                        type="checkbox"
                                        checked={(activePrompt.allowedModels || []).includes(m.id)}
                                        disabled={isSystem}
                                        onChange={() => toggleAllowedModel(m.id)}
                                    />
                                    {m.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', marginTop: '2rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                            <span>Temperature</span>
                            <span>{activePrompt.temperature}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            disabled={isSystem}
                            style={{ width: '100%' }}
                            value={activePrompt.temperature}
                            onChange={e => handleUpdate({ temperature: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Max Output Tokens</label>
                        <input
                            type="number"
                            className="input"
                            disabled={isSystem}
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={activePrompt.maxOutputTokens}
                            onChange={e => handleUpdate({ maxOutputTokens: parseInt(e.target.value) })}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Context Token Budget (Max input window size)</label>
                        <input
                            type="number"
                            className="input"
                            disabled={isSystem}
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={activePrompt.tokenBudget}
                            onChange={e => handleUpdate({ tokenBudget: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

            </div>
        </div>
    )
}
