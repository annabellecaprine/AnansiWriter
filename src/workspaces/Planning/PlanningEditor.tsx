import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { ChevronLeft } from 'lucide-react'
import TipTapEditor from '../../components/editor/TipTapEditor'

export interface PlanningEditorProps {
    itemId: string;
    type: 'Series' | 'Novel' | 'Act' | 'Chapter' | 'Scene';
    onClose: () => void;
}

export default function PlanningEditor({ itemId, type, onClose }: PlanningEditorProps) {
    const [activeItem, setActiveItem] = useState<any>(null)

    useEffect(() => {
        loadItem()
    }, [itemId])

    const loadItem = async () => {
        if (!itemId) return

        let fetched: any = null
        if (type === 'Series') fetched = await db.series.get(itemId)
        else if (type === 'Novel') fetched = await db.novels.get(itemId)
        else if (type === 'Act') fetched = await db.acts.get(itemId)
        else if (type === 'Chapter') fetched = await db.chapters.get(itemId)
        else if (type === 'Scene') fetched = await db.scenes.get(itemId)

        setActiveItem(fetched)
    }

    const handleSave = async (json: object) => {
        if (!activeItem) return

        const type = activeItem.type
        if (type === 'Project' || type === 'Series') {
            return; // Series & Projects no longer carry native planning content maps
        } else if (type === 'Novel') {
            await db.novels.update(activeItem.id, { planningContent: json, updatedAt: Date.now() })
        } else if (type === 'Act') {
            await db.acts.update(activeItem.id, { planningContent: json, updatedAt: Date.now() })
        } else if (type === 'Chapter') {
            await db.chapters.update(activeItem.id, { planningContent: json, updatedAt: Date.now() })
        } else if (type === 'Scene') {
            await db.scenes.update(activeItem.id, { planningContent: json, updatedAt: Date.now() }) // scenes use planningContent dynamically from the object schema fallback
        }
    }

    return (
        <aside
            style={{
                width: '420px',
                background: 'var(--color-surface)',
                borderLeft: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0,
                boxShadow: '-4px 0 24px rgba(0,0,0,0.1)'
            }}
        >
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={onClose} className="btn" style={{ padding: '0.2rem 0.4rem' }}>
                    <ChevronLeft size={16} />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{type} Planning</div>
                    <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeItem?.title || activeItem?.name || 'Loading...'}
                    </h2>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--color-bg)' }}>
                {activeItem ? (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                        <TipTapEditor
                            content={activeItem.planningContent || {}}
                            onUpdate={(content: any) => handleSave(content)}
                            focusMode={false}
                        />
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading planner context...</div>
                )}
            </div>
        </aside>
    )
}
