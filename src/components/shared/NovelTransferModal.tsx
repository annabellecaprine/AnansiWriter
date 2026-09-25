import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import type { Series } from '../../db/schema'

interface Props {
    isOpen: boolean
    onClose: () => void
    onTransfer: (seriesId: string | undefined) => void
    currentSeriesId?: string
}

export default function NovelTransferModal({ isOpen, onClose, onTransfer, currentSeriesId }: Props) {
    const [series, setSeries] = useState<Series[]>([])

    useEffect(() => {
        if (isOpen) {
            db.series.toArray().then(setSeries)
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '400px', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ margin: '0 0 1rem 0' }}>Move Novel</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>

                    {currentSeriesId !== undefined && (
                        <button className="btn" onClick={() => { onTransfer(undefined); onClose() }} style={{ textAlign: 'left', padding: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>
                            📚 <strong>Make Standalone (Remove from Series)</strong>
                        </button>
                    )}

                    {series.filter(s => s.id !== currentSeriesId).map(s => (
                        <button key={s.id} className="btn" onClick={() => { onTransfer(s.id); onClose() }} style={{ textAlign: 'left', padding: '0.75rem' }}>
                            Move to Series: <strong>{s.title}</strong>
                        </button>
                    ))}

                    {series.filter(s => s.id !== currentSeriesId).length === 0 && currentSeriesId === undefined && (
                        <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>No other series exist.</div>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button className="btn" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
