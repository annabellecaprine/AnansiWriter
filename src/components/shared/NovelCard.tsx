import React from 'react'
import type { Novel } from '../../db/schema'
import { BookOpen, Settings, ArrowRightLeft, Trash2, GripVertical } from 'lucide-react'

export interface NovelCardProps {
    novel: Novel;
    coverUrl?: string;
    meta?: { wordCount: number, chapterCount: number, sceneCount: number };
    bookNumber?: number;
    hasDragHandle?: boolean;
    onClick: () => void;
    onEditMetadata: (e: React.MouseEvent, novel: Novel) => void;
    onMoveSeries: (e: React.MouseEvent, novel: Novel) => void;
    onTrash: (e: React.MouseEvent, novel: Novel) => void;
    isActive?: boolean;
}

export const NovelCard: React.FC<NovelCardProps> = ({
    novel,
    coverUrl,
    meta,
    bookNumber,
    hasDragHandle,
    onClick,
    onEditMetadata,
    onMoveSeries,
    onTrash,
    isActive
}) => {
    return (
        <div
            onClick={onClick}
            style={{
                cursor: 'pointer',
                background: isActive ? 'rgba(203, 166, 247, 0.05)' : 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                boxShadow: isActive ? '0 0 15px rgba(203, 166, 247, 0.2)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ height: '140px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
                {coverUrl ? <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BookOpen size={32} color="var(--color-text-muted)" opacity={0.3} />}

                {bookNumber !== undefined && (
                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'var(--color-accent)', color: '#000', padding: '0.1rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        BOOK {bookNumber}
                    </div>
                )}

                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                    {hasDragHandle && (
                        <button className="icon-btn drag-handle" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'grab' }} onClick={(e) => e.stopPropagation()}><GripVertical size={14} color="#FFF" /></button>
                    )}
                    <button className="icon-btn" onClick={(e) => onEditMetadata(e, novel)} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Edit Metadata"><Settings size={14} color="#FFF" /></button>
                    <button className="icon-btn" onClick={(e) => onMoveSeries(e, novel)} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Move Series"><ArrowRightLeft size={14} color="#FFF" /></button>
                    <button className="icon-btn" onClick={(e) => onTrash(e, novel)} style={{ background: 'rgba(50,0,0,0.6)', borderRadius: '50%', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} title="Trash Novel"><Trash2 size={14} color="var(--color-warning)" /></button>
                </div>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{novel.title}</h3>
                    {novel.subtitle && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.1rem' }}>{novel.subtitle}</div>}
                    {novel.author && <div style={{ fontSize: '0.8rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>By {novel.author}</div>}
                </div>

                {novel.tags && novel.tags.length > 0 && <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {novel.tags.map((t, i) => <span key={i} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem' }}>{t}</span>)}
                </div>}

                {novel.summary && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {novel.summary}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                        <span><strong>{(meta?.wordCount || 0).toLocaleString()}</strong> {novel.targetWordCount ? `/ ${(novel.targetWordCount).toLocaleString()} ` : ''}w</span>
                        <span><strong>{meta?.chapterCount || 0}</strong> Ch</span>
                        <span><strong>{meta?.sceneCount || 0}</strong> Sc</span>
                    </div>
                    {novel.targetWordCount && novel.targetWordCount > 0 ? (
                        <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, ((meta?.wordCount || 0) / novel.targetWordCount) * 100))}%`, height: '100%', background: 'var(--color-accent)' }} />
                        </div>
                    ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    <span>{novel.status || 'Draft'}</span>
                    <span>{new Date(novel.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    )
}
