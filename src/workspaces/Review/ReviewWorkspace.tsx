import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FileText, Users, FileLineChart } from 'lucide-react'
import BibleHeatmap from './BibleHeatmap'
import RelationshipGraph from './RelationshipGraph'
import NarrativeTimeline from './NarrativeTimeline'

// Dummy extract logic for now
function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

export default function ReviewWorkspace() {
    const { activeProjectId } = useWorkspaceStore()
    const [hierarchyCounts, setHierarchyCounts] = useState<{ books: any[], acts: any[], chapters: any[], scenes: any[] }>({ books: [], acts: [], chapters: [], scenes: [] })
    const [viewLevel, setViewLevel] = useState<'Book' | 'Act' | 'Chapter' | 'Scene'>('Scene')
    const [characterDistribution, setCharacterDistribution] = useState<any[]>([])
    const [totalWords, setTotalWords] = useState(0)

    useEffect(() => {
        if (!activeProjectId) return

        const compileStats = async () => {
            const scenes = await db.scenes.where({ projectId: activeProjectId }).toArray()
            const chapters = await db.chapters.where({ projectId: activeProjectId }).toArray()
            const acts = await db.acts.where({ projectId: activeProjectId }).toArray()
            const books = await db.books.where({ projectId: activeProjectId }).toArray()

            const sceneCache: Record<string, number> = {}
            let total = 0

            const sceneData = scenes.sort((a, b) => a.sortOrder - b.sortOrder).map(s => {
                const words = countWords(extractTextFromJson(s.content))
                sceneCache[s.id] = words
                total += words
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

            const bookData = books.sort((a, b) => a.sortOrder - b.sortOrder).map(b => {
                const bActs = acts.filter(act => act.bookId === b.id)
                const bChapters = chapters.filter(c => bActs.find(act => act.id === c.actId))
                const bScenes = scenes.filter(s => bChapters.find(ch => ch.id === s.chapterId))
                const words = bScenes.reduce((acc, s) => acc + (sceneCache[s.id] || 0), 0)
                return { name: b.name, words }
            })

            setTotalWords(total)
            setHierarchyCounts({ books: bookData, acts: actData, chapters: chapterData, scenes: sceneData })

            // Character Mentions (Naively mapping occurrences)
            const occurrences = await db.occurrences.where({ projectId: activeProjectId }).toArray()
            const charEntries = await db.bibleEntries.where({ projectId: activeProjectId }).toArray()

            const charCounts: Record<string, number> = {}
            occurrences.forEach(o => {
                if (!o.isConfirmed && !o.isDismissed) return // Only count confirmed/auto
                if (o.isDismissed) return
                const entry = charEntries.find(e => e.id === o.entryId)
                if (entry && entry.type === 'Character') {
                    charCounts[entry.name] = (charCounts[entry.name] || 0) + 1
                }
            })

            const pieData = Object.keys(charCounts).map(name => ({
                name,
                value: charCounts[name]
            })).sort((a, b) => b.value - a.value).slice(0, 10) // Top 10 characters

            setCharacterDistribution(pieData)
        }

        compileStats()
    }, [activeProjectId])

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A288FE', '#FF66B2', '#4BC0C0', '#36A2EB', '#FF6384', '#9966FF']

    if (!activeProjectId) {
        return <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Open a project to review analytics.</div>
    }

    return (
        <div className="workspace-view" style={{ padding: '2rem', height: '100vh', overflowY: 'auto' }}>
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
                <div className="spike-section">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FileText size={18} /> Word Count Distribution by Scene</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {['Book', 'Act', 'Chapter', 'Scene'].map(lvl => (
                            <button key={lvl} onClick={() => setViewLevel(lvl as any)} style={{ background: viewLevel === lvl ? 'var(--color-primary)' : 'var(--color-surface)', color: viewLevel === lvl ? '#fff' : 'var(--color-text)', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{lvl}</button>
                        ))}
                    </div>
                    <div style={{ height: '260px' }}>
                        {hierarchyCounts.scenes.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={viewLevel === 'Book' ? hierarchyCounts.books : viewLevel === 'Act' ? hierarchyCounts.acts : viewLevel === 'Chapter' ? hierarchyCounts.chapters : hierarchyCounts.scenes}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }} />
                                    <Bar dataKey="words" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div style={{ color: 'var(--color-text-muted)' }}>No scenes found.</div>}
                    </div>
                </div>

                {/* Character Screen Time */}
                <div className="spike-section">
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

            </div>

            {/* Heatmap Grid Array */}
            <BibleHeatmap />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <RelationshipGraph />
                <NarrativeTimeline />
            </div>
        </div>
    )
}
