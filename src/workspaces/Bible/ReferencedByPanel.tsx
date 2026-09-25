import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { Hash, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function ReferencedByPanel({ entryId, novelId }: { entryId: string, novelId: string }) {
    const [occurrences, setOccurrences] = useState<any[]>([])
    const navigate = useNavigate()
    const { setActiveScene } = useWorkspaceStore()

    useEffect(() => {
        if (!entryId || !novelId) return

        const loadOccurrences = async () => {
            const scenes = await db.scenes.where({ novelId }).toArray()

            const backlinks = scenes.filter(s => {
                const str = JSON.stringify(s.content)
                return str.includes(`"data-id":"${entryId}"`) || str.includes(`"id":"${entryId}"`)
            }).map(s => ({
                id: `link-${s.id}`,
                sceneId: s.id,
                sceneName: s.name,
                sortOrder: s.narrativePosition?.sequence ?? s.sortOrder,
                isConfirmed: true,
                confidence: 1
            })).sort((a, b) => a.sortOrder - b.sortOrder)

            setOccurrences(backlinks)
        }
        loadOccurrences()
    }, [entryId, novelId])

    if (occurrences.length === 0) return null

    return (
        <div className="spike-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><MapPin size={18} /> Referenced By</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {occurrences.map(o => (
                    <div key={o.id} className="hover-bg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => { setActiveScene(o.sceneId); navigate('/writing') }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Hash size={16} color="var(--color-text-muted)" />
                            <strong style={{ color: 'var(--color-text)' }}>{o.sceneName}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            <span>Score: {Math.round(o.confidence * 100)}%</span>
                            <span>{o.isConfirmed ? 'Explicit' : 'Detected'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
