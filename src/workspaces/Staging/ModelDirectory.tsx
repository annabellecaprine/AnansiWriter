import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { Server, Tags, Eye, Zap, Loader2 } from 'lucide-react'
import type { AIModel } from '../../db/schema'
import { v4 as uuidv4 } from 'uuid'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function ModelDirectory() {
    const { activeProjectId } = useWorkspaceStore()
    const [models, setModels] = useState<AIModel[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!activeProjectId) return
        db.aiModels.where({ projectId: activeProjectId }).toArray().then(m => {
            if (m.length === 0) {
                // Initialize default arrays
                const defaults: AIModel[] = [
                    { id: uuidv4(), projectId: activeProjectId, provider: 'openrouter', modelId: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', maxContextTokens: 200000, defaultTemperature: 0.7, hasVision: true, tags: ['fast', 'anthropic'], isEnabled: true, costPer1kInput: 0.25, costPer1kOutput: 1.25 },
                    { id: uuidv4(), projectId: activeProjectId, provider: 'openrouter', modelId: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', maxContextTokens: 128000, defaultTemperature: 0.8, hasVision: true, tags: ['fast', 'openai'], isEnabled: true, costPer1kInput: 0.15, costPer1kOutput: 0.60 }
                ]
                db.aiModels.bulkAdd(defaults).then(() => setModels(defaults))
            } else {
                setModels(m)
            }
            setLoading(false)
        })
    }, [activeProjectId])

    const handleToggle = async (id: string, state: boolean) => {
        await db.aiModels.update(id, { isEnabled: state })
        setModels(models.map(m => m.id === id ? { ...m, isEnabled: state } : m))
    }

    if (loading) return <div style={{ padding: '2rem' }}><Loader2 className="spin" /> Pulling internal model telemetry...</div>

    return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server /> Target Model Directories</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Independent models registered onto your API endpoints dynamically spanning OpenRouter and Chutes adapters.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {models.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: m.isEnabled ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', opacity: m.isEnabled ? 1 : 0.6 }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0 }}>{m.name}</h4>
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--color-bg)', borderRadius: '1rem', color: 'var(--color-text-muted)' }}>{m.provider}</span>
                                {m.hasVision && <span title="Vision capable" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-accent)' }}><Eye size={14} /></span>}
                            </div>
                            <code style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{m.modelId}</code>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Zap size={14} /> Tokens: {m.maxContextTokens.toLocaleString()}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Temp: {m.defaultTemperature}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Tags size={14} /> {m.tags.join(', ')}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                ${m.costPer1kInput} in / ${m.costPer1kOutput} out (per 1k)
                            </div>
                        </div>

                        <div>
                            <button className="btn" onClick={() => handleToggle(m.id, !m.isEnabled)} style={{ background: m.isEnabled ? 'var(--color-surface-hover)' : 'var(--color-primary)' }}>
                                {m.isEnabled ? 'Disable Base' : 'Deploy Mapping'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button className="btn" style={{ marginTop: '1rem', alignSelf: 'flex-start' }}>+ Register New Origin</button>
        </div>
    )
}
