import React, { useState, useEffect } from 'react';
import { Download, FileText, FileBadge, BookTemplate, AlertTriangle, FileArchive } from 'lucide-react';
import { db } from '../../../db/database';
import { ExportService } from '../../../services/export/ExportService';
import { MarkdownExporter } from '../../../services/export/MarkdownExporter';
import { DocxExporter } from '../../../services/export/DocxExporter';
import { EpubExporter } from '../../../services/export/EpubExporter';
import type { Novel } from '../../../db/schema';

export function ExportTab() {
    const [novels, setNovels] = useState<Novel[]>([]);
    const [selectedNovelId, setSelectedNovelId] = useState<string>('');
    const [exportFormat, setExportFormat] = useState<'markdown' | 'docx' | 'epub'>('docx');
    const [isExporting, setIsExporting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        loadNovels();
    }, []);

    const loadNovels = async () => {
        const allNovels = await db.novels.toArray();
        setNovels(allNovels.sort((a, b) => b.updatedAt - a.updatedAt));
        if (allNovels.length > 0) {
            setSelectedNovelId(allNovels[0].id);
        }
    };

    const handleExport = async () => {
        if (!selectedNovelId) return;
        setIsExporting(true);
        setErrorMsg('');

        try {
            const pkg = await ExportService.fetchNovelPackage(selectedNovelId);
            let blob: Blob | null = null;
            let ext = '';

            if (exportFormat === 'markdown') {
                const mdString = MarkdownExporter.generateMarkdown(pkg);
                blob = new Blob([mdString], { type: 'text/markdown' });
                ext = '.md';
            } else if (exportFormat === 'docx') {
                blob = await DocxExporter.generateBlob(pkg);
                ext = '.docx';
            } else if (exportFormat === 'epub') {
                blob = await EpubExporter.generateEpub(pkg);
                ext = '.epub';
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${pkg.novel.title.replace(/[^z0-9]/gi, '_').toLowerCase()}${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

        } catch (err: any) {
            console.error('Export Error:', err);
            setErrorMsg(err.message || 'An error occurred during export.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)' }}>
                    <Download size={20} /> Advanced Novel Exporter
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Compile your entire manuscript, structurally mapped and cleanly formatted, into standard deliverables entirely offline.
                </p>

                {errorMsg && (
                    <div style={{ padding: '1rem', background: 'rgba(255,50,50,0.1)', border: '1px solid var(--color-destructive)', borderRadius: 'var(--radius-md)', color: 'var(--color-destructive)', marginBottom: '1.5rem' }}>
                        <AlertTriangle size={16} style={{ marginBottom: '-3px', marginRight: '0.5rem' }} /> {errorMsg}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Novel Selection */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Target Novel</label>
                        {novels.length === 0 ? (
                            <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--color-warning)' }}>No novels detected in database.</div>
                        ) : (
                            <select
                                className="input-field"
                                style={{ width: '100%', maxWidth: '400px' }}
                                value={selectedNovelId}
                                onChange={(e) => setSelectedNovelId(e.target.value)}
                            >
                                {novels.map(n => (
                                    <option key={n.id} value={n.id}>{n.title}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Format Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '800px' }}>

                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="format"
                                value="docx"
                                checked={exportFormat === 'docx'}
                                onChange={(e) => setExportFormat(e.target.value as any)}
                                style={{ display: 'none' }}
                            />
                            <div style={{ padding: '1rem', border: `1px solid ${exportFormat === 'docx' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: exportFormat === 'docx' ? 'rgba(0, 153, 255, 0.05)' : 'var(--color-surface)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <FileBadge size={24} color={exportFormat === 'docx' ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: exportFormat === 'docx' ? 'var(--color-text)' : 'var(--color-text-muted)' }}>DOCX Manuscript</h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Standard Word file natively formatted for submissions.</div>
                                </div>
                            </div>
                        </label>

                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="format"
                                value="epub"
                                checked={exportFormat === 'epub'}
                                onChange={(e) => setExportFormat(e.target.value as any)}
                                style={{ display: 'none' }}
                            />
                            <div style={{ padding: '1rem', border: `1px solid ${exportFormat === 'epub' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: exportFormat === 'epub' ? 'rgba(0, 153, 255, 0.05)' : 'var(--color-surface)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <BookTemplate size={24} color={exportFormat === 'epub' ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: exportFormat === 'epub' ? 'var(--color-text)' : 'var(--color-text-muted)' }}>ePub Book</h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Structured eBook explicitly wrapping your chapters natively.</div>
                                </div>
                            </div>
                        </label>

                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="format"
                                value="markdown"
                                checked={exportFormat === 'markdown'}
                                onChange={(e) => setExportFormat(e.target.value as any)}
                                style={{ display: 'none' }}
                            />
                            <div style={{ padding: '1rem', border: `1px solid ${exportFormat === 'markdown' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: exportFormat === 'markdown' ? 'rgba(0, 153, 255, 0.05)' : 'var(--color-surface)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <FileText size={24} color={exportFormat === 'markdown' ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: exportFormat === 'markdown' ? 'var(--color-text)' : 'var(--color-text-muted)' }}>Markdown Manifest</h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Linear text file stripped of HTML utilizing typical hashes.</div>
                                </div>
                            </div>
                        </label>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <button
                            className="btn primary"
                            onClick={handleExport}
                            disabled={isExporting || novels.length === 0 || !selectedNovelId}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <FileArchive size={16} />
                            {isExporting ? 'Compiling Artifacts...' : `Generate ${exportFormat.toUpperCase()} Compilation`}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
