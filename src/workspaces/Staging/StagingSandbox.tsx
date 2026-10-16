import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { MessageSquare, Save, RotateCcw, Crosshair, ArrowRightCircle, FolderOpen, GitBranch, Plus, X, Check } from 'lucide-react'
import { AIService } from '../../services/AIService'
import ContextPreview from '../../components/ContextPreview'
import { ContextEngine, type ContextAssembly } from '../../services/ai/ContextEngine'
import { StagingService } from '../../services/StagingService'
import type { StagingMessage, StagingSession, EntityState, Prompt } from '../../db/schema'
import { confirmAlert, confirmAction } from '../../store/dialogStore'

export default function StagingSandbox() {
    const { activeNovelId } = useWorkspaceStore()
    const [history, setHistory] = useState<StagingMessage[]>([])
    const [activeLeafId, setActiveLeafId] = useState<string | null>(null)
    const [input, setInput] = useState('')
    const [assemblyCache, setAssemblyCache] = useState<ContextAssembly | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [models, setModels] = useState<any[]>([])
    const [selectedModel, setSelectedModel] = useState<{ id: string, provider: string } | null>(null)

    // Session Management State
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [sessionName, setSessionName] = useState<string>('')
    const [savedSessions, setSavedSessions] = useState<StagingSession[]>([])
    const [showSessionPicker, setShowSessionPicker] = useState<boolean>(false)

    // Character State
    const [characterId, setCharacterId] = useState<string>('')
    const [characters, setCharacters] = useState<any[]>([])

    // Selection & Branching
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
    const [branchBanner, setBranchBanner] = useState<string | null>(null)

    // Promotion Modal State
    const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false)
    const [promoteEntryId, setPromoteEntryId] = useState<string>('')
    const [promoteFieldKey, setPromoteFieldKey] = useState<string>('')
    const [promoteValue, setPromoteValue] = useState<string>('')
    const [promoteState, setPromoteState] = useState<EntityState>('Drafted')
    const [allBibleEntries, setAllBibleEntries] = useState<any[]>([])

    useEffect(() => {
        if (!activeNovelId) return
        db.bibleEntries.where({ novelId: activeNovelId }).and(b => !b.isTrashed).toArray().then(entries => {
            setAllBibleEntries(entries)
            const chars = entries.filter(e => e.type === 'Character')
            setCharacters(chars)
            if (chars.length > 0 && !characterId) {
                setCharacterId(chars[0].id)
            }
        })
        db.aiModels.where({ novelId: activeNovelId }).filter(m => !!m.isEnabled).toArray().then(setModels)
        StagingService.listSessions(activeNovelId).then(setSavedSessions)
    }, [activeNovelId])

    useEffect(() => {
        if (!characterId) return
        const fetchPreferences = async () => {
            const prefs = await db.fieldValues.where({ entryId: characterId }).toArray()
            const modelPref = prefs.find(f => f.fieldKey === 'STAGING_MODEL_ID')
            const provPref = prefs.find(f => f.fieldKey === 'STAGING_PROVIDER')

            if (modelPref && provPref) {
                setSelectedModel({ id: modelPref.value, provider: provPref.value })
            } else {
                setSelectedModel(null)
            }
        }
        fetchPreferences()
    }, [characterId])

    const setCharacterModel = async (modelId: string) => {
        const model = models.find(m => m.modelId === modelId)
        if (!model) return
        setSelectedModel({ id: model.modelId, provider: model.provider })

        const prefs = await db.fieldValues.where({ entryId: characterId }).toArray()
        let mPref = prefs.find(f => f.fieldKey === 'STAGING_MODEL_ID')
        let pPref = prefs.find(f => f.fieldKey === 'STAGING_PROVIDER')

        const now = Date.now()
        if (mPref) {
            await db.fieldValues.update(mPref.id, { value: model.modelId, updatedAt: now })
        } else {
            const { v4: uuidv4 } = await import('uuid')
            await db.fieldValues.add({ id: uuidv4(), novelId: activeNovelId!, entryId: characterId, fieldKey: 'STAGING_MODEL_ID', value: model.modelId, state: 'Canon', validFrom: null, validUntil: null, provenance: [], createdAt: now, updatedAt: now })
        }

        if (pPref) {
            await db.fieldValues.update(pPref.id, { value: model.provider, updatedAt: now })
        } else {
            const { v4: uuidv4 } = await import('uuid')
            await db.fieldValues.add({ id: uuidv4(), novelId: activeNovelId!, entryId: characterId, fieldKey: 'STAGING_PROVIDER', value: model.provider, state: 'Canon', validFrom: null, validUntil: null, provenance: [], createdAt: now, updatedAt: now })
        }
    }

    // AW-02 & AW-01: Shared real context assembly with real eligible fields
    const constructContext = async () => {
        if (!activeNovelId || !characterId) {
            setAssemblyCache(null)
            return
        }
        try {
            const stagingPrompt: Prompt = {
                id: 'staging-interview-ephemeral',
                novelId: activeNovelId,
                name: 'Character Interview',
                scope: 'novel',
                categoryId: 'staging',
                tags: ['staging'],
                description: 'Non-canon staging interview prompt',
                outputMode: 'chat',
                defaultModel: selectedModel?.id || 'anthropic/claude-3-haiku',
                allowedModels: [],
                applicableFields: [],
                presets: [],
                contextRecipe: [],
                systemInstruction: 'You are playing the role of {{character}}. Respond directly in their voice. This is a non-canon staging sandbox.',
                userTemplate: '{{input}}',
                inputs: [
                    { name: 'character', kind: 'context', type: 'CharacterState', isRequired: true },
                    { name: 'input', kind: 'manual', defaultValue: '', isRequired: false }
                ],
                tokenBudget: 35000,
                temperature: 0.7,
                maxOutputTokens: 2000,
                isFavorite: false,
                isEnabled: true,
                isTrashed: false,
                createdAt: 0,
                updatedAt: 0
            }

            const assembly = await ContextEngine.assemble(
                stagingPrompt,
                null,
                { input: '' },
                [characterId], // Pin selected character
                []
            )
            setAssemblyCache(assembly)
        } catch (e) {
            console.error('Failed to construct staging context', e)
        }
    }

    useEffect(() => { constructContext() }, [characterId, activeNovelId])

    const activePath = StagingService.getActivePath(history, activeLeafId)

    const submitChat = async () => {
        if (!input.trim() || !activeNovelId || !assemblyCache) return

        const userText = input
        setInput('')
        setIsLoading(true)

        try {
            // Append user turn to branchable history tree
            const { message: userMsg, newHistory: historyWithUser } = StagingService.addMessage(
                history,
                'user',
                userText,
                activeLeafId
            )

            // Linear trajectory for this branch
            const currentPath = StagingService.getActivePath(historyWithUser, userMsg.id)
            const priorHistoryContext = currentPath.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

            const runModel = selectedModel?.id || (models.length > 0 ? models[0].modelId : 'anthropic/claude-3-haiku')
            const runProvider = selectedModel?.provider || (models.length > 0 ? models[0].provider : 'openrouter')

            const responseText = await AIService.generate(
                activeNovelId,
                assemblyCache.assembledSystemInstruction,
                `${priorHistoryContext}\n\nCHARACTER:`,
                runModel,
                runProvider,
                characterId
            )

            // Append character response as child of user turn
            const { message: charMsg, newHistory: finalHistory } = StagingService.addMessage(
                historyWithUser,
                'Character',
                responseText,
                userMsg.id
            )

            setHistory(finalHistory)
            setActiveLeafId(charMsg.id)
            setSelectedMessageId(charMsg.id)
            setBranchBanner(null)
        } catch (e: any) {
            await confirmAlert({
                title: 'Staging Fault',
                message: `Staging fault: ${e.message}`,
                isDestructive: true
            })
        } finally {
            setIsLoading(false)
        }
    }

    // AW-04: Save Session
    const handleSaveSession = async () => {
        if (!activeNovelId || !characterId || !assemblyCache) return
        const char = characters.find(c => c.id === characterId)
        const defaultName = sessionName.trim() || `Interview with ${char?.name || 'Character'}`

        try {
            const id = await StagingService.saveSession({
                id: currentSessionId || undefined,
                novelId: activeNovelId,
                name: defaultName,
                characterId,
                modelId: selectedModel?.id,
                provider: selectedModel?.provider,
                contextSnapshot: assemblyCache,
                history
            })
            setCurrentSessionId(id)
            setSessionName(defaultName)
            const updated = await StagingService.listSessions(activeNovelId)
            setSavedSessions(updated)
            await confirmAlert({
                title: 'Session Saved',
                message: `Staging session "${defaultName}" saved successfully with ${history.length} messages.`
            })
        } catch (e: any) {
            await confirmAlert({
                title: 'Save Failed',
                message: e.message,
                isDestructive: true
            })
        }
    }

    // AW-04: Reopen Session
    const handleReopenSession = async (session: StagingSession) => {
        setCurrentSessionId(session.id)
        setSessionName(session.name)
        if (session.metadata.characterId) setCharacterId(session.metadata.characterId)
        if (session.metadata.modelId) {
            setSelectedModel({ id: session.metadata.modelId, provider: session.metadata.userRole || 'openrouter' })
        }
        if (session.context) setAssemblyCache(session.context as ContextAssembly)
        setHistory(session.history || [])
        const lastId = session.history && session.history.length > 0 ? session.history[session.history.length - 1].id : null
        setActiveLeafId(lastId)
        setSelectedMessageId(lastId)
        setBranchBanner(null)
        setShowSessionPicker(false)
    }

    // AW-04: Branch Node
    const handleBranchNode = () => {
        const targetId = selectedMessageId || activeLeafId
        if (!targetId || history.length === 0) {
            confirmAlert({
                title: 'Branching Staging Node',
                message: 'Select a message or start a conversation first to branch from a specific point.'
            })
            return
        }

        try {
            const { branchId, activeLeafId: newLeaf } = StagingService.branchFromMessage(history, targetId)
            setActiveLeafId(newLeaf)
            const targetMsg = history.find(m => m.id === targetId)
            setBranchBanner(`Branched from ${targetMsg?.role.toUpperCase()}: "${targetMsg?.content.slice(0, 40)}..." (Branch ID: ${branchId})`)
        } catch (e: any) {
            confirmAlert({
                title: 'Branch Error',
                message: e.message,
                isDestructive: true
            })
        }
    }

    // AW-04: Promote Insight
    const handleOpenPromote = () => {
        if (!selectedMessageId && activePath.length === 0) {
            confirmAlert({
                title: 'No Message Selected',
                message: 'Send a message or select an AI discovery turn to promote to the Codex.'
            })
            return
        }

        const msgToPromote = history.find(m => m.id === (selectedMessageId || activeLeafId))
        setPromoteEntryId(characterId || (characters[0]?.id ?? ''))
        setPromoteFieldKey('Staging Insight')
        setPromoteValue(msgToPromote?.content || '')
        setPromoteState('Drafted') // Never automatically Canon!
        setShowPromoteModal(true)
    }

    const handleConfirmPromote = async () => {
        if (!activeNovelId || !promoteEntryId || !promoteFieldKey.trim() || !promoteValue.trim()) {
            await confirmAlert({
                title: 'Incomplete Promotion',
                message: 'Destination entry, field key, and content cannot be empty.',
                isDestructive: true
            })
            return
        }

        const confirmed = await confirmAction({
            title: 'Confirm Insight Promotion',
            message: `Promote this discovery to Codex as state "${promoteState}"? ${promoteState === 'Canon' ? 'Note: You have explicitly chosen Canon.' : 'This will remain non-canon until explicitly promoted.'}`
        })
        if (!confirmed) return

        try {
            await StagingService.promoteInsight({
                novelId: activeNovelId,
                entryId: promoteEntryId,
                fieldKey: promoteFieldKey,
                value: promoteValue,
                state: promoteState,
                provenance: {
                    stagingSessionId: currentSessionId || 'ephemeral-session',
                    branchId: branchBanner || undefined,
                    messageId: selectedMessageId || activeLeafId || 'root',
                    promotionTarget: 'BibleEntry'
                }
            })
            setShowPromoteModal(false)
            await confirmAlert({
                title: 'Insight Promoted',
                message: `Successfully captured fact "${promoteFieldKey}" under state "${promoteState}" with full Staging provenance.`
            })
        } catch (e: any) {
            await confirmAlert({
                title: 'Promotion Failed',
                message: e.message,
                isDestructive: true
            })
        }
    }

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100%', overflow: 'hidden' }}>

            {/* Sidebar Context Maps & Controls */}
            <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <div className="surface-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Crosshair size={18} /> Non-Canon Sandbox</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 1rem 0' }}>
                        Experiments here do not affect your manuscript or canon without explicit promotion.
                    </p>

                    <label htmlFor="target-character" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Target Character / Role</label>
                    <select id="target-character" aria-label="Select Target Character" value={characterId} onChange={e => setCharacterId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <label htmlFor="target-model" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Execution Model</label>
                    <select id="target-model" aria-label="Select Target Model" value={selectedModel?.id || ''} onChange={e => setCharacterModel(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                        {models.map(m => <option key={m.id} value={m.modelId}>{m.name} ({m.provider})</option>)}
                        {!models.length && <option value="">No Active Models...</option>}
                    </select>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <button className="btn" onClick={handleSaveSession} style={{ flex: 1, background: 'var(--color-surface-hover)' }} title="Save current staging session">
                            <Save size={15} /> Save Session
                        </button>
                        <button className="btn outline" onClick={() => setShowSessionPicker(true)} style={{ padding: '0.5rem' }} title="Load saved session">
                            <FolderOpen size={15} />
                        </button>
                    </div>

                    <button className="btn" onClick={handleBranchNode} style={{ width: '100%', background: 'var(--color-surface-hover)' }} title="Branch conversation from selected message">
                        <GitBranch size={15} /> Branch Node
                    </button>
                </div>

                <ContextPreview assembly={assemblyCache} />
            </div>

            {/* Chat Tree */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>

                <header style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ margin: 0 }}>{sessionName || 'Interview Session'}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {activePath.length} turns in active path ({history.length} total nodes)
                        </span>
                    </div>
                    <button className="btn primary" onClick={handleOpenPromote} style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowRightCircle size={16} /> Promote Insight
                    </button>
                </header>

                {branchBanner && (
                    <div style={{ background: 'var(--color-surface-hover)', padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <GitBranch size={14} /> {branchBanner}
                        </span>
                        <button className="icon-btn" onClick={() => setBranchBanner(null)}><X size={12} /></button>
                    </div>
                )}

                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activePath.length === 0 && (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                            Sandbox initialized with canon-eligible character context. Send a message to begin.
                        </p>
                    )}
                    {activePath.map((m) => {
                        const isSelected = selectedMessageId === m.id
                        return (
                            <div
                                key={m.id}
                                onClick={() => setSelectedMessageId(m.id)}
                                style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg)',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    maxWidth: '80%',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid var(--color-accent)' : '1px solid transparent',
                                    transition: 'border 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                    <strong style={{ fontSize: '0.75rem', color: m.role === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
                                        {m.role.toUpperCase()}
                                    </strong>
                                    {isSelected && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.5rem' }}>
                                            <Check size={10} /> Active Target
                                        </span>
                                    )}
                                </div>
                                <span style={{ whiteSpace: 'pre-wrap', color: m.role === 'user' ? '#fff' : 'var(--color-text)' }}>
                                    {m.content}
                                </span>
                            </div>
                        )
                    })}
                    {isLoading && <div style={{ alignSelf: 'flex-start', padding: '1rem', color: 'var(--color-warning)' }}>Synthesizing cognitive branch...</div>}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', background: 'var(--color-bg)' }}>
                    <textarea
                        id="chat-input"
                        aria-label="Chat Input Box"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Interject prompt..."
                        style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', resize: 'none', height: '60px' }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
                    />
                    <button className="btn primary" aria-label="Submit Message" onClick={submitChat} disabled={isLoading || !input.trim()}>
                        <MessageSquare size={18} />
                    </button>
                </div>

            </div>

            {/* Saved Sessions Picker Modal */}
            {showSessionPicker && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--color-surface)', width: '450px', maxHeight: '500px', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Saved Staging Sessions</h3>
                            <button className="icon-btn" onClick={() => setShowSessionPicker(false)}><X size={16} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {savedSessions.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No saved sessions yet.</p>
                            ) : (
                                savedSessions.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => handleReopenSession(s)}
                                        style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {s.history?.length || 0} messages • {new Date(s.updatedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button className="btn outline" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Open</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Explicit Insight Promotion Modal */}
            {showPromoteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--color-surface)', width: '500px', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Promote Insight to Codex</h3>
                            <button className="icon-btn" onClick={() => setShowPromoteModal(false)}><X size={16} /></button>
                        </div>

                        <div style={{ background: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-accent)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Non-canon staging insights require explicit promotion. Promoted content is not marked Canon unless you explicitly select Canon.
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Destination Bible Entry</label>
                            <select
                                value={promoteEntryId}
                                onChange={e => setPromoteEntryId(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                            >
                                {allBibleEntries.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Field Key / Attribute Name</label>
                            <input
                                value={promoteFieldKey}
                                onChange={e => setPromoteFieldKey(e.target.value)}
                                placeholder="e.g. Backstory, Secret, Voice Trait"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Promoted Fact Value</label>
                            <textarea
                                value={promoteValue}
                                onChange={e => setPromoteValue(e.target.value)}
                                style={{ width: '100%', height: '80px', padding: '0.5rem', borderRadius: '4px', resize: 'vertical' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Canonical Entity State</label>
                            <select
                                value={promoteState}
                                onChange={e => setPromoteState(e.target.value as EntityState)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                            >
                                <option value="Drafted">Drafted (Recommended - Non-Canon)</option>
                                <option value="Planned">Planned (Future Outline)</option>
                                <option value="Canon">Canon (Confirmed Narrative Fact)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button className="btn outline" onClick={() => setShowPromoteModal(false)}>Cancel</button>
                            <button className="btn primary" onClick={handleConfirmPromote}>Promote to Codex</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
