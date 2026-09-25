import { useState } from 'react'
import { BibleService } from '../../../services/BibleService'
import { useWorkspaceStore } from '../../../store/workspaceStore'

export default function AdvancedTab({ entry, onUpdated }: { entry: any, onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [alwaysIncludeInContext, setAlwaysIncludeInContext] = useState(entry.alwaysIncludeInContext ?? false)
    const [excludeFromContext, setExcludeFromContext] = useState(entry.excludeFromContext ?? false)
    const [doNotTrack, setDoNotTrack] = useState(entry.doNotTrack ?? false)

    const handleSave = async (key: string, val: boolean) => {
        if (!activeNovelId) return
        await BibleService.updateEntry(activeNovelId, entry.id, { [key]: val })
        onUpdated()
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>AI Context Preferences</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Control how the Context Engine interprets this entry when generating narrative text.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={alwaysIncludeInContext}
                            onChange={(e) => {
                                setAlwaysIncludeInContext(e.target.checked)
                                handleSave('alwaysIncludeInContext', e.target.checked)
                            }}
                        />
                        <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>Always Include in Context</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Force this entry into every AI inference call regardless of the current scene scope or explicit context selectors. Use sparingly for global overarching truths.</span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={excludeFromContext}
                            onChange={(e) => {
                                setExcludeFromContext(e.target.checked)
                                handleSave('excludeFromContext', e.target.checked)
                            }}
                        />
                        <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>Exclude from Automatic Context</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Prevent the Context Engine from automatically discovering and injecting this entry, even if it is mentioned natively in the active Scene. (Can still be manually attached).</span>
                        </div>
                    </label>
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Analytics & Occurrences</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={doNotTrack}
                            onChange={(e) => {
                                setDoNotTrack(e.target.checked)
                                handleSave('doNotTrack', e.target.checked)
                            }}
                        />
                        <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>Do Not Track</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Disable background semantic occurrence scanning for this entry across the manuscript. Prevents this record from appearing in the Review heatmap.</span>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    )
}
