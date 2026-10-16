import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Calendar, Hash, Clock } from 'lucide-react'
import { getSceneNarrativeSequence } from '../../services/ai/narrativeComparator'

export default function NarrativeTimeline() {
    const { activeNovelId } = useWorkspaceStore()
    const [scenes, setScenes] = useState<any[]>([])

    useEffect(() => {
        if (!activeNovelId) return

        const buildTimeline = async () => {
            const s = await db.scenes.where({ novelId: activeNovelId }).toArray()
            // Strictly order using the canonical narrative comparator shared with ContextEngine
            s.sort((a, b) => getSceneNarrativeSequence(a) - getSceneNarrativeSequence(b))
            setScenes(s)
        }
        buildTimeline()
    }, [activeNovelId])

    if (scenes.length === 0) return null

    return (
        <div className="surface-panel" style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Calendar size={18} /> Narrative Vector Timeline
            </h3>

            <div style={{ padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '2rem', top: 0, bottom: 0, width: '2px', background: 'var(--color-border)' }}></div>

                {scenes.map((s, idx) => {
                    const canonicalSeq = getSceneNarrativeSequence(s)
                    const isExplicitSequence = s.narrativePosition?.sequence != null
                    const hasTimelineStart = s.timelineStart != null
                    const isFlashback = s.tags?.includes('Flashback') || (isExplicitSequence && s.narrativePosition.sequence !== s.sortOrder)

                    return (
                        <div key={s.id} style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-accent)', position: 'relative', top: '5px', left: '0.8rem', zIndex: 2, border: '2px solid var(--color-bg)' }}></div>

                            <div style={{ flex: 1, background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Hash size={16} color="var(--color-text-muted)" />
                                        {s.name}
                                        {isFlashback && <span className="status-badge" style={{ background: 'var(--color-warning)', color: '#000', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Flashback</span>}
                                    </h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        Seq {canonicalSeq} · Event Node {idx + 1}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    <span>
                                        Ordering Source:{' '}
                                        <strong style={{ color: 'var(--color-text)' }}>
                                            {isExplicitSequence ? 'Explicit Sequence' : (hasTimelineStart ? 'Timeline Start (Epoch)' : 'Manuscript Order (Fallback)')}
                                        </strong>
                                    </span>
                                    {s.timelineLabel && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={12} /> {s.timelineLabel}
                                        </span>
                                    )}
                                </div>

                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    {s.notes || 'No timeline notes provided for this narrative vector.'}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
