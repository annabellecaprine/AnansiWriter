import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Activity, Clock, ShieldCheck, Edit3, UserPlus, Calendar, PlusCircle, CheckCircle, FileUp, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Snapshot, Project } from '../../db/schema'
import DocxImportModal from '../../components/shared/DocxImportModal'

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

export default function ActiveProjectDashboard() {
    const { activeProjectId } = useWorkspaceStore()
    const navigate = useNavigate()

    const [project, setProject] = useState<Project | null>(null)
    const [wordCount, setWordCount] = useState(0)
    const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null)
    const [recentItems, setRecentItems] = useState<{ id: string, name: string, type: string, updatedAt: number }[]>([])
    const [importModalOpen, setImportModalOpen] = useState(false)

    // Layout State
    const [layout, setLayout] = useState<string[]>(['activity', 'actions', 'todos'])
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

    useEffect(() => {
        const cached = localStorage.getItem('anansi_dashboard_layout')
        if (cached) setLayout(JSON.parse(cached))
    }, [])

    const handleDragStart = (idx: number) => setDraggedIdx(idx)
    const handleDragEnter = (targetIdx: number) => {
        if (draggedIdx === null || draggedIdx === targetIdx) return
        const newLayout = [...layout]
        const temp = newLayout[draggedIdx]
        newLayout[draggedIdx] = newLayout[targetIdx]
        newLayout[targetIdx] = temp
        setLayout(newLayout)
        setDraggedIdx(targetIdx)
        localStorage.setItem('anansi_dashboard_layout', JSON.stringify(newLayout))
    }
    const handleDragEnd = () => setDraggedIdx(null)

    useEffect(() => {
        if (!activeProjectId) return

        const loadDashboard = async () => {
            const p = await db.projects.get(activeProjectId)
            if (p) setProject(p)

            // Calculate Word Count
            const scenes = await db.scenes.where({ projectId: activeProjectId }).toArray()
            let wc = 0
            scenes.forEach(s => {
                const text = extractTextFromJson(s.content)
                wc += countWords(text)
            })
            setWordCount(wc)

            // Get Recent Items (Top 5 modified Scenes/Bible Entries combined)
            const bibleEntries = await db.bibleEntries.where({ projectId: activeProjectId }).toArray()

            const combined = [
                ...scenes.map(s => ({ id: s.id, name: s.name, type: 'Scene', updatedAt: s.updatedAt })),
                ...bibleEntries.map(b => ({ id: b.id, name: b.name, type: `Bible: ${b.type}`, updatedAt: b.updatedAt }))
            ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

            setRecentItems(combined)

            // Get Latest Snapshot
            const snapshots = await db.snapshots.where({ projectId: activeProjectId }).reverse().sortBy('createdAt')
            if (snapshots.length > 0) {
                setLastSnapshot(snapshots[0])
            }
        }

        loadDashboard()
    }, [activeProjectId])

    if (!activeProjectId || !project) return null

    return (
        <div style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--color-text)' }}>{project.name}</h2>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={14} /> {wordCount.toLocaleString()} Total Words</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: lastSnapshot ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        <ShieldCheck size={14} />
                        {lastSnapshot ? `Last Backup: ${new Date(lastSnapshot.createdAt).toLocaleString()} (${lastSnapshot.reason})` : 'No Recent Snapshots'}
                    </span>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '2rem', alignItems: 'start' }}>
                {layout.map((widgetId, idx) => {
                    if (widgetId === 'activity') return (
                        /* Main Activity Feed */
                        <div
                            key="activity"
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragEnter={() => handleDragEnter(idx)}
                            onDragEnd={handleDragEnd}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: draggedIdx === idx ? 0.5 : 1, cursor: 'grab' }}
                        >
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><GripVertical size={16} color="var(--color-primary)" aria-label="Drag Handle - Recent Activity" role="button" tabIndex={0} /> <Clock size={18} /> Recent Activity</h3>
                            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                                {recentItems.length === 0 ? (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No recent activity.</div>
                                ) : (
                                    recentItems.map((item, itemIdx) => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: itemIdx !== recentItems.length - 1 ? '1px solid var(--color-border)' : 'none', background: 'var(--color-surface)' }} onClick={() => {
                                            if (item.type === 'Scene') navigate('/writing')
                                            else navigate('/bible')
                                        }} className="hover-bg">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                <strong style={{ color: 'var(--color-text)' }}>{item.name}</strong>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.type}</span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{new Date(item.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )

                    if (widgetId === 'actions') return (
                        /* Quick Actions */
                        <div
                            key="actions"
                            className="spike-section"
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragEnter={() => handleDragEnter(idx)}
                            onDragEnd={handleDragEnd}
                            style={{ opacity: draggedIdx === idx ? 0.5 : 1, cursor: 'grab' }}
                        >
                            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><GripVertical size={16} color="var(--color-primary)" aria-label="Drag Handle - Quick Actions" role="button" tabIndex={0} /> <PlusCircle size={18} /> Quick Actions</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button className="btn" onClick={() => navigate('/writing')} style={{ width: '100%', justifyContent: 'flex-start' }}><Edit3 size={16} /> Continue Writing</button>
                                <button className="btn" onClick={() => navigate('/bible')} style={{ width: '100%', justifyContent: 'flex-start' }}><UserPlus size={16} /> Add Character</button>
                                <button className="btn" onClick={() => navigate('/planning')} style={{ width: '100%', justifyContent: 'flex-start' }}><Calendar size={16} /> View Outline</button>
                                <button className="btn" onClick={() => setImportModalOpen(true)} style={{ width: '100%', justifyContent: 'flex-start' }}><FileUp size={16} /> Sandbox DOCX Import</button>
                            </div>
                        </div>
                    )

                    if (widgetId === 'todos') return (
                        /* Project TODOs */
                        <div
                            key="todos"
                            className="spike-section"
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragEnter={() => handleDragEnter(idx)}
                            onDragEnd={handleDragEnd}
                            style={{ opacity: draggedIdx === idx ? 0.5 : 1, cursor: 'grab' }}
                        >
                            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><GripVertical size={16} color="var(--color-primary)" aria-label="Drag Handle - Project TODOs" role="button" tabIndex={0} /> <CheckCircle size={18} /> Project TODOs</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                (TODO Tracker currently synchronizing with Phase 4 Planning state. Keep building!)
                            </p>
                        </div>
                    )

                    return null
                })}
            </div>
            {importModalOpen && <DocxImportModal projectId={activeProjectId} onClose={() => setImportModalOpen(false)} />}
        </div>
    )
}
