import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { PromptService } from '../../services/PromptService'
import { Plus, Wand2, Trash2, Copy, Star } from 'lucide-react'
import type { Prompt } from '../../db/schema'

export default function PromptsDashboard() {
    const { activeProjectId } = useWorkspaceStore()
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [activePromptId, setActivePromptId] = useState<string | null>(null)

    const loadPrompts = async () => {
        if (!activeProjectId) return
        const p = await PromptService.getPrompts(activeProjectId)
        setPrompts(p)
    }

    useEffect(() => {
        loadPrompts()
    }, [activeProjectId])

    const handleCreate = async () => {
        if (!activeProjectId) return
        const name = prompt("Enter a name for the new Prompt:")
        if (!name) return
        const newId = await PromptService.createPrompt(activeProjectId, name)
        setActivePromptId(newId)
        loadPrompts()
    }

    const activePrompt = prompts.find(p => p.id === activePromptId)

    if (!activeProjectId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>Please open a project to access Prompts.</p>
            </div>
        )
    }

    return (
        <div className="workspace-view" style={{ display: 'flex', flexDirection: 'row', height: '100vh', padding: 0, overflow: 'hidden' }}>
            {/* Sidebar List */}
            <div style={{ width: '300px', background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wand2 size={18} />
                        Macro Library
                    </h2>
                    <button className="icon-btn" onClick={handleCreate}><Plus size={18} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {prompts.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No prompts yet.</p>
                    ) : (
                        prompts.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setActivePromptId(p.id)}
                                style={{
                                    padding: '0.75rem',
                                    background: activePromptId === p.id ? 'var(--color-surface)' : 'transparent',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '0.25rem'
                                }}
                            >
                                <span style={{ fontWeight: activePromptId === p.id ? 700 : 500 }}>{p.name}</span>
                                {p.isFavorite && <Star size={14} color="var(--color-warning)" fill="currentColor" />}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Editor Canvas */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', overflowY: 'auto', padding: '2rem' }}>
                {activePrompt ? (
                    <div style={{ maxWidth: '800px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <input
                                    type="text"
                                    defaultValue={activePrompt.name}
                                    onBlur={e => { PromptService.updatePrompt(activePrompt.id, { name: e.target.value }); loadPrompts(); }}
                                    style={{ fontSize: '1.8rem', fontWeight: 800, background: 'transparent', border: 'none', outline: 'none', padding: 0, marginBottom: '0.5rem', width: '100%' }}
                                />
                                <span style={{ color: 'var(--color-text-muted)' }}>{activePrompt.category} Macro</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="icon-btn" onClick={async () => { await PromptService.updatePrompt(activePrompt.id, { isFavorite: !activePrompt.isFavorite }); loadPrompts() }}>
                                    <Star size={18} color="var(--color-warning)" fill={activePrompt.isFavorite ? "currentColor" : "none"} />
                                </button>
                                <button className="icon-btn" onClick={async () => { const id = await PromptService.duplicatePrompt(activePrompt); await loadPrompts(); setActivePromptId(id) }}>
                                    <Copy size={18} />
                                </button>
                                <button className="icon-btn" style={{ color: 'var(--color-danger)' }} onClick={async () => { if (confirm('Delete?')) { await PromptService.deletePrompt(activePrompt.id); setActivePromptId(null); loadPrompts() } }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="spike-section">
                            <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>System Instruction</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Defines the rigid persona and operational rules the AI must follow.</p>
                            <textarea
                                defaultValue={activePrompt.systemInstruction}
                                onBlur={e => { PromptService.updatePrompt(activePrompt.id, { systemInstruction: e.target.value }); }}
                                style={{ width: '100%', minHeight: '150px', padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', resize: 'vertical' }}
                            />
                        </div>

                        <div className="spike-section">
                            <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>User Template</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Define dynamic interpolation bindings (e.g. `{'{{content}}'}`) for targeted contextual generation.</p>
                            <textarea
                                defaultValue={activePrompt.userTemplate}
                                onBlur={e => { PromptService.updatePrompt(activePrompt.id, { userTemplate: e.target.value }); }}
                                style={{ width: '100%', minHeight: '200px', padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', resize: 'vertical' }}
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <Wand2 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <h2>Select or Create a Concept Macro</h2>
                    </div>
                )}
            </div>
        </div>
    )
}
