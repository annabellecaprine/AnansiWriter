import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveService } from '../../services/ArchiveService'
import { confirmAction } from '../../store/dialogStore'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import {
    Copy, Archive, Trash2, RotateCcw, MoveRight, FilePlus2, ChevronRight, Wand2, Search
} from 'lucide-react'

interface Props {
    sceneId: string
    anchorRef: React.RefObject<HTMLElement | null>
    onClose: () => void
    onOpenInspector?: (tab?: 'beats' | 'revisions') => void
    onReload?: () => void
    onDetectLinks?: () => void
    chapterId?: string
}

interface ChapterOption {
    id: string
    name: string
}

export default function SceneActionsMenu({ sceneId, anchorRef, onClose, onOpenInspector, onReload, onDetectLinks, chapterId }: Props) {
    const { activeNovelId } = useWorkspaceStore()
    const navigate = useNavigate()
    const menuRef = useRef<HTMLDivElement>(null)
    const [showMoveSubmenu, setShowMoveSubmenu] = useState(false)
    const [showPromptSubmenu, setShowPromptSubmenu] = useState(false)
    const [chapters, setChapters] = useState<ChapterOption[]>([])
    const [prompts, setPrompts] = useState<any[]>([])

    // Position menu under anchor
    const [pos, setPos] = useState({ top: 0, left: 0 })
    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect()
            setPos({ top: rect.bottom + 4, left: rect.left })
        }
    }, [anchorRef])

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    // Load chapters and prompts
    useEffect(() => {
        if (activeNovelId) {
            Promise.all([
                db.chapters.where({ novelId: activeNovelId }).toArray(),
                db.prompts.where({ novelId: activeNovelId }).toArray()
            ]).then(([cList, pList]) => {
                setChapters(cList)
                setPrompts(pList.filter(p => !p.isTrashed))
            })
        }
    }, [activeNovelId])

    const handleCopyText = async () => {
        const scene = await db.scenes.get(sceneId)
        if (!scene) return
        const getText = (node: any): string => {
            if (!node) return ''
            if (node.type === 'text') return node.text || ''
            if (node.content) return node.content.map(getText).join('')
            return ''
        }
        try {
            await navigator.clipboard.writeText(getText(scene.content))
        } catch { /* fallback silently */ }
        onClose()
    }

    const handleDuplicate = async () => {
        await ArchiveService.duplicateScene(sceneId)
        onReload?.()
        onClose()
    }

    const handleArchive = async () => {
        const ok = await confirmAction({ title: 'Archive Scene', message: 'Remove this scene from the active manuscript? It will be preserved in the archived section.' })
        if (ok) {
            await ArchiveService.archiveScene(sceneId)
            onReload?.()
            onClose()
        }
    }

    const handleTrash = async () => {
        const ok = await confirmAction({ title: 'Move to Trash', message: 'Move this scene to trash? It can be restored later.', isDestructive: true, confirmLabel: 'Move to Trash' })
        if (ok) {
            await ArchiveService.trashScene(sceneId)
            onReload?.()
            onClose()
        }
    }

    const handleMove = async (targetChapterId: string) => {
        await db.scenes.update(sceneId, { chapterId: targetChapterId, updatedAt: Date.now() })
        onReload?.()
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
            {label('Scene Actions')}
            <MenuItem onClick={() => { onOpenInspector?.('beats'); onClose() }}>
                <FilePlus2 size={14} /> Edit Metadata
            </MenuItem>
            <MenuItem onClick={() => { onOpenInspector?.('revisions'); onClose() }}>
                <RotateCcw size={14} /> View Revisions
            </MenuItem>

            {divider}
            {label('Codex')}
            <MenuItem onClick={() => { onDetectLinks?.(); onClose(); }}>
                <Search size={14} /> Detect Entities
            </MenuItem>

            {divider}
            {label('Organize')}
            <MenuItem
                style={{ position: 'relative' }}
                onMouseEnter={() => setShowMoveSubmenu(true)}
                onMouseLeave={() => setShowMoveSubmenu(false)}
            >
                <MoveRight size={14} /> Move to Chapter <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                {showMoveSubmenu && (
                    <div style={{ ...menuStyle, top: 0, left: '100%', maxHeight: '220px', overflowY: 'auto' }}>
                        {chapters.filter(c => c.id !== chapterId).map(c => (
                            <MenuItem key={c.id} onClick={() => handleMove(c.id)}>{c.name}</MenuItem>
                        ))}
                        {chapters.length <= 1 && <div style={{ ...itemStyle, color: 'var(--color-text-muted)' }}>No other chapters</div>}
                    </div>
                )}
            </MenuItem>

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
                                // Real implementation would hand this off to the LLM store
                                console.log(`Execute prompt ${p.name} on scene ${sceneId}`)
                                onClose()
                            }}>
                                {p.name}
                            </MenuItem>
                        ))}
                        {prompts.length === 0 && <div style={{ ...itemStyle, color: 'var(--color-text-muted)' }}>No active prompts</div>}
                    </div>
                )}
            </MenuItem>
            <MenuItem onClick={handleDuplicate}>
                <Copy size={14} /> Duplicate Scene
            </MenuItem>

            {divider}
            {label('Utilities')}
            <MenuItem onClick={handleCopyText}>
                <Copy size={14} /> Copy Text
            </MenuItem>
            <MenuItem onClick={handleArchive}>
                <Archive size={14} /> Archive Scene
            </MenuItem>

            {divider}
            <MenuItem style={{ color: '#dc3545' }} onClick={handleTrash}>
                <Trash2 size={14} /> Move to Trash
            </MenuItem>
        </div>
    )
}
