import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { BibleService } from '../../services/BibleService'
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
                    Please open or create a project to access the Bible.
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
                        <button className="btn outline" onClick={() => setIsNewEntryOpen(true)}>+ New Entry</button>

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
