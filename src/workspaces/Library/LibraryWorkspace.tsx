import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import type { Series, Novel } from '../../db/schema'
import { LibraryService } from '../../services/LibraryService'
import { Plus, BookOpen, Layers, Settings, ArrowRightLeft, Trash2, Image as ImageIcon } from 'lucide-react'
import { promptInput, confirmAction } from '../../store/dialogStore'
import NovelTransferModal from '../../components/shared/NovelTransferModal'
import SeriesMetadataModal from '../../components/shared/SeriesMetadataModal'
import NovelMetadataModal from '../../components/shared/NovelMetadataModal'
import { NovelCard } from '../../components/shared/NovelCard'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function LibraryWorkspace({ onOpenSeries, onOpenNovel }: {
    onOpenSeries: (id: string) => void,
    onOpenNovel: (id: string) => void
}) {
    const [seriesList, setSeriesList] = useState<Series[]>([])
    const [standaloneNovels, setStandaloneNovels] = useState<Novel[]>([])

    const [transferNovelId, setTransferNovelId] = useState<string | null>(null)
    const [metaSeriesId, setMetaSeriesId] = useState<string | null>(null)
    const [metaNovelId, setMetaNovelId] = useState<string | null>(null)

    const [covers, setCovers] = useState<Record<string, string>>({})
    const [seriesMeta, setSeriesMeta] = useState<Record<string, { novelCount: number, titles: string[] }>>({})
    const [novelMeta, setNovelMeta] = useState<Record<string, { wordCount: number, chapterCount: number, sceneCount: number }>>({})

    const { activeNovelId } = useWorkspaceStore()
    const [activeNovelSeriesId, setActiveNovelSeriesId] = useState<string | null>(null)

    useEffect(() => {
        loadLibrary()
    }, [])

    useEffect(() => {
        if (activeNovelId) {
            db.novels.get(activeNovelId).then(n => setActiveNovelSeriesId(n?.seriesId || null))
        } else {
            setActiveNovelSeriesId(null)
        }
    }, [activeNovelId])

    const loadLibrary = async () => {
        const allSeries = await db.series.toArray()
        const allNovels = await db.novels.toArray()

        setSeriesList(allSeries.sort((a, b) => b.updatedAt - a.updatedAt))
        setStandaloneNovels(allNovels.filter(n => !n.seriesId).sort((a, b) => b.updatedAt - a.updatedAt))

        // Aggregate external metrics 
        const coverUrls: Record<string, string> = {}
        const sMeta: Record<string, { novelCount: number, titles: string[] }> = {}
        const nMeta: Record<string, { wordCount: number, chapterCount: number, sceneCount: number }> = {}

        for (const item of [...allSeries, ...allNovels]) {
            if (item.coverAssetId) {
                const cover = await db.assets.get(item.coverAssetId)
                if (cover) coverUrls[item.id] = URL.createObjectURL(cover.blob)
            }
        }

        for (const s of allSeries) {
            const children = allNovels.filter(n => n.seriesId === s.id).sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0))
            sMeta[s.id] = {
                novelCount: children.length,
                titles: children.map(c => c.title)
            }
        }

        for (const n of allNovels) {
            const scenes = await db.scenes.where({ novelId: n.id }).toArray()
            const chapters = await db.chapters.where({ novelId: n.id }).toArray()
            nMeta[n.id] = {
                wordCount: scenes.reduce((acc, scene) => acc + (scene.wordCount || 0), 0),
                chapterCount: chapters.length,
                sceneCount: scenes.length
            }
        }

        setCovers(coverUrls)
        setSeriesMeta(sMeta)
        setNovelMeta(nMeta)
    }

    const handleCreateSeries = async () => {
        const name = await promptInput({ title: 'New Series', placeholder: 'Series Title' })
        if (name) {
            const id = await LibraryService.createSeries(name)
            await loadLibrary()
            onOpenSeries(id)
        }
    }

    const handleCreateStandaloneNovel = async () => {
        const name = await promptInput({ title: 'New Standalone Novel', placeholder: 'Novel Title' })
        if (name) {
            const id = await LibraryService.createStandaloneNovel(name)
            await loadLibrary()
            onOpenNovel(id)
        }
    }

    // handleRename... logic stripped natively in favor of full Metadata dialogs

    const handleDeleteNovel = async (e: React.MouseEvent, n: Novel) => {
        e.stopPropagation()
        const confirmed = await confirmAction({
            title: 'Delete Novel',
            message: `Are you sure you want to permanently delete "${n.title}"? This action cannot be undone.`,
            isDestructive: true
        })
        if (confirmed) {
            await LibraryService.deleteNovel(n.id)
            await loadLibrary()
        }
    }

    const triggerTransfer = (e: React.MouseEvent, n: Novel) => {
        e.stopPropagation()
        setTransferNovelId(n.id)
    }

    const handleTransferSubmit = async (seriesId: string | undefined) => {
        if (transferNovelId) {
            await LibraryService.transferNovel(transferNovelId, seriesId)
            await loadLibrary()
        }
    }

    return (
        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>My Library</h1>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button className="btn" onClick={handleCreateSeries}><Plus size={16} /> New Series</button>
                <button className="btn" onClick={handleCreateStandaloneNovel}><Plus size={16} /> New Standalone Novel</button>
            </div>

            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <Layers size={20} /> Series
                </h2>
                {seriesList.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No series created yet.</p> : null}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {seriesList.map(s => {
                        const isActive = s.id === activeNovelSeriesId
                        return (
                            <div key={s.id} onClick={() => onOpenSeries(s.id)} style={{ cursor: 'pointer', background: isActive ? 'rgba(203, 166, 247, 0.05)' : 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', boxShadow: isActive ? '0 0 15px rgba(203, 166, 247, 0.2)' : 'none', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ height: '140px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
                                    {covers[s.id] ? <img src={covers[s.id]} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={32} color="var(--color-text-muted)" opacity={0.3} />}
                                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setMetaSeriesId(s.id); }} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Edit Metadata"><Settings size={14} color="#FFF" /></button>
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{s.title}</h3>
                                        {s.description && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: '0.25rem' }}>
                                                {s.description}
                                            </div>
                                        )}
                                    </div>

                                    {s.tags && s.tags.length > 0 && <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                        {s.tags.map((t, i) => <span key={i} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem' }}>{t}</span>)}
                                    </div>}

                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <span style={{ marginBottom: '0.25rem' }}><strong>{seriesMeta[s.id]?.novelCount || 0} Novels</strong></span>
                                        {seriesMeta[s.id]?.titles && seriesMeta[s.id].titles.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                {seriesMeta[s.id].titles.map((titleStr, idx) => (
                                                    <span key={idx} style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>• {titleStr}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Empty Series</span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 'auto' }}>
                                        <span>{s.status || 'Active'}</span>
                                        <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <BookOpen size={20} /> Standalone Novels
                </h2>
                {standaloneNovels.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No standalone novels.</p> : null}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {standaloneNovels.map(n => (
                        <NovelCard
                            key={n.id}
                            novel={n}
                            coverUrl={covers[n.id]}
                            meta={novelMeta[n.id]}
                            onClick={() => onOpenNovel(n.id)}
                            isActive={n.id === activeNovelId}
                            onEditMetadata={(e: React.MouseEvent) => { e.stopPropagation(); setMetaNovelId(n.id); }}
                            onMoveSeries={(e: React.MouseEvent) => triggerTransfer(e, n)}
                            onTrash={(e: React.MouseEvent) => handleDeleteNovel(e, n)}
                        />
                    ))}
                </div>
            </section>

            <NovelTransferModal
                isOpen={!!transferNovelId}
                onClose={() => setTransferNovelId(null)}
                onTransfer={handleTransferSubmit}
                currentSeriesId={undefined}
            />

            {metaSeriesId && <SeriesMetadataModal seriesId={metaSeriesId} onClose={() => setMetaSeriesId(null)} onSaved={() => { setMetaSeriesId(null); loadLibrary(); }} />}
            {metaNovelId && <NovelMetadataModal novelId={metaNovelId} onClose={() => setMetaNovelId(null)} onSaved={() => { setMetaNovelId(null); loadLibrary(); }} />}

        </div>
    )
}
