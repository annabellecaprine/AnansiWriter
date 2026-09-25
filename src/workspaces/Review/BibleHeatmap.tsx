import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Grid, Eye, Clock } from 'lucide-react'

export default function BibleHeatmap() {
    const { activeNovelId } = useWorkspaceStore()
    const [scenes, setScenes] = useState<any[]>([])
    const [entries, setEntries] = useState<any[]>([])
    const [matrix, setMatrix] = useState<Record<string, Record<string, { confirmed: number, heuristic: number }>>>({})
    const [maxVal, setMaxVal] = useState(1)
    const [mode, setMode] = useState<'manuscript' | 'narrative'>('manuscript')

    useEffect(() => {
        if (!activeNovelId) return

        const buildMatrix = async () => {
            let s = await db.scenes.where({ novelId: activeNovelId }).toArray()
            // Manuscript Order
            s.sort((a, b) => a.sortOrder - b.sortOrder)
            // Narrative Order sorts by underlying NarrativePosition
            if (mode === 'narrative') {
                s.sort((a, b) => {
                    const aSeq = a.narrativePosition?.sequence ?? a.sortOrder
                    const bSeq = b.narrativePosition?.sequence ?? b.sortOrder
                    return aSeq - bSeq
                })
            }
            setScenes(s)

            const e = await db.bibleEntries.where({ novelId: activeNovelId }).toArray()
            setEntries(e.filter(b => b.type === 'Character' || b.type === 'Location'))

            const occ = await db.occurrences.where({ novelId: activeNovelId }).toArray()

            let max = 1
            const map: Record<string, Record<string, { confirmed: number, heuristic: number }>> = {}
            e.forEach(entry => map[entry.id] = {})

            occ.forEach(o => {
                if (o.isDismissed) return
                if (!map[o.entryId]) return
                if (!map[o.entryId][o.sceneId]) map[o.entryId][o.sceneId] = { confirmed: 0, heuristic: 0 }

                if (o.isConfirmed) {
                    map[o.entryId][o.sceneId].confirmed += 1
                } else {
                    map[o.entryId][o.sceneId].heuristic += 1
                }

                const totalForScene = map[o.entryId][o.sceneId].confirmed + map[o.entryId][o.sceneId].heuristic
                if (totalForScene > max) max = totalForScene
            })

            setMatrix(map)
            setMaxVal(max)
        }
        buildMatrix()
    }, [activeNovelId, mode])

    if (scenes.length === 0 || entries.length === 0) return null

    return (
        <div className="spike-section" style={{ marginTop: '2rem', overflowX: 'auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Grid size={18} /> Bible Appearance Heatmap</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`btn ${mode === 'manuscript' ? 'active' : ''}`} style={{ background: mode === 'manuscript' ? 'var(--color-primary)' : 'var(--color-surface)', fontSize: '0.8rem' }} onClick={() => setMode('manuscript')}><Eye size={14} /> Manuscript Span</button>
                    <button className={`btn ${mode === 'narrative' ? 'active' : ''}`} style={{ background: mode === 'narrative' ? 'var(--color-primary)' : 'var(--color-surface)', fontSize: '0.8rem' }} onClick={() => setMode('narrative')}><Clock size={14} /> Chronological</button>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: '150px', flexShrink: 0, padding: '0.5rem', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Target Element</div>
                    <div style={{ display: 'flex', flex: 1 }}>
                        {scenes.map((s, idx) => (
                            <div key={s.id} title={s.name} style={{ flex: 1, minWidth: '4px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-text-muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                S{idx + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Matrix Rows */}
                {entries.map(entry => {
                    const entryData = matrix[entry.id]
                    if (!entryData) return null
                    const hasOccurrences = Object.keys(entryData).length > 0
                    if (!hasOccurrences) return null

                    return (
                        <div key={entry.id} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '150px', flexShrink: 0, padding: '0.3rem 0.5rem', fontSize: '0.8rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {entry.name}
                            </div>
                            <div style={{ display: 'flex', flex: 1 }}>
                                {scenes.map(s => {
                                    const count = entryData[s.id] || { confirmed: 0, heuristic: 0 }
                                    const total = count.confirmed + count.heuristic

                                    let bg = 'transparent'
                                    if (count.confirmed > 0) {
                                        const opacity = Math.max(0.3, count.confirmed / maxVal)
                                        bg = `rgba(0, 200, 150, ${opacity})`
                                    } else if (count.heuristic > 0) {
                                        const opacity = Math.max(0.3, count.heuristic / maxVal)
                                        bg = `repeating-linear-gradient(45deg, rgba(255,165,0,${opacity}), rgba(255,165,0,${opacity}) 4px, transparent 4px, transparent 8px)`
                                    }

                                    return (
                                        <div key={s.id} title={`${entry.name} in ${s.name} (${total} hits: ${count.confirmed} Explicit, ${count.heuristic} Detected)`} style={{ flex: 1, background: bg, minWidth: '4px', borderRight: '1px solid rgba(0,0,0,0.1)' }} />
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
