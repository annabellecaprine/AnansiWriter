import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { db } from '../../db/database'
import { AIChatService } from '../../services/AIChatService'
import { AIChatThread } from '../../db/schema'
import { X, MessageSquare, Plus, Archive, Pin, Trash2, Send, Layers, Loader2 } from 'lucide-react'
import ContextPickerModal from './ContextPickerModal'
import { AIService } from '../../services/AIService'
import { confirmAction, confirmAlert } from '../../store/dialogStore'

export default function MasterChatOverlay() {
    const { isChatPaneOpen, toggleChatPane, activeNovelId } = useWorkspaceStore()
    const [activeThreads, setActiveThreads] = useState<AIChatThread[]>([])
    const [archivedThreads, setArchivedThreads] = useState<AIChatThread[]>([])
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [showContextPicker, setShowContextPicker] = useState(false)
    const [chatInput, setChatInput] = useState('')
    const [selectedContext, setSelectedContext] = useState<{ type: string, id: string, name: string }[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const activeThread = activeThreads.find(t => t.id === selectedThreadId)

    // Ensure we load threads whenever novel or pane toggles
    useEffect(() => {
        if (!isChatPaneOpen || !activeNovelId) return

        let mounted = true
        Promise.all([
            AIChatService.getActiveThreads(activeNovelId),
            AIChatService.getArchivedThreads(activeNovelId)
        ]).then(([active, archived]) => {
            if (mounted) {
                setActiveThreads(active)
                setArchivedThreads(archived)
                // If opening panel with nothing selected, select first active or none
                if (!selectedThreadId && active.length > 0) {
                    setSelectedThreadId(active[0].id)
                }
            }
        })
        return () => { mounted = false }
    }, [isChatPaneOpen, activeNovelId, selectedThreadId])

    if (!isChatPaneOpen) return null

    const handleNewChat = async () => {
        if (!activeNovelId) return
        const id = await AIChatService.createThread(activeNovelId, 'default-model', 'New Chat')
        setSelectedThreadId(id)
        const updated = await AIChatService.getActiveThreads(activeNovelId)
        setActiveThreads(updated)
    }

    const handleSend = async () => {
        if (!chatInput.trim() || !selectedThreadId || !activeNovelId || isGenerating) return

        setIsGenerating(true)
        const msg = chatInput
        setChatInput('')

        await AIChatService.addMessage(selectedThreadId, 'user', msg)
        setActiveThreads(await AIChatService.getActiveThreads(activeNovelId))

        const thread = await AIChatService.getThread(selectedThreadId)
        if (!thread) {
            setIsGenerating(false)
            return
        }

        try {
            let systemInstruction = "You are a helpful creative writing assistant."
            if (selectedContext.length > 0) {
                systemInstruction += "\n\nContext to consider:"
                const ext = (n: any): string => {
                    if (!n) return ''
                    if (typeof n === 'string') return n
                    if (n.type === 'text' && n.text) return n.text
                    if (Array.isArray(n)) return n.map(ext).join(' ')
                    if (n.content) return ext(n.content)
                    return ''
                }
                for (const c of selectedContext) {
                    if (c.type === 'Scene') {
                        const scene = await db.scenes.get(c.id)
                        systemInstruction += `\n\n[Scene: ${c.name}]\n${scene ? ext(scene.content) : ''}`
                    } else if (c.type === 'Chapter') {
                        const scenes = await db.scenes.where('chapterId').equals(c.id).sortBy('sortOrder')
                        systemInstruction += `\n\n[Chapter: ${c.name}]\n${scenes.map(s => ext(s.content)).join('\n\n')}`
                    } else {
                        const entry = await db.bibleEntries.get(c.id)
                        systemInstruction += `\n\n[${c.type}: ${c.name}]\n${entry?.description || ''}`
                    }
                }
            }

            const messagesForAi = [
                { role: 'system' as 'system' | 'user' | 'assistant', content: systemInstruction },
                ...thread.messages
            ]

            const response = await AIService.generate(
                activeNovelId,
                systemInstruction,
                msg,
                thread.modelId || 'proxy',
                'proxy',
                selectedThreadId,
                undefined,
                undefined,
                messagesForAi
            )

            await AIChatService.addMessage(selectedThreadId, 'assistant', response)
            setActiveThreads(await AIChatService.getActiveThreads(activeNovelId))
        } catch (e: any) {
            console.error(e)
            await confirmAlert({
                title: 'Inference Error',
                message: `AI Inference failed: ${e.message}`,
                isDestructive: true
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0,
            width: '400px',
            background: 'var(--color-surface)',
            borderLeft: '1px solid var(--color-border)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={16} color="var(--color-accent)" />
                    AI Chat
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn outline" onClick={handleNewChat} style={{ padding: '0.3rem 0.5rem' }} title="New Chat">
                        <Plus size={14} />
                    </button>
                    <button className="btn" onClick={toggleChatPane} style={{ padding: '0.3rem 0.5rem' }} aria-label="Close Chat">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Threads Sidebar */}
                <div style={{ width: '120px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
                    <div style={{ padding: '0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeThreads.map(t => (
                            <div
                                key={t.id}
                                onClick={() => setSelectedThreadId(t.id)}
                                style={{
                                    padding: '0.5rem',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    background: selectedThreadId === t.id ? 'var(--color-surface)' : 'transparent',
                                    borderLeft: selectedThreadId === t.id ? '3px solid var(--color-accent)' : '3px solid transparent',
                                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                                }}>
                                {t.isPinned && <Pin size={10} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />}
                                {t.title}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {selectedThreadId ? (
                        <>
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <input
                                        value={activeThread?.title || ''}
                                        onChange={(e) => {
                                            AIChatService.updateThread(selectedThreadId, { title: e.target.value })
                                            setActiveThreads(activeThreads.map(t => t.id === selectedThreadId ? { ...t, title: e.target.value } : t))
                                        }}
                                        style={{ fontSize: '1rem', fontWeight: 600, background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', width: '100%' }}
                                        placeholder="Chat Title..."
                                    />
                                    <button className="btn outline" onClick={async () => {
                                        const confirmed = await confirmAction({
                                            title: 'Delete AI Thread',
                                            message: 'Delete this AI Thread permanently?',
                                            isDestructive: true
                                        });
                                        if (confirmed) {
                                            await AIChatService.deleteThread(selectedThreadId)
                                            setSelectedThreadId(null)
                                            if (activeNovelId) {
                                                setActiveThreads(await AIChatService.getActiveThreads(activeNovelId))
                                            }
                                        }
                                    }} style={{ padding: '0.2rem', color: 'var(--color-error)' }} title="Delete Thread">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <textarea
                                    value={activeThread?.description || ''}
                                    onChange={(e) => {
                                        AIChatService.updateThread(selectedThreadId, { description: e.target.value })
                                        setActiveThreads(activeThreads.map(t => t.id === selectedThreadId ? { ...t, description: e.target.value } : t))
                                    }}
                                    placeholder="Add a description or note about this chat..."
                                    title="Chat Thread Descriptor Constraint"
                                    style={{ width: '100%', fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', outline: 'none', resize: 'none', height: '30px', marginTop: '0.5rem' }}
                                />
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {activeThread?.messages.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Thread started</p>
                                ) : (
                                    activeThread?.messages.map((m, idx) => (
                                        <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textAlign: m.role === 'user' ? 'right' : 'left', textTransform: 'uppercase' }}>{m.role}</div>
                                            <div style={{
                                                background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg)',
                                                color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                                                padding: '0.6rem 0.8rem',
                                                borderRadius: 'var(--radius-md)',
                                                borderBottomRightRadius: m.role === 'user' ? 0 : 'var(--radius-md)',
                                                borderBottomLeftRadius: m.role === 'assistant' ? 0 : 'var(--radius-md)',
                                                fontSize: '0.85rem',
                                                lineHeight: 1.5,
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {m.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isGenerating && (
                                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                                        <Loader2 size={14} className="spin" /> Generating...
                                    </div>
                                )}
                            </div>
                            <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.75rem', background: 'var(--color-surface)' }}>
                                {selectedContext.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                        {selectedContext.map(c => (
                                            <span key={c.id} className="chip">
                                                {c.name}
                                                <button className="icon-btn" style={{ padding: '0.1rem', margin: '-0.1rem' }} onClick={() => setSelectedContext(px => px.filter(x => x.id !== c.id))}>
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <button
                                        className="btn outline"
                                        onClick={() => setShowContextPicker(true)}
                                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                                        title="Attach Context"
                                    >
                                        <Layers size={16} color="var(--color-text-muted)" />
                                    </button>
                                    <div style={{ flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                        <textarea
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Message AI..."
                                            style={{ border: 'none', background: 'transparent', resize: 'none', height: '60px', color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                            <button className="btn primary" onClick={handleSend} disabled={!chatInput.trim() || isGenerating} style={{ padding: '0.2rem 0.5rem' }}>
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '1rem' }}>
                            <MessageSquare size={32} opacity={0.5} />
                            <span>Select or Create a Chat</span>
                        </div>
                    )}
                </div>
            </div>

            {showContextPicker && activeNovelId && (
                <ContextPickerModal
                    novelId={activeNovelId}
                    initialSelection={selectedContext}
                    onClose={() => setShowContextPicker(false)}
                    onContextSelected={setSelectedContext}
                />
            )}
        </div>
    )
}
