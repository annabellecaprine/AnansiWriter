import { useState, useEffect } from 'react'
import { BibleService } from '../../services/BibleService'
import { AssetService } from '../../services/AssetService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Save, Trash2 } from 'lucide-react'
import { confirmAction } from '../../store/dialogStore'

import OverviewTab from './tabs/OverviewTab'
import DetailsTab from './tabs/DetailsTab'
import RelationshipsTab from './tabs/RelationshipsTab'
import MediaTab from './tabs/MediaTab'
import TimelineTab from './tabs/TimelineTab'
import SourcesTab from './tabs/SourcesTab'
import AdvancedTab from './tabs/AdvancedTab'

type TabKeys = 'Overview' | 'Details' | 'Relationships' | 'Media' | 'Timeline' | 'Sources' | 'Advanced'

export function BibleEntryPane({ entryId, onRefreshLibrary, onClose }: { entryId: string, onRefreshLibrary: () => void, onClose: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [entry, setEntry] = useState<any>(null)
    const [fields, setFields] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])

    const [activeTab, setActiveTab] = useState<TabKeys>('Overview')

    const loadEntry = () => {
        if (activeNovelId && entryId) {
            BibleService.getEntryWithFields(activeNovelId, entryId).then(data => {
                if (data) {
                    setEntry(data)
                    setFields(data.fields)
                }
            })
            AssetService.getLinkedAssets(activeNovelId, entryId).then(setAssets)
        }
    }

    useEffect(() => {
        loadEntry()
    }, [activeNovelId, entryId])

    if (!entry) {
        return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading...</div>
    }

    const handleDelete = async () => {
        if (!activeNovelId) return
        const confirm = await confirmAction({
            title: 'Delete Entry',
            message: `Are you sure you want to move "${entry.name}" to the Trash? Existing relationship links will be preserved but hidden.`,
            isDestructive: true,
            confirmLabel: 'Move to Trash'
        })

        if (confirm) {
            await BibleService.moveToTrash(activeNovelId, entryId)
            onRefreshLibrary()
            onClose()
        }
    }

    const tabs: TabKeys[] = ['Overview', 'Details', 'Relationships', 'Media', 'Timeline', 'Sources', 'Advanced']

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '2rem 2rem 0 2rem', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem' }}>{entry.name}</h1>
                        <p style={{ color: 'var(--color-accent)', fontWeight: 600, margin: '0.25rem 0 0 0' }}>{entry.type}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn outline" onClick={handleDelete} title="Move to Trash">
                            <Trash2 size={16} color="var(--color-error)" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.5rem 0',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                fontWeight: activeTab === tab ? 600 : 500,
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Payload */}
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {activeTab === 'Overview' && <OverviewTab entry={entry} assets={assets} onUpdated={() => { loadEntry(); onRefreshLibrary(); }} />}
                {activeTab === 'Details' && <DetailsTab entry={entry} fields={fields} onUpdated={loadEntry} />}
                {activeTab === 'Relationships' && <RelationshipsTab entryId={entryId} />}
                {activeTab === 'Media' && <MediaTab entry={entry} assets={assets} onUpdated={loadEntry} />}
                {activeTab === 'Timeline' && <TimelineTab entryId={entryId} fields={fields} onUpdated={loadEntry} />}
                {activeTab === 'Sources' && <SourcesTab entry={entry} fields={fields} onUpdated={() => { loadEntry(); onRefreshLibrary(); }} />}
                {activeTab === 'Advanced' && <AdvancedTab entry={entry} onUpdated={() => { loadEntry(); onRefreshLibrary(); }} />}
            </div>
        </div>
    )
}
