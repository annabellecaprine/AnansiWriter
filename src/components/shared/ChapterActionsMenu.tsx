import { useRef, useEffect, useState } from 'react'
import { ArchiveService } from '../../services/ArchiveService'
import { confirmAction, promptInput } from '../../store/dialogStore'
import { db } from '../../db/database'
import { WritingService } from '../../services/WritingService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Plus, Trash2, Copy, Archive, ChevronRight, Wand2 } from 'lucide-react'

interface Props {
    chapterId: string
    anchorRef: React.RefObject<HTMLElement | null>
    onClose: () => void
    onReload?: () => void
}

export default function ChapterActionsMenu({ chapterId, anchorRef, onClose, onReload }: Props) {
    const { activeNovelId } = useWorkspaceStore()
    const menuRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const [showPromptSubmenu, setShowPromptSubmenu] = useState(false)
    const [prompts, setPrompts] = useState<any[]>([])

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect()
            setPos({ top: rect.bottom + 4, left: rect.left })
        }
    }, [anchorRef])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    useEffect(() => {
        if (activeNovelId) {
            db.prompts.where({ novelId: activeNovelId }).toArray().then((pList) => {
                setPrompts(pList.filter(p => !p.isTrashed))
            })
        }
    }, [activeNovelId])

    const handleAddScene = async () => {
        if (!activeNovelId) return
        const name = await promptInput({ title: 'Add Scene', placeholder: 'Scene title' })
        if (name) {
            await WritingService.createScene(activeNovelId, chapterId, name)
            onReload?.()
        }
        onClose()
    }

    const handleAddChapterBefore = async () => {
        if (!activeNovelId) return
        const chapter = await db.chapters.get(chapterId)
        if (!chapter) return
        const name = await promptInput({ title: 'Add Chapter Before', placeholder: 'Chapter title' })
        if (name) {
            const id = crypto.randomUUID()
            const now = Date.now()
            await db.chapters.add({
                id, novelId: activeNovelId, actId: chapter.actId,
                name, sortOrder: chapter.sortOrder - 0.5,
                createdAt: now, updatedAt: now
            })
            onReload?.()
        }
        onClose()
    }

    const handleAddChapterAfter = async () => {
        if (!activeNovelId) return
        const chapter = await db.chapters.get(chapterId)
        if (!chapter) return
        const name = await promptInput({ title: 'Add Chapter After', placeholder: 'Chapter title' })
        if (name) {
            const id = crypto.randomUUID()
            const now = Date.now()
            await db.chapters.add({
                id, novelId: activeNovelId, actId: chapter.actId,
                name, sortOrder: chapter.sortOrder + 0.5,
                createdAt: now, updatedAt: now
            })
            onReload?.()
        }
        onClose()
    }

    const handleCopyText = async () => {
        const scenes = await db.scenes.where({ chapterId }).sortBy('sortOrder')
        const getText = (node: any): string => {
            if (!node) return ''
            if (node.type === 'text') return node.text || ''
            if (node.content) return node.content.map(getText).join('')
            return ''
        }
        const text = scenes.map(s => `### ${s.name}\n\n${getText(s.content)}`).join('\n\n* * *\n\n')
        try { await navigator.clipboard.writeText(text) } catch { /* silently */ }
        onClose()
    }

    const handleTrash = async () => {
        const chapter = await db.chapters.get(chapterId)
        const ok = await confirmAction({
            title: 'Move Chapter to Trash',
            message: `Move "${chapter?.name || 'this chapter'}" and all its scenes to trash?`,
            isDestructive: true, confirmLabel: 'Move to Trash'
        })
        if (ok) {
            await db.chapters.update(chapterId, { isTrashed: true, updatedAt: Date.now() })
            const scenes = await db.scenes.where({ chapterId }).toArray()
            for (const s of scenes) {
                await ArchiveService.trashScene(s.id)
            }
            onReload?.()
        }
        onClose()
    }

    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 9000,
        minWidth: '200px',
        padding: '0.25rem 0',
        fontSize: '0.85rem',
    }

    const itemStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.45rem 0.85rem', cursor: 'pointer',
        color: 'var(--color-text)', whiteSpace: 'nowrap',
        transition: 'background 0.1s',
    }

    const divider = <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.25rem 0' }} />
    const label = (text: string) => <div style={{ padding: '0.2rem 0.85rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{text}</div>

    const MenuItem = ({ children, onClick, style, onMouseEnter, onMouseLeave }: any) => (
        <div
            style={{ ...itemStyle, ...style }}
            onClick={onClick}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-bg)'
                onMouseEnter?.(e)
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                onMouseLeave?.(e)
            }}
        >
            {children}
        </div>
    )

    return (
        <div ref={menuRef} style={menuStyle}>
            {label('Chapter Actions')}
            <MenuItem onClick={handleAddScene}><Plus size={14} /> Add Scene</MenuItem>
            <MenuItem onClick={handleAddChapterBefore}><Plus size={14} /> Add Chapter Before</MenuItem>
            <MenuItem onClick={handleAddChapterAfter}><Plus size={14} /> Add Chapter After</MenuItem>

            <MenuItem
                style={{ position: 'relative' }}
                onMouseEnter={() => setShowPromptSubmenu(true)}
                onMouseLeave={() => setShowPromptSubmenu(false)}
            >
                <Wand2 size={14} /> AI Actions <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                {showPromptSubmenu && (
                    <div style={{ ...menuStyle, top: 0, left: '100%', maxHeight: '220px', overflowY: 'auto' }}>
                        {prompts.filter(p => p.isEnabled !== false).map(p => (
                            <MenuItem key={p.id} onClick={() => {
                                console.log(`Execute prompt ${p.name} on chapter ${chapterId}`)
                                onClose()
                            }}>
                                {p.name}
                            </MenuItem>
                        ))}
                        {prompts.length === 0 && <div style={{ ...itemStyle, color: 'var(--color-text-muted)' }}>No active prompts</div>}
                    </div>
                )}
            </MenuItem>

            {divider}
            {label('Utilities')}
            <MenuItem onClick={handleCopyText}><Copy size={14} /> Copy Chapter Text</MenuItem>

            {divider}
            <MenuItem style={{ color: '#dc3545' }} onClick={handleTrash}><Trash2 size={14} /> Move to Trash</MenuItem>
        </div>
    )
}
