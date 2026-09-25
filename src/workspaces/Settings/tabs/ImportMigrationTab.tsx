import React, { useState, useRef } from 'react';
import { Upload, FileArchive, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { NovelCrafterParser, ImportPackage } from '../../../services/import/NovelCrafterParser';
import { db } from '../../../db/database';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { confirmAction, confirmAlert } from '../../../store/dialogStore';

export function ImportMigrationTab() {
    const { setActiveNovel } = useWorkspaceStore();
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [parsedPkg, setParsedPkg] = useState<ImportPackage | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.zip')) {
            setErrorMsg('Please upload a valid .zip file exported from NovelCrafter.');
            return;
        }

        setFile(selectedFile);
        setErrorMsg('');
        setIsParsing(true);
        setParsedPkg(null);

        try {
            const pkg = await NovelCrafterParser.parseZip(selectedFile);
            setParsedPkg(pkg);
        } catch (err: any) {
            setErrorMsg(`Failed to parse ZIP: ${err.message}`);
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleImportCommit = async () => {
        if (!parsedPkg) return;

        const confirm = await confirmAction({
            title: 'Commit Import Data',
            message: `Are you sure you want to import ${parsedPkg.novel.title}?\nThis will create a new Novel alongside ${parsedPkg.acts.length} Acts, ${parsedPkg.chapters.length} Chapters, ${parsedPkg.scenes.length} Scenes, and ${parsedPkg.codexEntries.length} Codex entities.\nExisting library objects will remain untouched.`,
            confirmLabel: 'Yes, Execute Import',
            isDestructive: false
        });

        if (!confirm) return;

        setIsImporting(true);
        const novelId = crypto.randomUUID();

        try {
            // Transactional Dexie Insertion wrapper (prevents orphaned entities on crash)
            await db.transaction('rw', [db.novels, db.acts, db.chapters, db.scenes, db.bibleEntries], async () => {
                const now = Date.now();

                // 1. Novel Root (Injecting as Standalone)
                await db.novels.add({
                    id: novelId,
                    seriesId: undefined,
                    title: parsedPkg.novel.title,
                    summary: 'Imported from NovelCrafter',
                    createdAt: now,
                    updatedAt: now
                });

                // 2. Map Acts
                const dbActs = parsedPkg.acts.map((a: any) => ({
                    id: a.id,
                    novelId: novelId,
                    name: a.name,
                    summary: '',
                    sortOrder: a.sortOrder,
                    createdAt: now,
                    updatedAt: now
                }));
                if (dbActs.length > 0) await db.acts.bulkAdd(dbActs);

                // 3. Map Chapters
                const dbChapters = parsedPkg.chapters.map((c: any) => ({
                    id: c.id,
                    novelId: novelId,
                    actId: c.actId || null,
                    name: c.name,
                    summary: '',
                    planningContent: { type: 'doc', content: [] },
                    sortOrder: c.sortOrder,
                    createdAt: now,
                    updatedAt: now
                }));
                if (dbChapters.length > 0) await db.chapters.bulkAdd(dbChapters);

                const proseToTipTap = (text: string) => {
                    const paragraphs = text.split('\n').map((p: string) => p.trim()).filter(Boolean);
                    if (paragraphs.length === 0) return { type: 'doc', content: [{ type: 'paragraph' }] };
                    return {
                        type: 'doc',
                        content: paragraphs.map((p: string) => ({
                            type: 'paragraph',
                            content: [{ type: 'text', text: p }]
                        }))
                    };
                };

                // 4. Map Scenes
                const dbScenes = parsedPkg.scenes.map((s: any) => ({
                    id: s.id,
                    novelId: novelId,
                    chapterId: s.chapterId,
                    name: s.name,
                    content: proseToTipTap(s.prose),
                    summary: '',
                    notes: [],
                    status: 'Draft' as any,
                    wordCount: s.prose.trim().split(/\s+/).filter(Boolean).length,
                    sortOrder: s.sortOrder,
                    isArchived: false,
                    isTrashed: false,
                    planningContent: { type: 'doc', content: [] },
                    createdAt: now,
                    updatedAt: now
                }));
                if (dbScenes.length > 0) await db.scenes.bulkAdd(dbScenes);

                // 5. Map Codex & Notes
                const combinedEntries = [...parsedPkg.codexEntries, ...parsedPkg.notes];
                const dbBibleEntries = combinedEntries.map(e => ({
                    ...e,
                    novelId: novelId,
                    createdAt: now,
                    updatedAt: now
                }));
                if (dbBibleEntries.length > 0) await db.bibleEntries.bulkAdd(dbBibleEntries);
            });

            await confirmAlert({
                title: 'Import Successful',
                message: `Successfully imported "${parsedPkg.novel.title}". Switching workspace context to the new Novel now.`
            });

            setActiveNovel(novelId);

        } catch (err: any) {
            console.error('Import Error Rollback: ', err);
            await confirmAlert({
                title: 'Import Failed - Rolled Back',
                message: `The import encountered a structural error and was entirely rolled back safely.\n\nError: ${err.message}`,
                isDestructive: true
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                    <FileArchive size={20} /> NovelCrafter ZIP Migration
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Directly import your novel.md and codex folder architectures extracted from NovelCrafter.
                    This migrates boundaries without modifying your source ZIP, using a strict local transactional database wrap.
                    Private Notes are safely moved into shielded Research schemas.
                </p>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <input
                        type="file"
                        accept=".zip"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        className="btn primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsing || isImporting}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Upload size={16} /> {isParsing ? 'Analyzing Constraints...' : 'Select .ZIP Export File'}
                    </button>
                    {file && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{file.name}</span>}
                </div>

                {errorMsg && (
                    <div style={{ padding: '1rem', background: 'rgba(255,50,50,0.1)', border: '1px solid var(--color-destructive)', borderRadius: 'var(--radius-md)', color: 'var(--color-destructive)', marginBottom: '1rem' }}>
                        <AlertTriangle size={16} style={{ marginBottom: '-3px', marginRight: '0.5rem' }} /> {errorMsg}
                    </div>
                )}

                {/* Import Preview Summary Interface */}
                {parsedPkg && !isImporting && (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', background: 'var(--color-bg)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>Import Preview: {parsedPkg.novel.title}</h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Acts Detected</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{parsedPkg.acts.length}</div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Chapters Detected</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{parsedPkg.chapters.length}</div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Explicit Scenes</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{parsedPkg.scenes.length}</div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Codex Entities + Notes</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{parsedPkg.codexEntries.length + parsedPkg.notes.length}</div>
                            </div>
                        </div>

                        {parsedPkg.warnings?.length > 0 && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,200,0,0.1)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)' }}>
                                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-warning)' }}>Parsing Discrepancies</h5>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                                    {parsedPkg.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                            <button className="btn primary" onClick={handleImportCommit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={16} /> Execute Transactional Hydration
                            </button>
                        </div>
                    </div>
                )}

                {isImporting && (
                    <div style={{ marginTop: '1rem', padding: '1.5rem', textAlign: 'center', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        Executing safe IndexedDB multi-store transaction wrapping mappings... Please wait.
                    </div>
                )}
            </div>
        </div>
    );
}
