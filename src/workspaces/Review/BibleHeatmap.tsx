import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Grid, Eye, Clock } from 'lucide-react'

function extractAnalyticsDataFromJson(node: any, state: { text: string[], links: string[] } = { text: [], links: [] }) {
    if (!node) return state
    if (typeof node === 'string') {
        state.text.push(node)
        return state
    }
    if (node.type === 'text' && node.text) {
        state.text.push(node.text)
        return state
    }
    if (node.type === 'internalLink') {
        if (node.attrs?.name) state.text.push(node.attrs.name)
        if (node.attrs?.id) state.links.push(node.attrs.id)
        return state
    }
    if (Array.isArray(node)) {
        node.forEach(n => extractAnalyticsDataFromJson(n, state))
        return state
    }
    if (node.content) {
        extractAnalyticsDataFromJson(node.content, state)
    }
    return state
}

export default function BibleHeatmap() {
    const { activeNovelId } = useWorkspaceStore()
    const [scenes, setScenes] = useState<any[]>([])
    const [entries, setEntries] = useState<any[]>([])
    const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({})
    const [maxVal, setMaxVal] = useState(1)
    const [mode, setMode] = useState<'manuscript' | 'narrative'>('manuscript')

    useEffect(() => {
        if (!activeNovelId) return

        const buildMatrix = async () => {
            let s = await db.scenes.where({ novelId: activeNovelId }).toArray()

            const acts = await db.acts.where({ novelId: activeNovelId }).toArray()
            const chapters = await db.chapters.where({ novelId: activeNovelId }).toArray()

            const actSortMap: Record<string, number> = {}
            acts.forEach(a => actSortMap[a.id] = a.sortOrder)
            const chapterSortMap: Record<string, number> = {}
            chapters.forEach(c => chapterSortMap[c.id] = c.sortOrder)
            const chapterActMap: Record<string, number> = {}
            chapters.forEach(c => chapterActMap[c.id] = c.actId ? (actSortMap[c.actId] || 0) : 0)

            const chapterLabels: Record<string, string> = {}
            chapters.sort((a, b) => a.sortOrder - b.sortOrder).forEach((c, idx) => chapterLabels[c.id] = `C${idx + 1}`)

            // Manuscript Order
            s.sort((a, b) => {
                const aAct = chapterActMap[a.chapterId] || 0
                const bAct = chapterActMap[b.chapterId] || 0
                if (aAct !== bAct) return aAct - bAct

                const aChap = chapterSortMap[a.chapterId] || 0
                const bChap = chapterSortMap[b.chapterId] || 0
                if (aChap !== bChap) return aChap - bChap

                return a.sortOrder - b.sortOrder
            })

            // Bind explicitly condensed labels to the scene objects for tooltips
            s.forEach((scene: any) => {
                scene.shortLabel = `${chapterLabels[scene.chapterId] || ''}.S${scene.sortOrder + 1}: ${scene.name}`
            })

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
            const validEntries = e.filter(b => b.type?.toLowerCase() === 'character' || b.type?.toLowerCase() === 'location').sort((a, b) => b.name.length - a.name.length)
            setEntries(validEntries)

            let max = 1
            const map: Record<string, Record<string, number>> = {}
            validEntries.forEach(entry => map[entry.id] = {})

            s.forEach((scene: any) => {
                const cast = scene.cast || []
                validEntries.forEach(entry => {
                    const isPresent = cast.includes(entry.id)
                    if (isPresent) {
                        map[entry.id][scene.id] = 1
                    }
                })
            })

            // Iterate map again isolating highest hit counts (Only boolean 0/1 now)
            validEntries.forEach(entry => {
                const vals = Object.values(map[entry.id])
                if (vals.length > 0) {
                    const localMax = Math.max(...vals)
                    if (localMax > max) max = localMax
                }
            })

            setMatrix(map)
            setMaxVal(max)
        }
        buildMatrix()
    }, [activeNovelId, mode])

    if (scenes.length === 0 || entries.length === 0) return null

    return (
        <div className="surface-panel" style={{ marginTop: '2rem', overflowX: 'auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Grid size={18} /> Bible Appearance Heatmap</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`btn ${mode === 'manuscript' ? 'active' : ''}`} style={{ background: mode === 'manuscript' ? 'var(--color-accent)' : 'var(--color-surface)', fontSize: '0.8rem' }} onClick={() => setMode('manuscript')}><Eye size={14} /> Manuscript Span</button>
                    <button className={`btn ${mode === 'narrative' ? 'active' : ''}`} style={{ background: mode === 'narrative' ? 'var(--color-accent)' : 'var(--color-surface)', fontSize: '0.8rem' }} onClick={() => setMode('narrative')}><Clock size={14} /> Chronological</button>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: '150px', flexShrink: 0, padding: '0.5rem', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Target Element</div>
                    <div style={{ display: 'flex', flex: 1 }}>
                        {scenes.map((s, idx) => (
                            <div key={s.id} title={s.name} style={{ flex: 1, minWidth: '12px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-text-muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
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
                        <div key={entry.id} style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ width: '150px', flexShrink: 0, padding: '0.3rem 0.5rem', fontSize: '0.8rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', borderRight: '1px solid var(--color-border)' }}>
                                {entry.name}
                            </div>
                            <div style={{ display: 'flex', flex: 1 }}>
                                {scenes.map(s => {
                                    const count = entryData[s.id] || 0

                                    let bg = 'transparent'
                                    if (count > 0) {
                                        const intensity = count / maxVal
                                        // Hot map: Orange -> Red
                                        bg = intensity > 0.6 ? '#f03e3e' : intensity > 0.3 ? '#f76707' : intensity > 0.1 ? '#fd7e14' : '#ffa94d'
                                    }

                                    return (
                                        <div key={s.id} title={`${entry.name} in ${s.name} (${count} occurrences)`} style={{ flex: 1, background: bg, minWidth: '12px', borderRight: '1px solid var(--color-border)' }} />
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
