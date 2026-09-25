import { Trash2, GripVertical, Settings2, Database, FormInput, Activity } from 'lucide-react'
import { useState } from 'react'
import type { Prompt, PromptInputRule } from '../../../db/schema'
import { PromptService } from '../../../services/PromptService'

export default function InputsTab({ activePrompt, reloadPrompts }: { activePrompt: Prompt; reloadPrompts: () => void }) {
    const isSystem = activePrompt.scope === 'built-in'

    const handleUpdate = async (newInputs: PromptInputRule[]) => {
        if (isSystem) return
        await PromptService.updatePrompt(activePrompt.id, { inputs: newInputs })
        await reloadPrompts()
    }

    const addRule = (kind: 'context' | 'manual') => {
        const rules = [...(activePrompt.inputs || [])]
        if (kind === 'context') {
            rules.push({
                kind: 'context',
                name: 'NewContextVariable',
                type: 'CurrentScene',
                isRequired: true,
                isAutomatic: true
            })
        } else {
            rules.push({
                kind: 'manual',
                name: 'NewVariable',
                manualType: 'text',
                isRequired: true
            })
        }
        handleUpdate(rules)
    }

    const removeRule = (idx: number) => {
        const rules = [...activePrompt.inputs]
        rules.splice(idx, 1)
        handleUpdate(rules)
    }

    const updateRule = (idx: number, updates: Partial<PromptInputRule>) => {
        const rules = [...activePrompt.inputs]
        rules[idx] = { ...rules[idx], ...updates }
        handleUpdate(rules)
    }

    // Drag and Drop State
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

    const onDragStart = (e: React.DragEvent, idx: number) => {
        if (isSystem) {
            e.preventDefault()
            return
        }
        setDraggedIdx(idx)
        e.dataTransfer.effectAllowed = 'move'
    }

    const onDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault()
        if (draggedIdx === null || draggedIdx === idx) return
    }

    const onDrop = (e: React.DragEvent, idx: number) => {
        e.preventDefault()
        if (draggedIdx === null || draggedIdx === idx) {
            setDraggedIdx(null)
            return
        }

        const rules = [...activePrompt.inputs]
        const [moved] = rules.splice(draggedIdx, 1)
        rules.splice(idx, 0, moved)
        handleUpdate(rules)
        setDraggedIdx(null)
    }

    return (
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            {/* Input Config Area */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Settings2 size={20} /> Execution Context & Inputs
                        </h3>
                        <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0', color: 'var(--color-text-muted)' }}>
                            Define what project facts the AI automatically loads and what variables the user must provide.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" disabled={isSystem} onClick={() => addRule('context')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Database size={16} /> Add Context Input
                        </button>
                        <button className="btn" disabled={isSystem} onClick={() => addRule('manual')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FormInput size={16} /> Add Manual Input
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(!activePrompt.inputs || activePrompt.inputs.length === 0) ? (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-bg)', border: '1px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-text-muted)' }}>
                            No inputs defined. The prompt will execute strictly against its raw User Template.
                        </div>
                    ) : (
                        activePrompt.inputs.map((rule, idx) => (
                            <div
                                key={idx}
                                draggable={!isSystem}
                                onDragStart={(e) => onDragStart(e, idx)}
                                onDragOver={(e) => onDragOver(e, idx)}
                                onDrop={(e) => onDrop(e, idx)}
                                style={{
                                    background: 'var(--color-bg)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    opacity: draggedIdx === idx ? 0.5 : 1,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <GripVertical size={16} color="var(--color-text-muted)" style={{ cursor: isSystem ? 'not-allowed' : 'move' }} />
                                        <span style={{ fontWeight: 600, color: rule.kind === 'context' ? 'var(--color-info)' : 'var(--color-primary)' }}>
                                            {rule.kind === 'context' ? 'Context Input' : 'Manual Variable'}
                                        </span>
                                    </div>
                                    <button className="icon-btn" disabled={isSystem} onClick={() => removeRule(idx)} style={{ color: 'var(--color-danger)' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Variable Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            style={{ width: '100%', padding: '0.5rem' }}
                                            value={rule.name}
                                            disabled={isSystem}
                                            onChange={e => updateRule(idx, { name: e.target.value.replace(/\s+/g, '') })}
                                            placeholder={rule.kind === 'manual' ? 'e.g. Tone' : 'e.g. CurrentChapter'}
                                        />
                                    </div>

                                    {rule.kind === 'context' ? (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Data Origin</label>
                                            <select
                                                className="input"
                                                style={{ width: '100%', padding: '0.5rem' }}
                                                value={rule.type || 'CurrentScene'}
                                                disabled={isSystem}
                                                onChange={e => updateRule(idx, { type: e.target.value as any })}
                                            >
                                                <option value="CurrentSelection">Current Selection</option>
                                                <option value="CurrentScene">Current Scene</option>
                                                <option value="CurrentScenePlan" disabled>Current Scene Plan (Incomplete Workspace)</option>
                                                <option value="CurrentChapter">Current Chapter</option>
                                                <option value="CurrentBook">Current Book</option>
                                                <option value="PreviousScene">Previous Scene</option>
                                                <option value="PreviousNScenes">Previous N Scenes</option>
                                                <option value="NextScene">Next Scene</option>
                                                <option value="RelevantBibleEntries">Relevant Bible / Codex Entries</option>
                                                <option value="SpecificBibleEntries">Specific Bible / Codex Entries</option>
                                                <option value="CharacterState">Character State</option>
                                                <option value="RelationshipState">Relationship State</option>
                                                <option value="CurrentLocation">Current Location</option>
                                                <option value="TimelineState">Timeline State</option>
                                                <option value="StoryGuides">Story Guides (Prose, Tone, Genre)</option>
                                                <option value="PlanningNotes" disabled>Planning Notes (Incomplete Workspace)</option>
                                                <option value="Assets">Assets / Images</option>
                                                <option value="SeriesContext">Series Context</option>
                                                <option value="PinnedContext">Pinned Context</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Input Type</label>
                                            <select
                                                className="input"
                                                style={{ width: '100%', padding: '0.5rem' }}
                                                value={rule.manualType || 'text'}
                                                disabled={isSystem}
                                                onChange={e => updateRule(idx, { manualType: e.target.value as any })}
                                            >
                                                <option value="text">Single-line Text</option>
                                                <option value="multiline">Multiline Text</option>
                                                <option value="number">Number</option>
                                                <option value="boolean">Boolean</option>
                                                <option value="select">Select</option>
                                                <option value="multi-select">Multi-select</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Specific Config Attributes Row 1 */}
                                    {rule.kind === 'context' && (
                                        <>
                                            {rule.type === 'PreviousNScenes' && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Count</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ width: '100%', padding: '0.5rem' }}
                                                        value={rule.recencyCount || 3}
                                                        disabled={isSystem}
                                                        onChange={e => updateRule(idx, { recencyCount: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                            {(rule.type === 'RelevantBibleEntries' || rule.type === 'SpecificBibleEntries' || rule.type === 'Assets' || rule.type === 'StoryGuides') && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Maximum Items</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ width: '100%', padding: '0.5rem' }}
                                                        value={rule.maxItems || 5}
                                                        disabled={isSystem}
                                                        onChange={e => updateRule(idx, { maxItems: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Token Budget</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    style={{ width: '100%', padding: '0.5rem' }}
                                                    value={rule.tokenBudgetLimit || 4000}
                                                    disabled={isSystem}
                                                    onChange={e => updateRule(idx, { tokenBudgetLimit: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {rule.kind === 'manual' && (
                                        <>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Default Value</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    style={{ width: '100%', padding: '0.5rem' }}
                                                    value={rule.defaultValue || ''}
                                                    disabled={isSystem}
                                                    onChange={e => updateRule(idx, { defaultValue: e.target.value })}
                                                />
                                            </div>
                                            {rule.manualType === 'number' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Min</label>
                                                        <input type="number" className="input" style={{ width: '100%', padding: '0.5rem' }} value={rule.min || 0} disabled={isSystem} onChange={e => updateRule(idx, { min: parseInt(e.target.value) })} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Max</label>
                                                        <input type="number" className="input" style={{ width: '100%', padding: '0.5rem' }} value={rule.max || 100} disabled={isSystem} onChange={e => updateRule(idx, { max: parseInt(e.target.value) })} />
                                                    </div>
                                                </div>
                                            )}
                                            {(rule.manualType === 'select' || rule.manualType === 'multi-select') && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Options (Comma Separated)</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        style={{ width: '100%', padding: '0.5rem' }}
                                                        value={rule.options ? rule.options.join(', ') : ''}
                                                        disabled={isSystem}
                                                        onChange={e => updateRule(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={rule.isRequired}
                                                disabled={isSystem}
                                                onChange={e => updateRule(idx, { isRequired: e.target.checked })}
                                            />
                                            Required
                                        </label>

                                        {rule.kind === 'context' && (
                                            <>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={rule.isAutomatic}
                                                        disabled={isSystem}
                                                        onChange={e => updateRule(idx, { isAutomatic: e.target.checked })}
                                                    />
                                                    Automatic (Vs. User Selectable)
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={rule.includeImages}
                                                        disabled={isSystem}
                                                        onChange={e => updateRule(idx, { includeImages: e.target.checked })}
                                                    />
                                                    Include Images
                                                </label>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Live Input Preview Sidebar */}
            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', alignSelf: 'start', position: 'sticky', top: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                    <Activity size={16} /> Input Preview
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    What information would this Prompt prompt receive if run from the current context?
                </p>

                {(!activePrompt.inputs || activePrompt.inputs.length === 0) ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        No inputs defined.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activePrompt.inputs.map((rule, idx) => (
                            <div key={idx} style={{ borderBottom: idx === activePrompt.inputs.length - 1 ? 'none' : '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                                    {rule.name}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-title)', display: 'flex', justifyContent: 'space-between' }}>
                                    {rule.kind === 'context' ? (
                                        <span>
                                            {rule.type === 'CurrentScene' && 'Chapter 4 / Scene 3'}
                                            {rule.type === 'PreviousScene' && 'Chapter 4 / Scene 2'}
                                            {rule.type === 'RelevantBibleEntries' && 'Bob, Alice Mercer'}
                                            {rule.type === 'StoryGuides' && 'Narrative Rules, Prose Tone'}
                                            {rule.type === 'Selection' && '"I never said that..."'}
                                            {rule.type === 'TimelineState' && 'Book 1 / Chapter 4 / Scene 3'}
                                            {rule.type !== 'CurrentScene' && rule.type !== 'PreviousScene' && rule.type !== 'RelevantBibleEntries' && rule.type !== 'StoryGuides' && rule.type !== 'Selection' && rule.type !== 'TimelineState' && `Value resolved from Context Engine`}
                                        </span>
                                    ) : (
                                        <span>{rule.defaultValue || `Value bound at runtime`}</span>
                                    )}
                                    <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                                        {rule.kind === 'context' ? (rule.isAutomatic ? 'Automatic' : 'User Selectable') : 'Manual'}
                                    </span>
                                </div>
                                {rule.isRequired === false && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                        (Optional)
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
