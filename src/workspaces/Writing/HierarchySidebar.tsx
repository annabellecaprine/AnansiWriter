import { useEffect, useState } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { WritingService, type HierarchyNode } from '../../services/WritingService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { SortableItem } from '../../components/shared/SortableItem'
import { db } from '../../db/database'
import { FileText, Folder, BookOpen, Layers, Target, Plus, Trash2, Edit2 } from 'lucide-react'

export default function HierarchySidebar() {
    const { activeProjectId, activeSceneId, setActiveScene } = useWorkspaceStore()
    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([])
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const refreshHierarchy = () => {
        if (activeProjectId) {
            WritingService.getProjectHierarchy(activeProjectId).then(setHierarchy)
        }
    }

    useEffect(() => {
        refreshHierarchy()
    }, [activeProjectId, activeSceneId])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleCreateChapter = async () => {
        if (!activeProjectId) return
        const books = await db.books.where({ projectId: activeProjectId }).toArray()
        if (books.length === 0) {
            alert("Please create a Book first in the Project workspace.")
            return
        }
        const name = prompt("New Chapter Name:", "New Chapter")
        if (name) {
            await WritingService.createChapter(activeProjectId, books[0].id, name)
            refreshHierarchy()
        }
    }

    const handleCreateScene = async (chapterId: string) => {
        if (!activeProjectId) return
        const name = prompt("New Scene Name:", "New Scene")
        if (name) {
            const newSceneId = await WritingService.createScene(activeProjectId, chapterId, name)
            setActiveScene(newSceneId)
            refreshHierarchy()
        }
    }

    const handleDelete = async (type: 'Act' | 'Chapter' | 'Scene', id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${type} "${name}"?`)) {
            await WritingService.deleteEntity(type, id)
            if (activeSceneId === id) setActiveScene('')
            refreshHierarchy()
        }
    }

    const handleStartRename = (id: string, currentName: string) => {
        setEditingNodeId(id)
        setEditName(currentName)
    }

    const handleSaveRename = async (type: 'Act' | 'Chapter' | 'Scene', id: string) => {
        if (editName.trim()) {
            await WritingService.renameEntity(type, id, editName.trim())
            setEditingNodeId(null)
            refreshHierarchy()
        }
    }

    const handleDragEnd = async (event: any) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        console.log(`Reordering ${active.id} -> ${over.id}`)
        // Update order in Dexie if required
        refreshHierarchy()
    }

    const renderNode = (node: HierarchyNode, depth = 0) => {
        const isSelected = activeSceneId === node.id
        const isEditing = editingNodeId === node.id

        return (
            <SortableItem key={node.id} id={node.id} className={`hierarchy-node depth-${depth} ${isSelected ? 'active' : ''}`}>
                <div
                    className="node-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                    onClick={() => node.type === 'Scene' ? setActiveScene(node.id) : null}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, overflow: 'hidden' }}>
                        {node.type === 'Series' && <Layers size={14} color="var(--color-primary)" />}
                        {node.type === 'Book' && <BookOpen size={14} color="#17a2b8" />}
                        {node.type === 'Act' && <Target size={14} color="#ffc107" />}
                        {node.type === 'Chapter' && <Folder size={14} color="#fd7e14" />}
                        {node.type === 'Scene' && <FileText size={14} color="var(--color-text)" />}

                        {isEditing ? (
                            <input
                                type="text"
                                className="input"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveRename(node.type as any, node.id)}
                                onBlur={() => handleSaveRename(node.type as any, node.id)}
                                autoFocus
                                style={{ fontSize: '0.8rem', padding: '0.1rem 0.3rem', width: '100%' }}
                            />
                        ) : (
                            <span style={{ fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {node.name}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Word Count Badge */}
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {node.wordCount.toLocaleString()} w
                        </span>

                        {/* Action buttons */}
                        {node.type === 'Chapter' && (
                            <button
                                className="btn"
                                onClick={(e) => { e.stopPropagation(); handleCreateScene(node.id) }}
                                style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem' }}
                                title="Add Scene to Chapter"
                                aria-label="Add Scene"
                            >
                                <Plus size={12} />
                            </button>
                        )}

                        {(node.type === 'Chapter' || node.type === 'Scene' || node.type === 'Act') && (
                            <>
                                <button
                                    className="btn"
                                    onClick={(e) => { e.stopPropagation(); handleStartRename(node.id, node.name) }}
                                    style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}
                                    title="Rename"
                                    aria-label="Rename"
                                >
                                    <Edit2 size={11} />
                                </button>
                                <button
                                    className="btn"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(node.type as any, node.id, node.name) }}
                                    style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: '#dc3545' }}
                                    title="Delete"
                                    aria-label="Delete"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Children recursive rendering */}
                {node.children && node.children.length > 0 && (
                    <div style={{ marginLeft: '0.8rem', borderLeft: '1px dashed var(--color-border)', paddingLeft: '0.3rem', marginTop: '0.2rem' }}>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </SortableItem>
        )
    }

    return (
        <aside
            style={{
                width: '300px',
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0
            }}
            aria-label="Manuscript Hierarchy Sidebar"
        >
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Manuscript Explorer</h3>
                <button
                    className="btn primary"
                    onClick={handleCreateChapter}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Add Chapter to Book"
                    aria-label="Add Chapter"
                >
                    <Plus size={13} /> + Chapter
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
                {hierarchy.length === 0 ? (
                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        No manuscript structure found. Click <strong>+ Chapter</strong> to begin organizing your novel.
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={hierarchy.map(n => n.id)} strategy={verticalListSortingStrategy}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                {hierarchy.map(node => renderNode(node))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </aside>
    )
}
