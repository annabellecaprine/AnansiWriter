import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { X } from 'lucide-react'
import TipTapEditor from '../../components/editor/TipTapEditor'
import { WritingService } from '../../services/WritingService'

interface Props {
    sceneId: string
    onClose: () => void
}

export default function ReferenceSceneViewer({ sceneId, onClose }: Props) {
    const { activeNovelId } = useWorkspaceStore()
    const [sceneName, setSceneName] = useState('Loading...')
    const [content, setContent] = useState<any>(null)

    useEffect(() => {
        let mounted = true
        db.scenes.get(sceneId).then(s => {
            if (!mounted || !s) return
            setSceneName(s.name || 'Untitled')
            setContent(s.content || { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] })
        })
        return () => { mounted = false }
    }, [sceneId])

    const handleUpdate = async (json: any) => {
        const textNodes = (node: any): string => {
            if (!node) return ''
            if (node.type === 'text') return node.text || ''
            if (node.content) return node.content.map(textNodes).join('')
            return ''
        }
        const text = textNodes(json)
        const wordCount = text.split(/\s+/).filter(Boolean).length
        await WritingService.updateSceneContent(sceneId, json, wordCount)
    }

    if (!content) return null

    return (
        <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <header style={{
                height: '48px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                background: 'var(--color-surface)'
            }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>Reference</span>
                    {sceneName}
                </div>
                <button className="btn" onClick={onClose} style={{ padding: '0.2rem', color: 'var(--color-text-muted)' }} title="Close Split Pane">
                    <X size={16} />
                </button>
            </header>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <TipTapEditor
                    content={content}
                    onUpdate={handleUpdate}
                    focusMode={false}
                />
            </div>
        </div>
    )
}
