import { Heading1, Heading2, Heading3, Quote, Space, Minus, FilePlus, Wand2 } from 'lucide-react'
import { db } from '../../db/database'
import { promptInput } from '../../store/dialogStore'
import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'

interface Props {
    query: string
    onSelect: (command: string) => void
    onClose: () => void
    sceneId: string
}

export default function SlashCommandMenu({ query, onSelect, onClose, sceneId }: Props) {
    const { activeNovelId } = useWorkspaceStore()
    const [prompts, setPrompts] = useState<any[]>([])

    useEffect(() => {
        if (activeNovelId) {
            db.prompts.where({ novelId: activeNovelId }).toArray().then(p => {
                setPrompts(p.filter(x => !x.isTrashed && x.isEnabled !== false))
            })
        }
    }, [activeNovelId])

    const defaultOptions = [
        { id: 'scene-break', name: 'Scene Break (* * *)', icon: <Space size={14} />, group: 'Structure' },
        { id: 'h1', name: 'Heading 1', icon: <Heading1 size={14} />, group: 'Structure' },
        { id: 'h2', name: 'Heading 2', icon: <Heading2 size={14} />, group: 'Structure' },
        { id: 'h3', name: 'Heading 3', icon: <Heading3 size={14} />, group: 'Structure' },
        { id: 'quote', name: 'Quote Block', icon: <Quote size={14} />, group: 'Structure' },
        { id: 'hr', name: 'Horizontal Rule', icon: <Minus size={14} />, group: 'Structure' },
        { id: 'note', name: 'Add Note', icon: <FilePlus size={14} />, group: 'Notes' },
        ...prompts.map(p => ({
            id: `prompt-${p.id}`,
            name: p.name,
            icon: <Wand2 size={14} />,
            group: 'AI Actions',
            isPrompt: true,
            promptData: p
        }))
    ]

    const filtered = defaultOptions.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))

    const handleSelect = async (id: string) => {
        if (id === 'note') {
            onSelect('clear-slash') // just clear the slash
            const noteText = await promptInput({ title: 'Add Scene Note', placeholder: 'Note content...' })
            if (noteText) {
                const scene = await db.scenes.get(sceneId)
                if (scene) {
                    const notes = Array.isArray(scene.notes) ? scene.notes : (typeof scene.notes === 'string' && scene.notes.length ? [scene.notes] : [])
                    await db.scenes.update(sceneId, { notes: [...notes, noteText], updatedAt: Date.now() })
                }
            }
        } else if (id.startsWith('prompt-')) {
            onSelect('clear-slash')
            // Fire specific prompt logic handler
            console.log("Execute Prompt", id)
        } else {
            onSelect(id)
        }
        onClose()
    }

    if (filtered.length === 0) return null

    // Grouping
    const groups = filtered.reduce((acc, curr) => {
        if (!acc[curr.group]) acc[curr.group] = []
        acc[curr.group].push(curr)
        return acc
    }, {} as Record<string, typeof defaultOptions>)

    return (
        <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
            width: '240px',
            maxHeight: '300px',
            overflowY: 'auto'
        }}>
            {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                    <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-bg)' }}>
                        {group}
                    </div>
                    {items.map(o => (
                        <div
                            key={o.id}
                            className="slash-menu-item"
                            onClick={() => handleSelect(o.id)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'var(--color-text)',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div style={{ color: 'var(--color-text-muted)', display: 'flex' }}>{o.icon}</div>
                            {o.name}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
