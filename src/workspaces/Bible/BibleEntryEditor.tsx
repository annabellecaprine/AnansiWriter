import { useState, useEffect } from 'react'
import { BibleService } from '../../services/BibleService'
import { AssetService } from '../../services/AssetService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Save, ArrowLeft, Image as ImageIcon, BookOpen } from 'lucide-react'
import RelationshipsPanel from './RelationshipsPanel'
import ReferencedByPanel from './ReferencedByPanel'
import { promptInput } from '../../store/dialogStore'

// Dummy route param alternative for now, assuming entryId is passed or stored in zustand
export default function BibleEntryEditor({ entryId, onBack }: { entryId: string, onBack: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [entry, setEntry] = useState<any>(null)
    const [fields, setFields] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [assetUrls, setAssetUrls] = useState<Record<string, string>>({})

    useEffect(() => {
        const urls: Record<string, string> = {}
        assets.forEach(a => {
            if (a.blob) urls[a.id] = URL.createObjectURL(a.blob)
        })
        setAssetUrls(urls)
        return () => {
            Object.values(urls).forEach(url => URL.revokeObjectURL(url))
        }
    }, [assets])

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

    if (!entry) return <div className="workspace-view"><p>Loading entry...</p></div>

    const handleSave = async () => {
        // Basic array map mock for save routines
        console.log('Saved fields', fields)
        onBack()
    }

    return (
        <div className="workspace-view">
            <header className="workspace-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="icon-btn" onClick={onBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>{entry.name}</h1>
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem', fontWeight: 600 }}>{entry.type}</span>
                    </div>
                </div>
                <button className="btn" onClick={handleSave}>
                    <Save size={18} />
                    Save Changes
                </button>
            </header>

            <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="surface-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ImageIcon size={18} />
                            Asset Library
                        </h3>
                        <div>
                            <input
                                type="file"
                                id={`upload-${entryId}`}
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (file && activeNovelId) {
                                        await AssetService.uploadAsset(activeNovelId, file, entryId)
                                        loadEntry()
                                    }
                                }}
                                accept="image/*"
                            />
                            <button className="btn" onClick={() => document.getElementById(`upload-${entryId}`)?.click()}>+ Link Image</button>
                        </div>
                    </div>
                    {assets.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {assets.map((a: any) => {
                                const url = assetUrls[a.id]
                                return url ? <img key={a.id} src={url} alt="Linked Asset" style={{ height: '80px', borderRadius: '4px', border: '1px solid var(--color-border)', objectFit: 'cover' }} /> : null
                            })}
                        </div>
                    )}
                </div>

                <div className="surface-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Aliases & Tags</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input type="text" placeholder="Add an alias..." defaultValue={entry.aliases.join(', ')} style={{ flex: 1 }} />
                        <input type="text" placeholder="Tags (comma separated)" defaultValue={entry.tags.join(', ')} style={{ flex: 1 }} />
                    </div>
                </div>

                <div className="surface-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Attributes</h3>
                    {fields.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>No fields defined yet. Select a template to populate.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {fields.map((f: any) => (
                                <div key={f.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ width: '150px', fontWeight: 500, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {f.fieldKey}
                                        {f.provenance?.length > 0 && (
                                            <span title={`Established in Scene: ${f.provenance[0]}`}>
                                                <BookOpen size={14} style={{ color: 'var(--color-accent)' }} />
                                            </span>
                                        )}
                                    </span>
                                    <input type="text" defaultValue={f.value} style={{ flex: 1 }} />
                                    <span className="status-badge" style={{ background: 'var(--color-surface-hover)' }}>{f.state}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        className="btn"
                        style={{ marginTop: '1.5rem' }}
                        onClick={async () => {
                            const name = await promptInput({
                                title: 'Add Custom Field',
                                message: 'Enter custom field name (e.g., "Secret Motivation"):',
                                placeholder: 'Field Name'
                            })
                            if (name && activeNovelId) {
                                await BibleService.addFieldValue(activeNovelId, entryId, name, '')
                                loadEntry()
                            }
                        }}
                    >
                        + Add Custom Field
                    </button>
                </div>

                {/* Embedded Relationships Component */}
                <RelationshipsPanel entryId={entryId} />
                <ReferencedByPanel entryId={entryId} novelId={activeNovelId!} />
            </div>
        </div>
    )
}
