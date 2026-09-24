import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { Activity, Clock, Search } from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { AIRequestHistory, AIModel } from '../../db/schema'

export default function InferenceTelemetry() {
    const { activeProjectId } = useWorkspaceStore()
    const [history, setHistory] = useState<AIRequestHistory[]>([])
    const [models, setModels] = useState<AIModel[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        if (!activeProjectId) return;
        const load = async () => {
            const h = await db.aiRequestHistory.where({ projectId: activeProjectId }).reverse().sortBy('timestamp')
            const m = await db.aiModels.where({ projectId: activeProjectId }).toArray()

            // Clean up old age history logic > 90 days or > 500 count locally
            const pruned = h.slice(0, 500)
            if (h.length > pruned.length) {
                const toDelete = h.slice(500).map(x => x.id)
                await db.aiRequestHistory.bulkDelete(toDelete)
            }

            setModels(m)
            setHistory(pruned)
        }
        load()
    }, [activeProjectId])

    const calculateCost = (h: AIRequestHistory) => {
        const m = models.find(mod => mod.modelId === h.modelId)
        if (!m) return 'Unknown'
        const estCost = ((h.tokenCount / 1000) * m.costPer1kOutput).toFixed(4)
        return `$${estCost}`
    }

    const clearHistory = async () => {
        if (confirm("Destroy inference caches entirely?")) {
            await db.aiRequestHistory.where({ projectId: activeProjectId }).delete()
            setHistory([])
        }
    }

    const viewing = history.find(h => h.id === selectedId)

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100vh', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Activity /> Inference Telemetry</h2>
                    <button className="btn" onClick={clearHistory}>Clear Metrics</button>
                </header>

                <div className="spike-section" style={{ display: 'grid', gap: '0.5rem' }}>
                    {history.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No inference telemetry logged yet.</p>}
                    {history.map(h => (
                        <div key={h.id}
                            onClick={() => setSelectedId(h.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: selectedId === h.id ? 'var(--color-bg)' : 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <strong>{h.promptName}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {new Date(h.timestamp).toLocaleString()} • {h.modelId}</span>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                                <strong style={{ color: 'var(--color-accent)' }}>~{h.tokenCount} t</strong>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{calculateCost(h)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payload Inspector Node */}
            <div style={{ flex: 1, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '1.5rem', overflowY: 'auto', border: '1px solid var(--color-border)' }}>
                {viewing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Search size={18} /> Payload Verification Array</h3>

                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Reopened Transmission Result</label>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                            {viewing.payload ? (viewing.payload as any).response : 'Response decoupled due to metadata-only constraints.'}
                        </div>

                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Internal System Vectors</label>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)' }}>
                            {viewing.payload ? (viewing.payload as any).systemInstruction : 'N/A'}
                        </div>

                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>User Payload Assembly</label>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)' }}>
                            {viewing.payload ? (viewing.payload as any).userPrompt : 'N/A'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                        Select a historical transmission node to inspect.
                    </div>
                )}
            </div>
        </div>
    )
}
