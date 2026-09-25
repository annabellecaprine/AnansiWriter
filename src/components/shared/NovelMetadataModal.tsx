import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/database';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import type { Novel } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    novelId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function NovelMetadataModal({ novelId, onClose, onSaved }: Props) {
    const [novel, setNovel] = useState<Novel | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [author, setAuthor] = useState('');
    const [summary, setSummary] = useState('');
    const [language, setLanguage] = useState('');
    const [status, setStatus] = useState('');
    const [targetWordCount, setTargetWordCount] = useState('');
    const [tags, setTags] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!novelId) return;
        const load = async () => {
            const n = await db.novels.get(novelId);
            if (n) {
                setNovel(n);
                setTitle(n.title || '');
                setSubtitle(n.subtitle || '');
                setAuthor(n.author || '');
                setSummary(n.summary || '');
                setLanguage(n.language || 'English');
                setStatus(n.status || '');
                setTargetWordCount(n.targetWordCount ? String(n.targetWordCount) : '');
                setTags((n.tags || []).join(', '));

                if (n.coverAssetId) {
                    const cover = await db.assets.get(n.coverAssetId);
                    if (cover) {
                        setCoverUrl(URL.createObjectURL(cover.blob));
                    }
                }
            }
        };
        load();
    }, [novelId]);

    if (!novelId || !novel) return null;

    const handleSave = async () => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        const parsedTargetWordCount = parseInt(targetWordCount) || undefined;

        await db.novels.update(novelId, {
            title,
            subtitle,
            author,
            summary,
            language,
            status,
            targetWordCount: parsedTargetWordCount,
            tags: tagArray,
            updatedAt: Date.now()
        });
        onSaved();
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        const assetId = uuidv4();
        await db.assets.put({
            id: assetId,
            novelId: novelId,
            name: file.name,
            mimeType: file.type,
            blob: file,
            sizeBytes: file.size,
            createdAt: Date.now()
        });

        // Phase 3 requirements
        await db.assetLinks.put({
            id: uuidv4(),
            novelId: novelId,
            assetId: assetId,
            targetId: novelId,
            targetType: 'Novel',
            role: 'cover'
        });

        // Fast path update
        await db.novels.update(novelId, {
            coverAssetId: assetId
        });

        setCoverUrl(URL.createObjectURL(file));
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: 'var(--color-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Novel Metadata</h2>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '150px' }}>
                        <div style={{ width: '150px', height: '225px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                            {coverUrl ? (
                                <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <ImageIcon size={40} color="var(--color-text-muted)" />
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" style={{ display: 'none' }} />
                        </div>
                        <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}><Upload size={14} /> Upload Cover</button>
                    </div>

                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignContent: 'start' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Title</label>
                            <input className="input" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', fontSize: '1.1rem', fontWeight: 'bold' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Subtitle</label>
                            <input className="input" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={{ width: '100%' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Author / Pen Name</label>
                            <input className="input" value={author} onChange={e => setAuthor(e.target.value)} style={{ width: '100%' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Status</label>
                            <input className="input" value={status} onChange={e => setStatus(e.target.value)} placeholder="e.g. Draft, Edited" style={{ width: '100%' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Target Word Count</label>
                            <input type="number" className="input" value={targetWordCount} onChange={e => setTargetWordCount(e.target.value)} placeholder="e.g. 80000" style={{ width: '100%' }} />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Genres / Tags (comma separated)</label>
                            <input className="input" value={tags} onChange={e => setTags(e.target.value)} style={{ width: '100%' }} />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Summary / Blurb</label>
                            <textarea className="input" value={summary} onChange={e => setSummary(e.target.value)} style={{ width: '100%', minHeight: '120px', resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn" onClick={onClose} style={{ background: 'var(--color-surface)' }}>Cancel</button>
                    <button className="btn" onClick={handleSave} style={{ background: 'var(--color-primary)' }}>Save Metadata</button>
                </div>
            </div>
        </div>
    );
}
