import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/database';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import type { Series } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    seriesId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function SeriesMetadataModal({ seriesId, onClose, onSaved }: Props) {
    const [series, setSeries] = useState<Series | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [tags, setTags] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!seriesId) return;
        const load = async () => {
            const s = await db.series.get(seriesId);
            if (s) {
                setSeries(s);
                setTitle(s.title || '');
                setDescription(s.description || '');
                setStatus(s.status || '');
                setTags((s.tags || []).join(', '));

                if (s.coverAssetId) {
                    const cover = await db.assets.get(s.coverAssetId);
                    if (cover) {
                        setCoverUrl(URL.createObjectURL(cover.blob));
                    }
                }
            }
        };
        load();
    }, [seriesId]);

    if (!seriesId || !series) return null;

    const handleSave = async () => {
        const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        await db.series.update(seriesId, {
            title,
            description,
            status,
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
            seriesId: seriesId,
            name: file.name,
            mimeType: file.type,
            blob: file,
            sizeBytes: file.size,
            createdAt: Date.now()
        });

        // Fulfilling Phase 3 rigid requirement: use AssetLink 
        await db.assetLinks.put({
            id: uuidv4(),
            seriesId: seriesId,
            assetId: assetId,
            targetId: seriesId,
            targetType: 'Series',
            role: 'cover'
        });

        // Fast path for immediate rendering
        await db.series.update(seriesId, {
            coverAssetId: assetId
        });

        setCoverUrl(URL.createObjectURL(file));
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: 'var(--color-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Series Metadata</h2>
                    <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
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

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Title</label>
                            <input className="input" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Status</label>
                            <input className="input" placeholder="e.g. Publishing, Outlining, Finished" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Tags / Genres (comma separated)</label>
                            <input className="input" value={tags} onChange={e => setTags(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Description</label>
                            <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn" onClick={onClose} style={{ background: 'var(--color-surface)' }}>Cancel</button>
                    <button className="btn" onClick={handleSave} style={{ background: 'var(--color-accent)' }}>Save Metadata</button>
                </div>
            </div>
        </div>
    );
}
