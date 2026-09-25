import { useState, useEffect } from 'react'
import { AssetService } from '../../../services/AssetService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { db } from '../../../db/database'
import { LinkAssetModal } from '../modals/LinkAssetModal'
import { Trash2, Link as LinkIcon, Upload, Star } from 'lucide-react'

export default function MediaTab({ entry, assets, onUpdated }: { entry: any, assets: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [urls, setUrls] = useState<Record<string, string>>({})
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

    useEffect(() => {
        const objectUrls: Record<string, string> = {}
        assets.forEach(a => {
            if (a.blob) objectUrls[a.id] = URL.createObjectURL(a.blob)
        })
        setUrls(objectUrls)

        return () => {
            Object.values(objectUrls).forEach(url => URL.revokeObjectURL(url))
        }
    }, [assets])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && activeNovelId) {
            await AssetService.uploadAsset(activeNovelId, file, entry.id)
            onUpdated()
        }
        e.target.value = ''
    }

    const handleUnlink = async (linkId: string) => {
        await db.assetLinks.where('id').equals(linkId).delete()
        onUpdated()
    }

    const setPrimary = async (linkId: string) => {
        if (!activeNovelId) return

        // Remove primary_portrait role from all existing links for this entry
        await db.assetLinks
            .where({ novelId: activeNovelId, targetId: entry.id })
            .filter(l => l.role === 'primary_portrait')
            .modify({ role: 'Reference' })

        // Set the chosen one to primary
        await db.assetLinks.update(linkId, { role: 'primary_portrait' })
        onUpdated()
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Media Gallery</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn outline" onClick={() => setIsLinkModalOpen(true)}>
                        <LinkIcon size={16} /> Link Existing Asset
                    </button>
                    <label className="btn primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> Upload New Asset
                        <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleUpload} />
                    </label>
                </div>
            </div>

            {assets.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No media attached.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {assets.map(a => {
                        const url = urls[a.id]
                        const isPrimary = a.linkRole === 'primary_portrait' || a.role === 'primary_portrait'

                        // We must fetch the linkId for unlinking. Typically AssetService groups these dynamically.
                        // Assuming AssetService.getLinkedAssets returned a mixed object: Asset & { linkId: string, linkRole: string }
                        return (
                            <div key={a.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: '150px', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                                    {isPrimary && (
                                        <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Star size={14} fill="white" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{a.linkRole || 'Reference'}</span>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            {!isPrimary && (
                                                <button className="icon-btn" onClick={() => setPrimary(a.linkId)} title="Set Primary"><Star size={14} /></button>
                                            )}
                                            <button className="icon-btn" style={{ color: 'var(--color-error)' }} onClick={() => handleUnlink(a.linkId)} title="Unlink"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <LinkAssetModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                entryId={entry.id}
                onLinked={() => { setIsLinkModalOpen(false); onUpdated(); }}
            />
        </div>
    )
}
