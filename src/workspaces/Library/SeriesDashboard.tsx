import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../../db/database'
import type { Series, Novel } from '../../db/schema'
import { LibraryService } from '../../services/LibraryService'
import { ChevronLeft, Plus, BookOpen, Trash2, Edit2, ArrowRightLeft, GripVertical, Settings, Image as ImageIcon } from 'lucide-react'
import { promptInput, confirmAction, confirmAlert } from '../../store/dialogStore'
import NovelTransferModal from '../../components/shared/NovelTransferModal'
import NovelMetadataModal from '../../components/shared/NovelMetadataModal'
import { NovelCard } from '../../components/shared/NovelCard'
import { useWorkspaceStore } from '../../store/workspaceStore'

import { DndContext, closestCenter, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../../components/shared/SortableItem'

export default function SeriesDashboard() {
    const { seriesId } = useParams()
    const navigate = useNavigate()
    const { activeNovelId } = useWorkspaceStore()
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
            await confirmAlert({
                title: 'Cannot Delete Series',
                message: `You must empty or delete all novels within this series first! (${novels.length} novels remaining)`
            })
            return
        }

        const confirmed = await confirmAction({
            title: 'Delete Series',
            message: `Are you absolutely sure you want to delete ${series.title}?`,
            isDestructive: true
        })

        if (confirmed) {
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
        const confirmed = await confirmAction({
            title: 'Delete Novel',
            message: `Are you absolutely sure you want to permanently delete novel: ${n.title}? This action cannot be undone.`,
            isDestructive: true
        })
        if (confirmed) {
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {novels.map((n, idx) => (
                                <SortableItem key={n.id} id={n.id} isDraggingClass="novel-dragging">
                                    <NovelCard
                                        novel={n}
                                        coverUrl={covers[n.id]}
                                        meta={novelMeta[n.id]}
                                        bookNumber={idx + 1}
                                        isActive={n.id === activeNovelId}
                                        hasDragHandle={true}
                                        onClick={() => navigate(`/novel/${n.id}`)}
                                        onEditMetadata={(e: React.MouseEvent) => { e.stopPropagation(); setMetaNovelId(n.id); }}
                                        onMoveSeries={(e: React.MouseEvent) => triggerTransfer(e, n)}
                                        onTrash={(e: React.MouseEvent) => handleDeleteNovel(e, n)}
                                    />
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
