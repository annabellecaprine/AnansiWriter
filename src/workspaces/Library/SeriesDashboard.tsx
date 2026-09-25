import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../../db/database'
import type { Series, Novel } from '../../db/schema'
import { LibraryService } from '../../services/LibraryService'
import { ChevronLeft, Plus, BookOpen, Trash2, Edit2, ArrowRightLeft, GripVertical, Settings, Image as ImageIcon } from 'lucide-react'
import { promptInput } from '../../store/dialogStore'
import NovelTransferModal from '../../components/shared/NovelTransferModal'
import NovelMetadataModal from '../../components/shared/NovelMetadataModal'

import { DndContext, closestCenter, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../../components/shared/SortableItem'

export default function SeriesDashboard() {
    const { seriesId } = useParams()
    const navigate = useNavigate()
    const [series, setSeries] = useState<Series | null>(null)
    const [novels, setNovels] = useState<Novel[]>([])

    const [transferNovelId, setTransferNovelId] = useState<string | null>(null)
    const [metaNovelId, setMetaNovelId] = useState<string | null>(null)

    const [covers, setCovers] = useState<Record<string, string>>({})
    const [novelMeta, setNovelMeta] = useState<Record<string, { wordCount: number, chapterCount: number, sceneCount: number }>>({})

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Requires 5 pixels of movement before firing drag, allowing clicks natively.
            },
        }),
        useSensor(KeyboardSensor)
    )

    useEffect(() => {
        loadData()
    }, [seriesId])

    const loadData = async () => {
        if (!seriesId) return
        const s = await db.series.get(seriesId)
        if (s) setSeries(s)
        const n = await db.novels.where({ seriesId }).sortBy('seriesIndex')

        const cUrls: Record<string, string> = {}
        const nMeta: Record<string, { wordCount: number, chapterCount: number, sceneCount: number }> = {}

        for (const novel of n) {
            if (novel.coverAssetId) {
                const cover = await db.assets.get(novel.coverAssetId)
                if (cover) cUrls[novel.id] = URL.createObjectURL(cover.blob)
            }
            const scenes = await db.scenes.where({ novelId: novel.id }).toArray()
            const chapters = await db.chapters.where({ novelId: novel.id }).toArray()
            nMeta[novel.id] = {
                wordCount: scenes.reduce((acc, s) => acc + (s.wordCount || 0), 0),
                chapterCount: chapters.length,
                sceneCount: scenes.length
            }
        }

        setCovers(cUrls)
        setNovelMeta(nMeta)
        setNovels(n)
    }

    const handleCreateNovel = async () => {
        if (!seriesId) return
        const name = await promptInput({ title: 'New Novel in Series', placeholder: 'Novel Title' })
        if (name) {
            const id = await LibraryService.createNovelInSeries(seriesId, name)
            navigate(`/novel/${id}`)
        }
    }

    const handleDeleteSeries = async () => {
        if (!seriesId || !series) return
        if (novels.length > 0) {
            alert(`You must empty or delete all novels within this series first! (${novels.length} novels remaining)`)
            return
        }
        if (confirm(`Are you absolutely sure you want to delete ${series.title}?`)) {
            await db.series.delete(seriesId)
            navigate('/library')
        }
    }

    const handleRenameSeries = async () => {
        if (!series || !seriesId) return
        const newTitle = await promptInput({ title: 'Rename Series', defaultValue: series.title })
        if (newTitle && newTitle !== series.title) {
            await LibraryService.renameSeries(seriesId, newTitle)
            await loadData()
        }
    }

    // handleRenameNovel merged into direct Semantic Metadata dialogue invocation

    const handleDeleteNovel = async (e: React.MouseEvent, n: Novel) => {
        e.stopPropagation()
        if (confirm(`Are you absolutely sure you want to permanently delete novel: ${n.title}? This action cannot be undone.`)) {
            await LibraryService.deleteNovel(n.id)
            await loadData()
        }
    }

    const triggerTransfer = (e: React.MouseEvent, n: Novel) => {
        e.stopPropagation()
        setTransferNovelId(n.id)
    }

    const handleTransferSubmit = async (newSeriesId: string | undefined) => {
        if (transferNovelId) {
            await LibraryService.transferNovel(transferNovelId, newSeriesId)
            await loadData() // the novel might disappear from this list if moved
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setNovels((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)
                const reordered = arrayMove(items, oldIndex, newIndex)

                // Commit to DB
                requestAnimationFrame(() => {
                    const commit = reordered.map((n, i) => ({ id: n.id, seriesIndex: i + 1 }))
                    LibraryService.reorderSeriesNovels(commit).then(() => loadData())
                })

                return reordered
            })
        }
    }

    if (!series) return <div style={{ padding: '2rem' }}>Loading Series...</div>

    return (
        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <button className="btn" onClick={() => navigate('/library')} style={{ marginBottom: '2rem' }}>
                <ChevronLeft size={16} /> Back to Library
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{series.title}</h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>{series.description || 'No description provided.'}</p>
                    </div>
                    <button className="icon-btn" onClick={handleRenameSeries} title="Rename Series"><Edit2 size={16} /></button>
                </div>
                <button className="btn" onClick={handleDeleteSeries} style={{ color: 'var(--color-warning)' }}><Trash2 size={16} /> Delete Series</button>
            </div>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <BookOpen size={20} /> Novels in Series
                    </h2>
                    <button className="btn" onClick={handleCreateNovel}><Plus size={16} /> New Novel in Series</button>
                </div>

                {novels.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No novels in this series yet.</p> : null}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={novels.map(n => n.id)} strategy={rectSortingStrategy}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {novels.map((n, idx) => (
                                <SortableItem key={n.id} id={n.id} isDraggingClass="novel-dragging">
                                    <div
                                        onClick={() => navigate(`/novel/${n.id}`)}
                                        style={{
                                            cursor: 'pointer',
                                            background: 'var(--color-surface)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: '1px solid var(--color-border)',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ height: '140px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
                                            {covers[n.id] ? <img src={covers[n.id]} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BookOpen size={32} color="var(--color-text-muted)" opacity={0.3} />}

                                            <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'var(--color-primary)', color: '#000', padding: '0.1rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                BOOK {idx + 1}
                                            </div>

                                            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                                <button className="icon-btn drag-handle" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'grab' }} onClick={(e) => e.stopPropagation()}><GripVertical size={14} color="#FFF" /></button>
                                                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setMetaNovelId(n.id); }} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Edit Metadata"><Settings size={14} color="#FFF" /></button>
                                                <button className="icon-btn" onClick={(e) => triggerTransfer(e, n)} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Move Series"><ArrowRightLeft size={14} color="#FFF" /></button>
                                                <button className="icon-btn" onClick={(e) => handleDeleteNovel(e, n)} style={{ background: 'rgba(50,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Trash Novel"><Trash2 size={14} color="var(--color-warning)" /></button>
                                            </div>
                                        </div>

                                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1rem' }}>{n.title}</h3>
                                                {n.subtitle && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.1rem' }}>{n.subtitle}</div>}
                                                {n.author && <div style={{ fontSize: '0.8rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>By {n.author}</div>}
                                            </div>

                                            {n.tags && n.tags.length > 0 && <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                {n.tags.map((t, i) => <span key={i} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem' }}>{t}</span>)}
                                            </div>}

                                            {n.summary && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {n.summary}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
                                                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                                                    <span><strong>{(novelMeta[n.id]?.wordCount || 0).toLocaleString()}</strong> {n.targetWordCount ? `/ ${(n.targetWordCount).toLocaleString()} ` : ''}w</span>
                                                    <span><strong>{novelMeta[n.id]?.chapterCount || 0}</strong> Ch</span>
                                                    <span><strong>{novelMeta[n.id]?.sceneCount || 0}</strong> Sc</span>
                                                </div>
                                                {n.targetWordCount && n.targetWordCount > 0 ? (
                                                    <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.min(100, Math.max(0, ((novelMeta[n.id]?.wordCount || 0) / n.targetWordCount) * 100))}%`, height: '100%', background: 'var(--color-primary)' }} />
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                <span>{n.status || 'Draft'}</span>
                                                <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </section>

            <NovelTransferModal
                isOpen={!!transferNovelId}
                onClose={() => setTransferNovelId(null)}
                onTransfer={handleTransferSubmit}
                currentSeriesId={seriesId}
            />

            {metaNovelId && <NovelMetadataModal novelId={metaNovelId} onClose={() => setMetaNovelId(null)} onSaved={() => { setMetaNovelId(null); loadData(); }} />}
        </div>
    )
}
