import { useState, useEffect, useRef } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { promptInput } from '../../store/dialogStore'
import { useNavigate } from 'react-router-dom'
import { MapPin, User, Plus, Edit3, FolderPlus, GripVertical, MoreHorizontal, History } from 'lucide-react'
import { WritingService } from '../../services/WritingService'
import { ArchiveService } from '../../services/ArchiveService'
import SceneActionsMenu from '../../components/shared/SceneActionsMenu'
import ChapterActionsMenu from '../../components/shared/ChapterActionsMenu'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PlanningEditor from './PlanningEditor'

function SceneCard({ scene, charactersMap, onClick, onReload, disableDrag = false }: { scene: any; charactersMap: Record<string, string>; onClick: () => void; onReload?: () => void; disableDrag?: boolean }) {
    if (disableDrag) {
        return <SceneCardUI scene={scene} charactersMap={charactersMap} onClick={onClick} onReload={onReload} disableDrag={true} />
    }
    return <SceneCardDraggable scene={scene} charactersMap={charactersMap} onClick={onClick} onReload={onReload} />
}

function SceneCardDraggable({ scene, charactersMap, onClick, onReload }: { scene: any; charactersMap: Record<string, string>; onClick: () => void; onReload?: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: scene.id,
        data: { type: 'Scene' }
    })
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

    return <SceneCardUI scene={scene} charactersMap={charactersMap} onClick={onClick} onReload={onReload} setNodeRef={setNodeRef} style={style} attributes={attributes} listeners={listeners} />
}

function SceneCardUI({ scene, charactersMap, onClick, onReload, disableDrag = false, setNodeRef, style = {}, attributes = {}, listeners = {} }: any) {

    const [summaryText, setSummaryText] = useState(scene.summary || '')
    const [showActionsMenu, setShowActionsMenu] = useState(false)
    const actionsButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        setSummaryText(scene.summary || '')
    }, [scene.summary])

    const handleSummaryBlur = async () => {
        if (summaryText !== scene.summary) {
            await db.scenes.update(scene.id, { summary: summaryText, updatedAt: Date.now() })
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                minHeight: '80px',
                position: 'relative'
            }}
            className="scene-card"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: 1 }}>
                    {!disableDrag && (
                        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-muted)', marginTop: '0.1rem', display: 'flex', alignItems: 'center' }}>
                            <GripVertical size={14} />
                        </div>
                    )}
                    <strong style={{ fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.2 }}>{scene.name}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {typeof scene.timelineStart === 'number' && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--color-accent-transparent)', color: 'var(--color-accent)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 600 }} title="Timeline Bound">
                            {scene.timelineLabel || (scene.timelineEnd ? `${scene.timelineStart} - ${scene.timelineEnd}` : scene.timelineStart)}
                        </span>
                    )}
                    <span style={{ fontSize: '0.65rem', background: 'var(--color-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--color-text-muted)' }}>
                        {scene.wordCount || 0} w
                    </span>
                    <button className="icon-btn" onClick={onClick} style={{ padding: '0.1rem' }} title="Open In Editor">
                        <Edit3 size={12} />
                    </button>
                    <button ref={actionsButtonRef} className="icon-btn" onClick={() => setShowActionsMenu(v => !v)} style={{ padding: '0.1rem' }} title="Scene Actions">
                        <MoreHorizontal size={12} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {scene.povCharacterId && charactersMap[scene.povCharacterId] && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--color-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="POV Character">
                            <span style={{ fontWeight: 600, color: 'var(--color-accent)', marginRight: '-0.1rem' }}>POV</span>
                            <User size={10} color="var(--color-accent)" /> {charactersMap[scene.povCharacterId]}
                        </span>
                    )}
                    {scene.cast && scene.cast.length > 0 && scene.cast.filter((id: string) => id !== scene.povCharacterId).map((cId: string) => {
                        if (!charactersMap[cId]) return null
                        return (
                            <span key={cId} style={{ fontSize: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Cast Member">
                                <User size={10} color="var(--color-accent)" /> {charactersMap[cId]}
                            </span>
                        )
                    })}
                    {scene.location && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--color-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Location">
                            <MapPin size={10} /> {scene.location}
                        </span>
                    )}
                    {scene.status && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Status">
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: scene.status === 'Idea' ? '#6c757d' : scene.status === 'Planned' ? '#17a2b8' : scene.status === 'Draft' ? '#fd7e14' : scene.status === 'Revised' ? '#ffc107' : scene.status === 'Edited' ? '#20c997' : scene.status === 'Final' ? '#28a745' : '#ccc' }} />
                            {scene.status}
                        </span>
                    )}
                </div>
            </div>

            <textarea
                className="scene-summary-input"
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                onBlur={(e) => {
                    handleSummaryBlur()
                    e.target.style.border = '1px solid transparent'
                    e.target.style.background = 'transparent'
                }}
                placeholder="Draft a brief summary..."
                style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.4rem',
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid transparent',
                    resize: 'none',
                    lineHeight: 1.4,
                    minHeight: '60px',
                    fontFamily: 'inherit',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    outline: 'none',
                    overflow: 'hidden',
                    transition: 'all var(--transition-fast)'
                }}
                onFocus={(e) => {
                    e.target.style.border = '1px solid var(--color-border)'
                    e.target.style.background = 'var(--color-bg)'
                }}
                onKeyDown={(e) => {
                    e.stopPropagation()
                }}
            />

            {showActionsMenu && (
                <SceneActionsMenu
                    sceneId={scene.id}
                    chapterId={scene.chapterId}
                    anchorRef={actionsButtonRef}
                    onClose={() => setShowActionsMenu(false)}
                    onReload={onReload}
                    onOpenInspector={() => onClick()}
                />
            )}
        </div>
    )
}

