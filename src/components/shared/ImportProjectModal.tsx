import React, { useState, useRef, useEffect } from 'react'
import { Dialog } from './Dialog'
import { Upload, FileArchive, Database, AlertTriangle, CheckCircle2, Loader2, Key, Layers, BookOpen } from 'lucide-react'
import { ImportService, type ProjectArchiveMeta } from '../../services/ImportService'
import { BackupService } from '../../services/BackupService'
import { NovelCrafterParser, type ImportPackage } from '../../services/import/NovelCrafterParser'
import { CodexImportService, type CodexImportPackage } from '../../services/CodexImportService'
import { LibraryService } from '../../services/LibraryService'
import { CryptoService } from '../../services/CryptoService'
import { db } from '../../db/database'
import { confirmAction, confirmAlert } from '../../store/dialogStore'
import { useWorkspaceStore } from '../../store/workspaceStore'

interface ImportProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProjectImported?: (novelId: string) => void;
    onSystemRestored?: () => void;
    targetNovelId?: string;
}

type DetectedFileType = 'anansi-project' | 'anansi-system-backup' | 'anansi-codex' | 'novelcrafter' | null;

export function ImportProjectModal({ isOpen, onClose, onProjectImported, onSystemRestored, targetNovelId }: ImportProjectModalProps) {
    const { activeNovelId } = useWorkspaceStore()
    const [file, setFile] = useState<File | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isExecuting, setIsExecuting] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [progressStatus, setProgressStatus] = useState('')

    // Detected File Info
    const [detectedType, setDetectedType] = useState<DetectedFileType>(null)
    const [anansiMeta, setAnansiMeta] = useState<ProjectArchiveMeta | null>(null)
    const [dexieMeta, setDexieMeta] = useState<any>(null)
    const [codexPackage, setCodexPackage] = useState<CodexImportPackage | null>(null)
    const [ncPackage, setNcPackage] = useState<ImportPackage | null>(null)

    // Options
    const [importAsCopy, setImportAsCopy] = useState(true)
    const [password, setPassword] = useState('')
    const [isEncrypted, setIsEncrypted] = useState(false)

    // Codex Import Options
    const [novelsList, setNovelsList] = useState<Array<{ id: string; title: string }>>([])
    const [selectedTargetNovelId, setSelectedTargetNovelId] = useState<string>('')
    const [overwriteCodexExisting, setOverwriteCodexExisting] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            db.novels.toArray().then(novels => {
                const list = novels.map(n => ({ id: n.id, title: n.title || 'Untitled Novel' }))
                setNovelsList(list)
                const initialTarget = targetNovelId || activeNovelId || (list.length > 0 ? list[0].id : '__new__')
                setSelectedTargetNovelId(initialTarget)
            })
        }
    }, [isOpen, targetNovelId, activeNovelId])

    const resetState = () => {
        setFile(null)
        setIsAnalyzing(false)
        setIsExecuting(false)
        setErrorMsg('')
        setProgressStatus('')
        setDetectedType(null)
        setAnansiMeta(null)
        setDexieMeta(null)
        setCodexPackage(null)
        setNcPackage(null)
        setImportAsCopy(true)
        setPassword('')
        setIsEncrypted(false)
        setOverwriteCodexExisting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleFileSelect = async (selectedFile: File) => {
        resetState()
        setFile(selectedFile)
        setIsAnalyzing(true)

        const fileName = selectedFile.name.toLowerCase()

        try {
            // Case 1: Full System Backup (.json)
            if (fileName.endsWith('.json')) {
                const meta = await BackupService.peakBackupMetadata(selectedFile)
                if (meta?.data?.databaseName !== 'AnansiWriterDB') {
                    throw new Error('This JSON file is not a recognized AnansiWriter full system backup.')
                }
                setDexieMeta(meta)
                setDetectedType('anansi-system-backup')
                setIsAnalyzing(false)
                return
            }

            // Case 2: Zip / StoryProject
            if (fileName.endsWith('.zip') || fileName.endsWith('.storyproject')) {
                // Check encryption
                const encrypted = await CryptoService.isEncrypted(selectedFile)
                if (encrypted) {
                    setIsEncrypted(true)
                    setDetectedType('anansi-project')
                    setIsAnalyzing(false)
                    return
                }

                // Check if AnansiWriter project archive
                try {
                    const peek = await ImportService.peekProjectArchive(selectedFile)
                    setAnansiMeta(peek)
                    setDetectedType('anansi-project')
                    setImportAsCopy(peek.collision)
                    setIsAnalyzing(false)
                    return
                } catch {
                    // Fall through
                }

                // Check if AnansiWriter Codex archive
                try {
                    const isCodex = await CodexImportService.isCodexArchive(selectedFile)
                    if (isCodex) {
                        const parsedCodex = await CodexImportService.parseCodexArchive(selectedFile)
                        if (parsedCodex.entries.length > 0 || parsedCodex.categories?.length || parsedCodex.relationshipTypes?.length) {
                            setCodexPackage(parsedCodex)
                            setDetectedType('anansi-codex')
                            setIsAnalyzing(false)
                            return
                        }
                    }
                } catch {
                    // Fall through
                }

                // Test NovelCrafter
                try {
                    const nc = await NovelCrafterParser.parseZip(selectedFile)
                    if (nc.acts.length > 0 || nc.chapters.length > 0 || nc.scenes.length > 0 || nc.codexEntries.length > 0) {
                        setNcPackage(nc)
                        setDetectedType('novelcrafter')
                        setIsAnalyzing(false)
                        return
                    }
                } catch {
                    // Fall through
                }

                throw new Error('Unable to recognize archive contents. File is neither an AnansiWriter project archive, a Codex export archive, nor a NovelCrafter export.')
            }

            throw new Error('Unsupported file extension. Please select a .zip, .storyproject, or .json file.')

        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to inspect file.')
            setDetectedType(null)
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleImportAnansiProject = async () => {
        if (!file) return
        setIsExecuting(true)
        setProgressStatus('Importing AnansiWriter project archive...')
        setErrorMsg('')

        try {
            const importedNovelId = await ImportService.validateAndImportProject(file, {
                importAsCopy,
                password: password || undefined,
                overwrite: !importAsCopy
            })

            onClose()
            resetState()
            if (onProjectImported) {
                onProjectImported(importedNovelId)
            }
        } catch (err: any) {
            if (err.message === 'ENCRYPTED_ARCHIVE') {
                setIsEncrypted(true)
                setErrorMsg('Password required to decrypt this archive.')
            } else if (err.message === 'CollisionDetected') {
                setErrorMsg('A project with this ID already exists. Select "Import as New Copy" or "Replace Existing Project".')
            } else {
                setErrorMsg(err.message || 'Import failed.')
            }
        } finally {
            setIsExecuting(false)
            setProgressStatus('')
        }
    }

    const handleRestoreSystemBackup = async () => {
        if (!file || !dexieMeta) return

        const confirmed = await confirmAction({
            title: 'Restore Full System Backup',
            message: `Are you sure you want to restore this backup? This operation is DESTRUCTIVE and will permanently replace all current local data!\n\nBackup Metadata:\n- Tables: ${dexieMeta.data.tables.length}\n- Dexie Format Version: ${dexieMeta.formatVersion}`,
            confirmLabel: 'Yes, Overwrite & Restore',
            cancelLabel: 'Cancel',
            isDestructive: true
        })

        if (!confirmed) return

        setIsExecuting(true)
        setProgressStatus('Restoring full system database...')

        try {
            await BackupService.restoreBackup(file, (progress) => {
                setProgressStatus(`Restoring: ${progress.completedRows} rows processed...`)
                return true
            })

            onClose()
            resetState()
            if (onSystemRestored) {
                onSystemRestored()
            } else {
                window.location.reload()
            }
        } catch (err: any) {
            await confirmAlert({
                title: 'Restore Failed',
                message: err.message || 'Failed to restore database from backup.'
            })
        } finally {
            setIsExecuting(false)
            setProgressStatus('')
        }
    }

    const handleImportNovelCrafter = async () => {
        if (!ncPackage) return
        setIsExecuting(true)
        setProgressStatus('Importing NovelCrafter package...')
        setErrorMsg('')

        const novelId = crypto.randomUUID()

        try {
            await db.transaction('rw', [db.novels, db.acts, db.chapters, db.scenes, db.bibleEntries], async () => {
                const now = Date.now()

                await db.novels.add({
                    id: novelId,
                    seriesId: undefined,
                    title: ncPackage.novel.title,
                    summary: 'Imported from NovelCrafter',
                    createdAt: now,
                    updatedAt: now
                })

                const dbActs = ncPackage.acts.map((a: any) => ({
                    id: a.id,
                    novelId: novelId,
                    name: a.name,
                    summary: '',
                    sortOrder: a.sortOrder,
                    createdAt: now,
                    updatedAt: now
                }))
                if (dbActs.length > 0) await db.acts.bulkAdd(dbActs)

                const dbChapters = ncPackage.chapters.map((c: any) => ({
                    id: c.id,
                    novelId: novelId,
                    actId: c.actId || null,
                    name: c.name,
                    summary: '',
                    planningContent: { type: 'doc', content: [] },
                    sortOrder: c.sortOrder,
                    createdAt: now,
                    updatedAt: now
                }))
                if (dbChapters.length > 0) await db.chapters.bulkAdd(dbChapters)

                const proseToTipTap = (text: string) => {
                    const paragraphs = text.split('\n').map((p: string) => p.trim()).filter(Boolean)
                    if (paragraphs.length === 0) return { type: 'doc', content: [{ type: 'paragraph' }] }
                    return {
                        type: 'doc',
                        content: paragraphs.map(p => ({
                            type: 'paragraph',
                            content: [{ type: 'text', text: p }]
                        }))
                    }
                }

                const dbScenes = ncPackage.scenes.map((s: any) => ({
                    id: s.id,
                    novelId: novelId,
                    chapterId: s.chapterId,
                    name: s.name,
                    content: proseToTipTap(s.content || ''),
                    status: 'Draft' as const,
                    wordCount: (s.content || '').split(/\s+/).filter(Boolean).length,
                    notes: s.notes || '',
                    sortOrder: s.sortOrder,
                    createdAt: now,
                    updatedAt: now
                }))
                if (dbScenes.length > 0) await db.scenes.bulkAdd(dbScenes)

                const dbCodex = ncPackage.codexEntries.map((e: any) => ({
                    id: e.id,
                    novelId: novelId,
                    seriesId: undefined,
                    name: e.name,
                    type: e.type || 'Lore',
                    description: e.description || '',
                    aliases: e.aliases || [],
                    tags: e.tags || [],
                    keywords: [],
                    createdAt: now,
                    updatedAt: now
                }))
                if (dbCodex.length > 0) await db.bibleEntries.bulkAdd(dbCodex)
            })

            onClose()
            resetState()
            if (onProjectImported) {
                onProjectImported(novelId)
            }
        } catch (err: any) {
            setErrorMsg(`Import failed: ${err.message}`)
        } finally {
            setIsExecuting(false)
            setProgressStatus('')
        }
    }

    const handleImportCodex = async () => {
        if (!file || !codexPackage) return
        setIsExecuting(true)
        setProgressStatus('Importing codex entries, fields, and relationships...')
        setErrorMsg('')

        try {
            let targetId = selectedTargetNovelId
            if (targetId === '__new__') {
                const defaultTitle = file ? file.name.replace(/\.zip$/i, '').replace(/[-_]codex$/i, '').replace(/[-_]/g, ' ') : 'Codex Project'
                targetId = await LibraryService.createStandaloneNovel(defaultTitle || 'Imported Codex')
            }

            const result = await CodexImportService.importCodexPackage(codexPackage, {
                targetNovelId: targetId,
                overwriteExisting: overwriteCodexExisting
            })

            onClose()
            resetState()

            await confirmAlert({
                title: 'Codex Import Successful',
                message: `Successfully imported ${result.importedCount + result.updatedCount} codex entries (${result.importedCount} new, ${result.updatedCount} updated), ${result.relationshipsCreated} relationships, and ${result.categoriesImported} category definitions.`
            })

            if (onProjectImported) {
                onProjectImported(targetId)
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to import Codex.')
        } finally {
            setIsExecuting(false)
            setProgressStatus('')
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Import Project or Backup" width="600px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Select or drop an AnansiWriter project archive (<code>.storyproject</code> / <code>.zip</code>), an AnansiWriter codex backup (<code>_codex.zip</code>), an AnansiWriter full system backup (<code>.json</code>), or a NovelCrafter export archive.
                </p>

                {/* Dropzone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.75rem',
                        textAlign: 'center',
                        background: 'var(--color-bg)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) handleFileSelect(dropped);
                    }}
                >
                    <input
                        type="file"
                        accept=".zip,.storyproject,.json"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                        }}
                    />
                    <Upload size={32} color="var(--color-accent)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        {file ? file.name : 'Click or drag file here to import'}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Supported formats: .storyproject, .zip (AnansiWriter Project or Codex / NovelCrafter), .json (Anansi Full Backup)
                    </span>
                </div>

                {/* Progress / Status */}
                {isAnalyzing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)', fontSize: '0.85rem' }}>
                        <Loader2 size={16} className="spin" />
                        <span>Inspecting file contents...</span>
                    </div>
                )}

                {isExecuting && progressStatus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)', fontSize: '0.85rem' }}>
                        <Loader2 size={16} className="spin" />
                        <span>{progressStatus}</span>
                    </div>
                )}

                {errorMsg && (
                    <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Detected Details: AnansiWriter Project Archive */}
                {detectedType === 'anansi-project' && (
                    <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>
                            <FileArchive size={18} /> AnansiWriter Project Archive
                        </div>

                        {anansiMeta?.manifest && (
                            <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                                <div><strong>Novel:</strong> {anansiMeta.manifest.novel.title} {anansiMeta.manifest.novel.author ? `by ${anansiMeta.manifest.novel.author}` : ''}</div>
                                {anansiMeta.manifest.series && <div><strong>Series:</strong> {anansiMeta.manifest.series.title}</div>}
                                <div><strong>Exported:</strong> {new Date(anansiMeta.manifest.exportDate).toLocaleDateString()}</div>
                                <div style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    {anansiMeta.counts?.chapters || 0} Chapters • {anansiMeta.counts?.scenes || 0} Scenes • {anansiMeta.counts?.codexEntries || 0} Codex Entries
                                </div>
                            </div>
                        )}

                        {isEncrypted && (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Archive Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter password..."
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                                />
                            </div>
                        )}

                        {anansiMeta?.collision && (
                            <div style={{ padding: '0.6rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--color-warning)', borderRadius: '4px', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-warning)', fontWeight: 600, marginBottom: '0.4rem' }}>
                                    <AlertTriangle size={14} /> Project Already Exists in Library
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                        <input type="radio" checked={importAsCopy} onChange={() => setImportAsCopy(true)} />
                                        <span><strong>Import as New Copy</strong> (generates new IDs, preserves existing novel)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                        <input type="radio" checked={!importAsCopy} onChange={() => setImportAsCopy(false)} />
                                        <span><strong>Overwrite Existing Project</strong> (replaces local novel data)</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                className="btn primary"
                                onClick={handleImportAnansiProject}
                                disabled={isExecuting || (isEncrypted && !password)}
                            >
                                {isExecuting ? 'Importing...' : 'Import Project'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Detected Details: AnansiWriter Codex Archive */}
                {detectedType === 'anansi-codex' && codexPackage && (
                    <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>
                            <BookOpen size={18} /> AnansiWriter Codex Archive (.zip)
                        </div>

                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            <div><strong>Codex Entries:</strong> {codexPackage.entries.length} entries found</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                                {Object.entries(codexPackage.entryCountsByType).map(([type, count]) => (
                                    <span key={type} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                                        {type}: <strong>{count}</strong>
                                    </span>
                                ))}
                            </div>

                            {((codexPackage.categories && codexPackage.categories.length > 0) || (codexPackage.relationshipTypes && codexPackage.relationshipTypes.length > 0)) && (
                                <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                    Includes {codexPackage.categories?.length || 0} category definitions and {codexPackage.relationshipTypes?.length || 0} relationship types.
                                </div>
                            )}
                        </div>

                        {/* Target Novel Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Destination Project</label>
                            <select
                                value={selectedTargetNovelId}
                                onChange={e => setSelectedTargetNovelId(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem' }}
                            >
                                {novelsList.map(n => (
                                    <option key={n.id} value={n.id}>{n.title}</option>
                                ))}
                                <option value="__new__">+ Create New Standalone Novel for Codex</option>
                            </select>
                        </div>

                        {/* Overwrite or Merge */}
                        <div style={{ padding: '0.6rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input type="radio" checked={!overwriteCodexExisting} onChange={() => setOverwriteCodexExisting(false)} />
                                <span><strong>Add as New / Merge</strong> (adds new entries, preserves existing content)</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input type="radio" checked={overwriteCodexExisting} onChange={() => setOverwriteCodexExisting(true)} />
                                <span><strong>Update Matching Entries</strong> (overwrites entries with the same name)</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                className="btn primary"
                                onClick={handleImportCodex}
                                disabled={isExecuting || !selectedTargetNovelId}
                            >
                                {isExecuting ? 'Importing Codex...' : 'Import Codex Entries'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Detected Details: AnansiWriter Full System Backup */}
                {detectedType === 'anansi-system-backup' && dexieMeta && (
                    <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-info)', fontWeight: 600, fontSize: '0.9rem' }}>
                            <Database size={18} /> AnansiWriter Full System Backup (.json)
                        </div>

                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            <div><strong>Database:</strong> {dexieMeta.data.databaseName} (v{dexieMeta.data.databaseVersion})</div>
                            <div><strong>Tables Included:</strong> {dexieMeta.data.tables.length} tables</div>
                        </div>

                        <div style={{ padding: '0.6rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--color-error)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--color-error)' }}>
                            <strong>Destructive Warning:</strong> Restoring this backup will completely replace all existing novels, chapters, scenes, and codex entries currently stored in your browser.
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                className="btn outline"
                                onClick={handleRestoreSystemBackup}
                                disabled={isExecuting}
                                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                            >
                                {isExecuting ? 'Restoring Database...' : 'Restore Full System'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Detected Details: NovelCrafter Export */}
                {detectedType === 'novelcrafter' && ncPackage && (
                    <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>
                            <FileArchive size={18} /> NovelCrafter Export Archive
                        </div>

                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            <div><strong>Novel:</strong> {ncPackage.novel.title}</div>
                            <div style={{ color: 'var(--color-text-muted)' }}>
                                {ncPackage.acts.length} Acts • {ncPackage.chapters.length} Chapters • {ncPackage.scenes.length} Scenes • {ncPackage.codexEntries.length} Codex Entities
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                className="btn primary"
                                onClick={handleImportNovelCrafter}
                                disabled={isExecuting}
                            >
                                {isExecuting ? 'Importing...' : 'Import into Library'}
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button className="btn outline" onClick={() => { resetState(); onClose(); }} disabled={isExecuting}>
                        Close
                    </button>
                </div>
            </div>
        </Dialog>
    )
}
