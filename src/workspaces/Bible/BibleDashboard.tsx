import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { BibleService } from '../../services/BibleService'
import { BibleExporter } from '../../services/export/BibleExporter'
import { db } from '../../db/database'
import { BibleLibraryPane } from './BibleLibraryPane'
import { BibleEntryPane } from './BibleEntryPane'
import { NewEntryModal } from './modals/NewEntryModal'
import { OccurrenceReviewQueue } from './OccurrenceReviewQueue'
import type { BibleEntry } from '../../db/schema'

export default function BibleDashboard() {
    const { activeNovelId } = useWorkspaceStore()
    const [entries, setEntries] = useState<BibleEntry[]>([])
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
    const [isNewEntryOpen, setIsNewEntryOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        if (!activeNovelId || isExporting) return
        setIsExporting(true)
        try {
            const blob = await BibleExporter.exportBible(activeNovelId)
            const novel = await db.novels.get(activeNovelId)
            const titleSlug = (novel?.title || 'codex').replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${titleSlug}_codex.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err: any) {
            console.error('Codex Export Failed:', err)
            alert(err.message || 'Failed to export Codex.')
        } finally {
            setIsExporting(false)
        }
    }

    const loadEntries = () => {
        if (activeNovelId) {
            BibleService.listActiveEntries(activeNovelId).then(setEntries)
        }
    }

    useEffect(() => {
        loadEntries()
    }, [activeNovelId])

    if (!activeNovelId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
                    Please open or create a novel to access the Codex.
                </p>
            </div>
        )
    }

    return (
        <div style={{ padding: 0, height: '100%', width: '100%', display: 'flex', backgroundColor: 'var(--color-bg)' }}>

            {/* Left Library Pane */}
            <div style={{ width: '320px', borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}>
                <BibleLibraryPane
                    entries={entries}
                    activeEntryId={activeEntryId}
                    onSelectEntry={setActiveEntryId}
                    onNewEntry={() => setIsNewEntryOpen(true)}
                />
            </div>

            {/* Right Entry Content Pane */}
            <div style={{ flex: 1, height: '100%', overflowY: 'auto', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
                {activeEntryId ? (
                    <BibleEntryPane
                        entryId={activeEntryId}
                        onRefreshLibrary={loadEntries}
                        onClose={() => setActiveEntryId(null)}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 500 }}>Select or Create an Entry</h2>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button className="btn outline" onClick={() => setIsNewEntryOpen(true)}>+ New Entry</button>
                            <button
                                className="btn outline"
                                onClick={handleExport}
                                disabled={isExporting}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                title="Export Codex as Markdown ZIP"
                            >
                                <Download size={16} /> {isExporting ? 'Exporting...' : 'Export Codex (.zip)'}
                            </button>
                        </div>

                        <div style={{ marginTop: '3rem', width: '80%', maxWidth: '600px' }}>
                            <OccurrenceReviewQueue />
                        </div>
                    </div>
                )}
            </div>

            <NewEntryModal
                isOpen={isNewEntryOpen}
                onClose={() => setIsNewEntryOpen(false)}
                onEntryCreated={(id) => {
                    setIsNewEntryOpen(false)
                    loadEntries()
                    setActiveEntryId(id)
                }}
            />
        </div>
    )
}
