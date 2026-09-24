import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Check, X } from 'lucide-react'

export function OccurrenceReviewQueue() {
    const { activeProjectId } = useWorkspaceStore()
    const [pending, setPending] = useState<any[]>([])

    const loadPending = async () => {
        if (!activeProjectId) return
        // Fetch unreviewed occurrences sequentially 
        const items = await db.occurrences
            .where({ projectId: activeProjectId })
            .filter(o => !o.isConfirmed && !o.isDismissed)
            .limit(20)
            .toArray()

        setPending(items)
    }

    useEffect(() => {
        loadPending()
        // Simple polling hook interval to automatically show fresh indexing results
        const interval = setInterval(loadPending, 5000)
        return () => clearInterval(interval)
    }, [activeProjectId])

    const handleConfirm = async (id: string) => {
        await db.occurrences.update(id, { isConfirmed: true })
        setPending(prev => prev.filter(p => p.id !== id))
    }

    const handleDismiss = async (id: string) => {
        await db.occurrences.update(id, { isDismissed: true })
        setPending(prev => prev.filter(p => p.id !== id))
    }

    if (pending.length === 0) return null

    return (
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-accent)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Pending Lexical Reviews</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{pending.length} in queue</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pending.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                                "...{p.textPreview}..."
                            </p>
                            <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                                Matched: {p.keywordOrAlias}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="icon-btn" onClick={() => handleConfirm(p.id)} style={{ color: 'var(--color-success)', background: 'var(--color-surface-hover)' }}>
                                <Check size={18} />
                            </button>
                            <button className="icon-btn" onClick={() => handleDismiss(p.id)} style={{ color: 'var(--color-danger)', background: 'var(--color-surface-hover)' }}>
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
