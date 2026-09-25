import { useState, useEffect, useMemo } from 'react'
import { Dialog } from '../../../components/shared/Dialog'
import { db } from '../../../db/database'
import { useWorkspaceStore } from '../../../store/workspaceStore'

export function LinkAssetModal({ isOpen, onClose, entryId, onLinked }: { isOpen: boolean, onClose: () => void, entryId: string, onLinked: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [assets, setAssets] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAssetId, setSelectedAssetId] = useState('')
    const [role, setRole] = useState('Reference')

    useEffect(() => {
        if (isOpen && activeNovelId) {
            db.assets.where({ novelId: activeNovelId }).toArray().then(setAssets)
            setSearchQuery('')
            setSelectedAssetId('')
            setRole('Reference')
        }
    }, [isOpen, activeNovelId])

    const filtered = useMemo(() => {
        if (!searchQuery) return assets
        return assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [assets, searchQuery])

    const handleLink = async () => {
        if (!activeNovelId || !selectedAssetId) return
        await db.assetLinks.add({
            id: crypto.randomUUID(),
            novelId: activeNovelId,
            assetId: selectedAssetId,
            targetId: entryId,
            targetType: 'BibleEntry',
            role,
        })
        onLinked()
        onClose()
    }

    const roles = ['Primary Portrait', 'Alternate Portrait', 'Map', 'Exterior', 'Interior', 'Floor Plan', 'Reference', 'Cover', 'Other']

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Link Existing Asset" width="600px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search library..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                />

                <div style={{ height: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem', padding: '0.5rem' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>No images found.</div>
                    ) : (
                        filtered.map(a => {
                            const url = URL.createObjectURL(a.blob)
                            return (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedAssetId(a.id)}
                                    style={{
                                        height: '100px',
                                        background: `url(${url}) center/cover`,
                                        border: selectedAssetId === a.id ? '3px solid var(--color-accent)' : '3px solid transparent',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    title={a.name}
                                />
                            )
                        })
                    )}
                </div>

                <label>
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Role</span>
                    <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn outline" onClick={onClose}>Cancel</button>
                    <button className="btn primary" onClick={handleLink} disabled={!selectedAssetId}>Link Asset</button>
                </div>
            </div>
        </Dialog>
    )
}
