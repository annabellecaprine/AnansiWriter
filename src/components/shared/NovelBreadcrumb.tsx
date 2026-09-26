import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { db } from '../../db/database'
import { ChevronRight } from 'lucide-react'

export default function NovelBreadcrumb() {
    const { activeSeriesId, activeNovelId, activeActId, activeChapterId } = useWorkspaceStore()

    const [seriesTitle, setSeriesTitle] = useState<string | null>(null)
    const [novelTitle, setNovelTitle] = useState<string | null>(null)
    const [actName, setActName] = useState<string | null>(null)
    const [chapterName, setChapterName] = useState<string | null>(null)

    useEffect(() => {
        if (activeSeriesId) db.series.get(activeSeriesId).then(s => setSeriesTitle(s?.title ?? null))
        else setSeriesTitle(null)
    }, [activeSeriesId])

    useEffect(() => {
        if (activeNovelId) db.novels.get(activeNovelId).then(n => setNovelTitle(n?.title ?? null))
        else setNovelTitle(null)
    }, [activeNovelId])

    useEffect(() => {
        if (activeActId) db.acts.get(activeActId).then(a => setActName(a?.name ?? null))
        else setActName(null)
    }, [activeActId])

    useEffect(() => {
        if (activeChapterId) db.chapters.get(activeChapterId).then(c => setChapterName(c?.name ?? null))
        else setChapterName(null)
    }, [activeChapterId])

    if (!novelTitle) return null

    const sep = <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />

    return (
        <div style={{
            padding: '0.3rem 1.5rem',
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.1rem',
        }}>
            {/* Line 1: Series › Novel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden' }}>
                {seriesTitle && (
                    <>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            {seriesTitle}
                        </span>
                        {sep}
                    </>
                )}
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {novelTitle}
                </span>
            </div>

            {/* Line 2: Act › Chapter (only if present) */}
            {(actName || chapterName) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden' }}>
                    {actName && (
                        <>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                {actName}
                            </span>
                            {chapterName && sep}
                        </>
                    )}
                    {chapterName && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                            {chapterName}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