function ChapterColumn({ chapter, scenes, charactersMap, onSceneClick, onAddScene, onEditChapter, onReload }: { chapter: any; scenes: any[]; charactersMap: Record<string, string>; onSceneClick: (s: any) => void; onAddScene?: () => void; onEditChapter?: () => void; onReload?: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: chapter.id,
        data: { type: 'Chapter' }
    })
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
    const [showActionsMenu, setShowActionsMenu] = useState(false)
    const actionsButtonRef = useRef<HTMLButtonElement>(null)

    return (
        <div ref={setNodeRef} style={{
            ...style,
            width: '100%',
            background: 'var(--color-bg)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <div
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3
                        style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, cursor: onEditChapter ? 'pointer' : 'default' }}
                        onClick={onEditChapter}
                        title={onEditChapter ? "Chapter Planning Notes" : ""}
                    >
                        {chapter.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{scenes.length} Scenes</span>
                        <button ref={actionsButtonRef} className="icon-btn" onClick={() => setShowActionsMenu(v => !v)} style={{ padding: '0.1rem' }} title="Chapter Actions">
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>
            </div>
            {showActionsMenu && (
                <ChapterActionsMenu
                    chapterId={chapter.id}
                    anchorRef={actionsButtonRef}
                    onClose={() => setShowActionsMenu(false)}
                    onReload={onReload}
                />
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {scenes.map(s => (
                        <SceneCard key={s.id} scene={s} charactersMap={charactersMap} onClick={() => onSceneClick(s)} onReload={onReload} />
                    ))}
                </SortableContext>
                {scenes.length === 0 && (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                        Drop scenes here
                    </div>
                )}
                {onAddScene && (
                    <button className="btn outline" onClick={onAddScene} style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', justifyContent: 'center' }}>
                        <Plus size={14} style={{ marginRight: '0.5rem' }} /> Add Scene
                    </button>
                )}
            </div>
        </div>
    )
}

export default function PlanningDashboard() {
    const { activeNovelId, setActiveScene, setActiveChapter, setActiveAct } = useWorkspaceStore()
    const navigate = useNavigate()
    const [chapters, setChapters] = useState<any[]>([])
    const [scenes, setScenes] = useState<any[]>([])
    const [acts, setActs] = useState<any[]>([])
    const [books, setBooks] = useState<any[]>([])
    const [charactersMap, setCharactersMap] = useState<Record<string, string>>({})
    const [inspectedItem, setInspectedItem] = useState<{ id: string, type: 'Chapter' | 'Scene' | 'Act' } | null>(null)
    const [isArchiveOpen, setIsArchiveOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'Kanban' | 'Timeline'>('Kanban')

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const loadData = async () => {
        if (!activeNovelId) return
        const bk = await db.novels.get(activeNovelId)
        const ac = await db.acts.where({ novelId: activeNovelId }).sortBy('sortOrder')
        const ch = await db.chapters.where({ novelId: activeNovelId }).sortBy('sortOrder')
        const sc = await db.scenes.where({ novelId: activeNovelId }).sortBy('sortOrder')

        const entries = await db.bibleEntries.where({ novelId: activeNovelId }).toArray()
        const map: Record<string, string> = {}
        entries.forEach(e => { if (e.type?.toLowerCase() === 'character') map[e.id] = e.name })

        setCharactersMap(map)
        setBooks(bk ? [bk] : [])
        setActs(ac)

        // Final filter for scenes (no trashed ones at all)
        setScenes(sc.filter((s: any) => !s.isTrashed))
        setChapters(ch.filter((c: any) => !c.isTrashed))
    }

    useEffect(() => { loadData() }, [activeNovelId])

    if (!activeNovelId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>Please open a project to load Kanban planner.</p>
            </div>
        )
    }

    const handleDragOver = (event: any) => {
        const { active, over } = event
        if (!over) return

        if (active.data.current?.type === 'Chapter') {
            const draggedChapter = chapters.find(c => c.id === active.id)
            if (!draggedChapter) return

            const overId = over.id
            const overChapter = chapters.find(c => c.id === overId)

            let targetActId: string | null = null
            if (overChapter) targetActId = overChapter.actId || null

            if (targetActId !== null && draggedChapter.actId !== targetActId) {
                setChapters(prev => {
                    const newChaps = [...prev]
                    const idx = newChaps.findIndex(c => c.id === draggedChapter.id)
                    newChaps[idx] = { ...draggedChapter, actId: targetActId }
                    return newChaps
                })
            }
            return
        }

        const draggedScene = scenes.find(s => s.id === active.id)
        if (!draggedScene) return

        const overId = over.id
        const isOverChapter = chapters.find(c => c.id === overId) || overId === 'unassigned'
        const overScene = scenes.find(s => s.id === overId)

        let targetChapterId = overScene ? overScene.chapterId : (isOverChapter ? overId : null)

        if (targetChapterId && draggedScene.chapterId !== targetChapterId) {
            setScenes(prev => {
                const newScenes = [...prev]
                const index = newScenes.findIndex(s => s.id === draggedScene.id)
                newScenes[index] = { ...draggedScene, chapterId: targetChapterId }
                return newScenes
            })
        }
    }

    const handleDragEnd = async (event: any) => {
        const { active, over } = event
        if (!over) return

        if (active.data.current?.type === 'Chapter') {
            const oldIndex = chapters.findIndex(c => c.id === active.id)
            const newIndex = chapters.findIndex(c => c.id === over.id)
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newChapters = [...chapters]
                const dragged = newChapters.splice(oldIndex, 1)[0]
                newChapters.splice(newIndex, 0, dragged)

                const targetActId = chapters.find(c => c.id === over.id)?.actId
                if (dragged.actId !== targetActId) {
                    dragged.actId = targetActId
                    await db.chapters.update(dragged.id, { actId: targetActId })
                }
                setChapters(newChapters)
                for (let i = 0; i < newChapters.length; i++) {
                    if (newChapters[i].actId === targetActId) {
                        await WritingService.updateSortOrder('Chapter', newChapters[i].id, i)
                    }
                }
            }
            return
        }

        const draggedScene = scenes.find(s => s.id === active.id)
        if (!draggedScene) return

        const overId = over.id
        const isOverChapter = chapters.find(c => c.id === overId) || overId === 'unassigned'
        const overScene = scenes.find(s => s.id === overId)

        let targetChapterId = overScene ? overScene.chapterId : (isOverChapter ? overId : null)
        if (!targetChapterId) return

        const activeScenes = scenes.filter(s => !s.isArchived)
        const oldIndex = activeScenes.findIndex(s => s.id === active.id)
        let newIndex = activeScenes.findIndex(s => s.id === over.id)
        if (newIndex === -1 && isOverChapter) {
            newIndex = activeScenes.length
        }

        const newScenes = [...activeScenes]
        newScenes.splice(oldIndex, 1)
        newScenes.splice(newIndex, 0, draggedScene)

        // Merging back with archived
        setScenes([...newScenes, ...scenes.filter(s => s.isArchived)])

        let resolvedChapterId = targetChapterId === 'unassigned' ? '' : targetChapterId
        if (draggedScene.chapterId !== resolvedChapterId) {
            await db.scenes.update(draggedScene.id, { chapterId: resolvedChapterId, updatedAt: Date.now() })
        }

        const filtered = newScenes.filter(s => s.chapterId === targetChapterId)
        for (let i = 0; i < filtered.length; i++) {
            await WritingService.updateSortOrder('Scene', filtered[i].id, i)
        }
    }

    const handleCreateAct = async () => {
        if (!activeNovelId || books.length === 0) return
        const name = await promptInput({ title: 'New Act', message: 'Enter Act Name' })
        if (name) {
            const actId = await WritingService.createAct(activeNovelId, name)
            const newAct = await db.acts.get(actId)
            if (newAct) setActs(prev => [...prev, newAct])
        }
    }

    const handleCreateChapter = async (actId?: string) => {
        if (!activeNovelId) return
        const name = await promptInput({ title: 'New Chapter', message: 'Enter Chapter Name' })
        if (name) {
            const chapterId = await WritingService.createChapter(activeNovelId, name, actId)
            const newChapter = await db.chapters.get(chapterId)
            if (newChapter) setChapters(prev => [...prev, newChapter])
        }
    }

    const handleCreateScene = async (chapterId: string) => {
        if (!activeNovelId) return
        const name = await promptInput({ title: 'New Scene', message: 'Enter Scene Name' })
        if (name) {
            await WritingService.createScene(activeNovelId, chapterId, name)
            loadData()
        }
    }

    const activeScenes = scenes.filter(s => !s.isArchived)
    const archivedScenes = scenes.filter(s => s.isArchived)

    const unassignedScenes = activeScenes.filter(s => !s.chapterId || !chapters.find(c => c.id === s.chapterId))
    const unassignedChapters = chapters.filter(c => !c.actId)

    return (
        <div className="workspace-view" style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', maxWidth: 'none', margin: 0, height: '100%' }}>
            <header className="workspace-header" style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Kanban Storyboard</h1>
                    <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        Drag cards to restructure your chapters. Click a card to open it within the Context Scratchpad.
                    </div>
                </div>

                <div style={{ display: 'flex', background: 'var(--color-bg)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <button
                        className="btn"
                        style={{
                            fontSize: '0.8rem', padding: '0.35rem 0.75rem', border: 'none',
                            background: viewMode === 'Kanban' ? 'var(--color-surface)' : 'transparent',
                            color: viewMode === 'Kanban' ? 'var(--color-text)' : 'var(--color-text-muted)',
                            fontWeight: viewMode === 'Kanban' ? 600 : 400
                        }}
                        onClick={() => setViewMode('Kanban')}
                    >
                        Kanban Grid
                    </button>
                    <button
                        className="btn"
                        style={{
                            fontSize: '0.8rem', padding: '0.35rem 0.75rem', border: 'none',
                            background: viewMode === 'Timeline' ? 'var(--color-surface)' : 'transparent',
                            color: viewMode === 'Timeline' ? 'var(--color-text)' : 'var(--color-text-muted)',
                            fontWeight: viewMode === 'Timeline' ? 600 : 400
                        }}
                        onClick={() => setViewMode('Timeline')}
                    >
                        Chronology Timeline
                    </button>
                </div>
            </header>

            {viewMode === 'Kanban' ? (
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--color-bg)', padding: '1.5rem', alignContent: 'flex-start' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', paddingBottom: '2rem' }}>
                            {acts.map(act => (
                                <div key={act.id} style={{ display: 'flex', flexDirection: 'column', width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px dashed var(--color-border)' }}>
                                        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: 'var(--color-accent)', cursor: 'pointer' }} onClick={async () => {
                                            const newName = await promptInput({ title: 'Rename Act', defaultValue: act.name });
                                            if (newName && newName !== act.name) {
                                                await db.acts.update(act.id, { name: newName, updatedAt: Date.now() });
                                                loadData();
                                            }
                                        }} title="Click to rename Act">{act.name}</h2>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn" onClick={() => setInspectedItem({ id: act.id, type: 'Act' })} title="Act Planning Notes"><Edit3 size={14} /></button>
                                            <button className="btn outline" onClick={() => handleCreateChapter(act.id)}><FolderPlus size={14} style={{ marginRight: '0.5rem' }} /> Add Chapter</button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', width: '100%', padding: '0.5rem' }}>
                                        <SortableContext items={chapters.filter(c => c.actId === act.id).map(c => c.id)} strategy={rectSortingStrategy}>
                                            {chapters.filter(c => c.actId === act.id).map(ch => (
                                                <ChapterColumn
                                                    key={ch.id}
                                                    chapter={ch}
                                                    scenes={activeScenes.filter(s => s.chapterId === ch.id)}
                                                    charactersMap={charactersMap}
                                                    onSceneClick={(s) => {
                                                        setActiveAct(s.actId || null)
                                                        setActiveChapter(s.chapterId || null)
                                                        setActiveScene(s.id)
                                                        navigate(`/novel/${activeNovelId}/write`)
                                                    }}
                                                    onAddScene={() => handleCreateScene(ch.id)}
                                                    onEditChapter={() => setInspectedItem({ id: ch.id, type: 'Chapter' })}
                                                    onReload={loadData}
                                                />
                                            ))}
                                        </SortableContext>
                                        {chapters.filter(c => c.actId === act.id).length === 0 && (
                                            <div style={{ gridColumn: '1 / -1', padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                No chapters in this act.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', width: '100%', marginTop: acts.length > 0 ? '2rem' : '0' }}>
                            <SortableContext items={unassignedChapters.map(c => c.id)} strategy={rectSortingStrategy}>
                                {unassignedChapters.map(ch => (
                                    <ChapterColumn
                                        key={ch.id}
                                        chapter={ch}
                                        scenes={activeScenes.filter(s => s.chapterId === ch.id)}
                                        charactersMap={charactersMap}
                                        onSceneClick={(s) => {
                                            setActiveAct(s.actId || null)
                                            setActiveChapter(s.chapterId || null)
                                            setActiveScene(s.id)
                                            navigate(`/novel/${activeNovelId}/write`)
                                        }}
                                        onAddScene={() => handleCreateScene(ch.id)}
                                        onEditChapter={() => setInspectedItem({ id: ch.id, type: 'Chapter' })}
                                        onReload={loadData}
                                    />
                                ))}
                            </SortableContext>

                            {unassignedScenes.length > 0 && (
                                <ChapterColumn
                                    chapter={{ id: 'unassigned', name: 'Unassigned Scenes' }}
                                    scenes={unassignedScenes}
                                    charactersMap={charactersMap}
                                    onSceneClick={(s) => {
                                        setActiveAct(s.actId || null)
                                        setActiveChapter(s.chapterId || null)
                                        setActiveScene(s.id)
                                        navigate(`/novel/${activeNovelId}/write`)
                                    }}
                                    onReload={loadData}
                                />
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                <button className="btn primary" onClick={() => handleCreateAct()} style={{ padding: '1rem', justifyContent: 'center' }}>
                                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> Create New Act
                                </button>
                                <button className="btn outline" onClick={() => handleCreateChapter()} style={{ padding: '1rem', justifyContent: 'center' }}>
                                    <FolderPlus size={16} style={{ marginRight: '0.5rem' }} /> Create Loose Chapter
                                </button>
                            </div>
                        </div>
                    </DndContext>

                    {/* Archived Scenes Section */}
                    <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', paddingBottom: '3rem' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                        >
                            <History size={16} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Archived Scenes ({archivedScenes.length})</span>
                        </div>
                        {isArchiveOpen && archivedScenes.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                {archivedScenes.map(scene => (
                                    <div key={scene.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', opacity: 0.8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{scene.name}</div>
                                            <button
                                                className="btn outline"
                                                style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}
                                                onClick={async () => {
                                                    await ArchiveService.restoreScene(scene.id)
                                                    loadData()
                                                }}
                                            >
                                                Restore
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                                            {scene.summary || 'No summary'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isArchiveOpen && archivedScenes.length === 0 && (
                            <div style={{ marginTop: '1rem', padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                No archived scenes.
                            </div>
                        )}
                    </div>

                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden', background: 'var(--color-bg)', padding: '2rem', gap: '2rem', alignItems: 'center' }}>
                    {activeScenes.filter(s => typeof s.timelineStart === 'number').sort((a, b) => (a.timelineStart as number) - (b.timelineStart as number)).map(s => (
                        <div key={s.id} style={{ width: '300px', flexShrink: 0, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '-2rem', right: '-2rem', height: '2px', background: 'var(--color-border)', zIndex: 0 }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <SceneCard
                                    scene={s}
                                    charactersMap={charactersMap}
                                    onClick={() => {
                                        setActiveAct(s.actId || null)
                                        setActiveChapter(s.chapterId || null)
                                        setActiveScene(s.id)
                                        navigate(`/novel/${activeNovelId}/write`)
                                    }}
                                    onReload={loadData}
                                    disableDrag={true}
                                />
                            </div>
                        </div>
                    ))}
                    {activeScenes.filter(s => typeof s.timelineStart !== 'number').length > 0 && (
                        <div style={{ padding: '2rem', minWidth: '300px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            {activeScenes.filter(s => typeof s.timelineStart !== 'number').length} unmapped scenes. <br /><br /> Use the Beats properties tab within the Scene Inspector to assign Temporal Bounds to remaining scenes.
                        </div>
                    )}
                </div>
            )}

            {inspectedItem && (
                <PlanningEditor
                    itemId={inspectedItem.id}
                    type={inspectedItem.type}
                    onClose={() => setInspectedItem(null)}
                />
            )
            }
        </div >
    )
}
