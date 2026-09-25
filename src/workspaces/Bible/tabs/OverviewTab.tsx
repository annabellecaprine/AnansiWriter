import { useState, useEffect } from 'react'
import { BibleService } from '../../../services/BibleService'
import { AssetService } from '../../../services/AssetService'
import { useWorkspaceStore } from '../../../store/workspaceStore'

export default function OverviewTab({ entry, assets, onUpdated }: { entry: any, assets: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [description, setDescription] = useState(entry.description || '')
    const [aliasesInput, setAliasesInput] = useState('')
    const [tagsInput, setTagsInput] = useState('')
    const [keywordsInput, setKeywordsInput] = useState('')

    // Primary image logic: assume role "primary_portrait" or first asset is primary
    const primaryAsset = assets.find(a => a.linkRole === 'primary_portrait') || assets[0]
    const [primaryUrl, setPrimaryUrl] = useState<string | null>(null)

    useEffect(() => {
        if (primaryAsset?.blob) {
            const url = URL.createObjectURL(primaryAsset.blob)
            setPrimaryUrl(url)
            return () => URL.revokeObjectURL(url)
        }
        setPrimaryUrl(null)
    }, [primaryAsset])

    // Initialize inputs
    useEffect(() => {
        setDescription(entry.description || '')
        setAliasesInput((entry.aliases || []).join(', '))
        setTagsInput((entry.tags || []).join(', '))
        setKeywordsInput((entry.keywords || []).join(', '))
    }, [entry])

    const handleSave = async () => {
        if (!activeNovelId) return

        const aliases = aliasesInput.split(',').map(s => s.trim()).filter(Boolean)
        const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean)
        const keywords = keywordsInput.split(',').map(s => s.trim()).filter(Boolean)

        await BibleService.updateEntry(activeNovelId, entry.id, {
            description,
            aliases,
            tags,
            keywords
        })
        onUpdated()
    }

    return (
        <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                {/* Image Section */}
                <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ width: '100%', height: '300px', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {primaryUrl ? (
                            <img src={primaryUrl} alt="Primary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>No Image</span>
                        )}
                    </div>
                </div>

                {/* Core Attributes Editor */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <label>
                        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Description</span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleSave}
                            placeholder="Primary reference description..."
                            rows={8}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', resize: 'vertical' }}
                        />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <label>
                            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Aliases</span>
                            <input
                                type="text"
                                value={aliasesInput}
                                onChange={(e) => setAliasesInput(e.target.value)}
                                onBlur={handleSave}
                                placeholder="E.g., Bobby, Bob-o"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>Direct identifiers.</small>
                        </label>

                        <label>
                            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Tags</span>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                onBlur={handleSave}
                                placeholder="E.g., Support, Needs Work"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>Author labels.</small>
                        </label>

                        <label>
                            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Keywords</span>
                            <input
                                type="text"
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                onBlur={handleSave}
                                placeholder="E.g., mechanic, garage"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>Search/indexing concepts.</small>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
