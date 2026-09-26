import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts'
import { FileText, Users, FileLineChart, AlertTriangle } from 'lucide-react'
import BibleHeatmap from './BibleHeatmap'
import RelationshipGraph from './RelationshipGraph'
import TokenHabitChart from './TokenHabitChart'
import DailyHabitHeatmap from './DailyHabitHeatmap'

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

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

export default function ReviewWorkspace() {
    const { activeNovelId } = useWorkspaceStore()
    const [hierarchyCounts, setHierarchyCounts] = useState<{ books: any[], acts: any[], chapters: any[], scenes: any[] }>({ books: [], acts: [], chapters: [], scenes: [] })
    const [charEntriesSize, setCharEntriesSize] = useState(0)
    const [debugLinks, setDebugLinks] = useState<string[]>([])
    const [activeNovelIdState, setActiveNovelIdState] = useState('')
    const [viewLevel, setViewLevel] = useState<'Book' | 'Act' | 'Chapter' | 'Scene'>('Scene')
    const [characterDistribution, setCharacterDistribution] = useState<any[]>([])
    const [sceneCharacterCounts, setSceneCharacterCounts] = useState<any[]>([])
    const [averageChars, setAverageChars] = useState(0)
    const [totalWords, setTotalWords] = useState(0)
    const [averageWordCount, setAverageWordCount] = useState(0)
    const [dialogueDistribution, setDialogueDistribution] = useState<any[]>([])
    const [dialogueTotal, setDialogueTotal] = useState(0)
    const [contradictions, setContradictions] = useState<any[]>([])

    useEffect(() => {
        if (!activeNovelId) return

        const compileStats = async () => {
            const scenes = await db.scenes.where({ novelId: activeNovelId }).toArray()
            const chapters = await db.chapters.where({ novelId: activeNovelId }).toArray()
            const acts = await db.acts.where({ novelId: activeNovelId }).toArray()
            const bookReq = await db.novels.get(activeNovelId)
            const books = bookReq ? [bookReq] : []

            const sceneCache: Record<string, number> = {}
            let total = 0

            const actSortMap: Record<string, number> = {}
            acts.forEach(a => actSortMap[a.id] = a.sortOrder)

            const chapterSortMap: Record<string, number> = {}
            chapters.forEach(c => chapterSortMap[c.id] = c.sortOrder)

            const chapterActMap: Record<string, number> = {}
            chapters.forEach(c => chapterActMap[c.id] = c.actId ? (actSortMap[c.actId] || 0) : 0)

            const sortedScenes = scenes.sort((a, b) => {
                const aAct = chapterActMap[a.chapterId] || 0
                const bAct = chapterActMap[b.chapterId] || 0
                if (aAct !== bAct) return aAct - bAct

                const aChap = chapterSortMap[a.chapterId] || 0
                const bChap = chapterSortMap[b.chapterId] || 0
                if (aChap !== bChap) return aChap - bChap

                return a.sortOrder - b.sortOrder
            })

            // Generate clean labels for UI density
            const chapterLabels: Record<string, string> = {}
            chapters.sort((a, b) => a.sortOrder - b.sortOrder).forEach((c, idx) => chapterLabels[c.id] = `C${idx + 1}`)

            const sceneDataRaw: any[] = []

            const sceneData = sortedScenes.map(s => {
                const results = extractAnalyticsDataFromJson(s.content, { text: [], links: [] })
                const textDump = results.text.join(' ')
                const words = countWords(textDump)
                sceneCache[s.id] = words
                total += words
                const chPrefix = chapterLabels[s.chapterId] || ''
                const shortLabel = `${chPrefix}.S${s.sortOrder + 1}`
                sceneDataRaw.push({ scene: s, text: textDump, links: results.links, shortLabel })
                return { name: s.name, words }
            })

            const chapterData = chapters.sort((a, b) => a.sortOrder - b.sortOrder).map(c => {
                const cScenes = scenes.filter(s => s.chapterId === c.id)
                const words = cScenes.reduce((acc, s) => acc + (sceneCache[s.id] || 0), 0)
                return { name: c.name, words }
            })

            const actData = acts.sort((a, b) => a.sortOrder - b.sortOrder).map(a => {
                const aChapters = chapters.filter(c => c.actId === a.id)
                const aScenes = scenes.filter(s => aChapters.find(ch => ch.id === s.chapterId))
                const words = aScenes.reduce((acc, s) => acc + (sceneCache[s.id] || 0), 0)
                return { name: a.name, words }
            })

            const bookData = books.sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0)).map(b => {
                const bActs = acts.filter(act => act.novelId === b.id)
                const bChapters = chapters.filter(c => bActs.find(act => act.id === c.actId))
                const bScenes = scenes.filter(s => bChapters.find(ch => ch.id === s.chapterId))
                const words = bScenes.reduce((acc, s) => acc + (sceneCache[s.id] || 0), 0)
                return { name: b.title || 'Untitled', words }
            })

            setTotalWords(total)
            setHierarchyCounts({ books: bookData, acts: actData, chapters: chapterData, scenes: sceneData })

            // Character Mentions (Heuristics + InternalLinks mapping directly on the raw text)
            const occurrences = await db.occurrences.where({ novelId: activeNovelId }).toArray()
            const charEntries = await db.bibleEntries.where({ novelId: activeNovelId }).toArray()
            const charEntriesSorted = [...charEntries].sort((a, b) => b.name.length - a.name.length)

            const charCounts: Record<string, number> = {}

            // Native Cast Extrapolation (Bypassing heuristic heuristics fully overriding with explicit tracking)
            sceneDataRaw.forEach(pack => {
                const cast = pack.scene.cast || []
                charEntriesSorted.forEach(ce => {
                    if (ce.type?.toLowerCase() === 'character' && cast.includes(ce.id)) {
                        charCounts[ce.name] = (charCounts[ce.name] || 0) + 1
                    }
                })
            })

            const pieData = Object.keys(charCounts).map(name => ({
                name,
                value: charCounts[name]
            })).sort((a, b) => b.value - a.value).slice(0, 10)

            setCharacterDistribution(pieData)

            const charCountArray = sceneDataRaw.map(pack => {
                const cast = pack.scene.cast || []
                const charCount = charEntriesSorted.filter(ce => ce.type?.toLowerCase() === 'character' && cast.includes(ce.id)).length
                return { name: pack.scene.name, id: pack.scene.id, chars: charCount, shortLabel: pack.shortLabel }
            })
            setSceneCharacterCounts(charCountArray)
            setAverageChars(charCountArray.length > 0 ? Math.round(charCountArray.reduce((acc, c) => acc + c.chars, 0) / charCountArray.length) : 0)
            setAverageWordCount(sceneData.length > 0 ? Math.round(total / sceneData.length) : 0)

            // Dialogue Extraction (Heuristic vs Explicit)
            const dialogueCounts: Record<string, number> = {}
            let dTotal = 0

            sceneDataRaw.forEach((scenePack) => {
                const { scene, text } = scenePack
                const sceneOccurrences = occurrences.filter(o => o.sceneId === scene.id && !o.isDismissed)

                // Regex for standard double quotes AND smart quotes
                const quoteRegex = /["\u201C]([^"\u201D]+)["\u201D]/g
                let match

                const lowerText = text.toLowerCase()

                while ((match = quoteRegex.exec(text)) !== null) {
                    const quoteText = match[1]
                    const quoteWords = countWords(quoteText)
                    const quoteStart = match.index

                    dTotal += quoteWords

                    // Explicit Ownership (Intersection: an occurrence is perfectly inside the quote?)
                    let closestDist = Infinity
                    let closestEntityId: string | null = null

                    // 1. Check legacy manual occurrences
                    sceneOccurrences.forEach(o => {
                        const lowerAlias = o.keywordOrAlias.toLowerCase()
                        const aliasIndex = lowerText.lastIndexOf(lowerAlias, quoteStart)
                        if (aliasIndex !== -1 && aliasIndex < quoteStart) {
                            const dist = quoteStart - aliasIndex
                            if (dist < closestDist) {
                                closestDist = dist
                                closestEntityId = o.entryId
                            }
                        }
                    })

                    // Fallback to closest heuristic string match immediately preceding
                    let speakerName = "Unknown Speaker"
                    if (closestEntityId) {
                        const entry = charEntries.find(e => e.id === closestEntityId)
                        if (entry && entry.type?.toLowerCase() === 'character') speakerName = entry.name
                    } else {
                        const precedingText = text.substring(Math.max(0, quoteStart - 400), quoteStart)
                        let closestDistInner = Infinity
                        let closestMatchName = null

                        for (const ce of charEntriesSorted) {
                            if (ce.type?.toLowerCase() === 'character') {
                                const safeName = ce.name.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')
                                const execRegex = new RegExp(`\\b${safeName}\\b`, 'gi')
                                let m;
                                let lastFoundIdx = -1
                                while ((m = execRegex.exec(precedingText)) !== null) {
                                    lastFoundIdx = m.index
                                }
                                if (lastFoundIdx !== -1) {
                                    const dist = precedingText.length - lastFoundIdx
                                    if (dist < closestDistInner) {
                                        closestDistInner = dist
                                        closestMatchName = ce.name
                                    }
                                }
                            }
                        }

                        if (closestMatchName) speakerName = closestMatchName
                    }

                    dialogueCounts[speakerName] = (dialogueCounts[speakerName] || 0) + quoteWords
                }
            })

            const dialPie = Object.keys(dialogueCounts).map(name => ({
                name,
                value: dialogueCounts[name]
            })).sort((a, b) => b.value - a.value).slice(0, 10)

            setDialogueTotal(dTotal)
            setDialogueDistribution(dialPie)

            // Contradiction Identification Pipeline
            const relationships = await db.relationships.where({ novelId: activeNovelId }).toArray()
            const warnings: any[] = []

            relationships.forEach(rel => {
                if (!rel.validFrom && !rel.validUntil) return // Eternal fact, cannot contradict timeline strictly

                // Find scenes where BOTH source and target appear
                const sourceOccurrences = occurrences.filter(o => o.entryId === rel.sourceId && !o.isDismissed)
                const targetOccurrences = rel.isBidirectional
                    ? occurrences.filter(o => o.entryId === rel.targetId && !o.isDismissed)
                    : sourceOccurrences // Fake if not bidirectional, but really relationship co-presence usually implies both

                // Fast intersection of scene IDs where both exist 
                const coOccurringSceneIds = sourceOccurrences.map(o => o.sceneId).filter(sId => targetOccurrences.some(to => to.sceneId === sId))
                const uniqueCoScenes = Array.from(new Set(coOccurringSceneIds))

                uniqueCoScenes.forEach(sId => {
                    const scene = scenes.find(s => s.id === sId)
                    if (!scene) return

                    const sceneChronology = scene.narrativePosition?.sequence ?? scene.sortOrder
                    const sourceChar = charEntries.find(e => e.id === rel.sourceId)
                    const targetChar = charEntries.find(e => e.id === rel.targetId)

                    if (rel.validFrom && (rel.validFrom.sequence ?? 0) > sceneChronology) {
                        warnings.push({
                            sceneName: scene.name,
                            message: `"${sourceChar?.name}" and "${targetChar?.name}" interact, but their relationship (${rel.type}) doesn't begin until a later sequence.`,
                            type: 'Premature Interaction'
                        })
                    }

                    if (rel.validUntil && (rel.validUntil.sequence ?? Infinity) < sceneChronology) {
                        warnings.push({
                            sceneName: scene.name,
                            message: `"${sourceChar?.name}" and "${targetChar?.name}" interact, but their relationship (${rel.type}) expired previously.`,
                            type: 'Expired Interaction'
                        })
                    }
                })
            })

            // Feature E: Temporal Continuity Checks
            let previousMaxTimelineEnd = -Infinity
            sortedScenes.forEach(s => {
                const sStart = s.timelineStart
                if (typeof sStart === 'number') {
                    if (sStart < previousMaxTimelineEnd && !s.labels?.includes('Flashback')) {
                        warnings.push({
                            sceneName: s.name,
                            message: `Numerical chronology drop. Starts at ${s.timelineLabel || sStart} but a preceding scene in the manuscript structure occurs later. Add a 'Flashback' label to ignore.`,
                            type: 'Temporal Anomaly'
                        })
                    }
                    const sEnd = typeof s.timelineEnd === 'number' ? s.timelineEnd : sStart
                    previousMaxTimelineEnd = Math.max(previousMaxTimelineEnd, sEnd)
                }
            })

            // Filter redundancies
            const uniqueWarnings = Array.from(new Set(warnings.map(w => JSON.stringify(w)))).map(s => JSON.parse(s))
            setContradictions(uniqueWarnings)
        }

        compileStats()
    }, [activeNovelId])

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A288FE', '#FF66B2', '#4BC0C0', '#36A2EB', '#FF6384', '#9966FF']

    if (!activeNovelId) {
        return <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Open a project to review analytics.</div>
    }

    return (
        <div className="workspace-view" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><FileLineChart /> Analytics & Review Dashboard</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Granular insight telemetry tracking narrative shapes and distributions.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--color-accent)' }}>{totalWords.toLocaleString()}</strong>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Manuscript Words</div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

                {/* Scene Distribution */}
                <div className="surface-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FileText size={18} /> Word Count Distribution by Scene</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {['Book', 'Act', 'Chapter', 'Scene'].map(lvl => (
                            <button key={lvl} onClick={() => setViewLevel(lvl as any)} style={{ background: viewLevel === lvl ? 'var(--color-accent)' : 'var(--color-surface)', color: viewLevel === lvl ? '#fff' : 'var(--color-text)', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{lvl}</button>
                        ))}
                    </div>
                    <div style={{ height: '260px' }}>
                        {hierarchyCounts.scenes.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={viewLevel === 'Book' ? hierarchyCounts.books : viewLevel === 'Act' ? hierarchyCounts.acts : viewLevel === 'Chapter' ? hierarchyCounts.chapters : hierarchyCounts.scenes}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={true} opacity={0.5} />
                                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }} />
                                    {viewLevel === 'Scene' && (
                                        <ReferenceLine y={averageWordCount} stroke="var(--color-warning)" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: `Average (${averageWordCount})`, fill: 'var(--color-warning)', fontSize: 12 }} />
                                    )}
                                    <Bar dataKey="words" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div style={{ color: 'var(--color-text-muted)' }}>No scenes found.</div>}
                    </div>
                </div>

                {/* Character Distribution By Scene */}
                <div className="surface-panel" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Users size={18} /> Character Distribution by Scene</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>See how many unique characters appear in each scene to balance your cast.</p>
                    <div style={{ height: '260px' }}>
                        {sceneCharacterCounts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sceneCharacterCounts}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={true} opacity={0.5} />
                                    <XAxis dataKey="id" minTickGap={20} tickFormatter={(val) => {
                                        const p = sceneCharacterCounts.find(c => c.id === val)
                                        return p ? p.shortLabel : val
                                    }} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} labelFormatter={(val) => {
                                        const p = sceneCharacterCounts.find(c => c.id === val)
                                        return p ? p.name : val
                                    }} />
                                    <ReferenceLine y={averageChars} stroke="var(--color-warning)" label={{ position: 'bottom', offset: 15, value: `Average (${averageChars})`, fill: 'var(--color-warning)', fontSize: 11 }} />
                                    <Line type="monotone" dataKey="chars" stroke="#36A2EB" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <div style={{ color: 'var(--color-text-muted)' }}>No scenes found.</div>}
                    </div>
                </div>

                {/* Character Screen Time */}
                <div className="surface-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Users size={18} /> Character Prominence (Top 10)</h3>
                    <div style={{ height: '300px' }}>
                        {characterDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={characterDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {characterDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div style={{ color: 'var(--color-text-muted)' }}>No character occurrences mapped. Assign Bible entries to track dominance.</div>}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>
                        {characterDistribution.map((entry, idx) => (
                            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }}></div>
                                {entry.name} ({entry.value})
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dialogue Share */}
                <div className="surface-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Users size={18} /> Dialogue Share (Top 10)</h3>
                    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>{dialogueTotal.toLocaleString()}</strong>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Spoken Words</div>
                    </div>
                    <div style={{ height: '300px' }}>
                        {dialogueDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dialogueDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dialogueDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div style={{ color: 'var(--color-text-muted)' }}>No dialogue ("...") detected or attributed.</div>}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>
                        {dialogueDistribution.map((entry, idx) => (
                            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[(idx + 3) % COLORS.length] }}></div>
                                {entry.name} ({entry.value.toLocaleString()} words)
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Contradiction Surfacing */}
            <div className="surface-panel" style={{ marginTop: '2rem', border: '1px solid var(--color-warning)', background: 'rgba(255, 160, 0, 0.05)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-warning)' }}><AlertTriangle size={18} /> Continuity Warnings</h3>

                {contradictions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {contradictions.map((warn, idx) => (
                            <div key={idx} style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid var(--color-warning)' }}>
                                <strong style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--color-text)' }}>{warn.sceneName}</strong>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{warn.message} <span style={{ padding: '0.1rem 0.4rem', background: 'rgba(255,160,0,0.1)', color: 'var(--color-warning)', fontSize: '0.7rem', borderRadius: '4px', marginLeft: '0.5rem' }}>{warn.type}</span></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: 'var(--color-text-muted)', padding: '1rem', background: 'var(--color-surface)', borderRadius: '4px' }}>No temporal anomalies detected. Entity occurrences currently align with mapped Narrative Positions and Chronological Bounds.</div>
                )}
            </div>

            {/* Heatmap Grid Array */}
            <BibleHeatmap />

            <div style={{ display: 'block', marginBottom: '2rem' }}>
                <RelationshipGraph />
            </div>

            <TokenHabitChart />
            <DailyHabitHeatmap />
        </div>
    )
}
