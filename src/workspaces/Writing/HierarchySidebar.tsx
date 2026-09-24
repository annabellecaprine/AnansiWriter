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
import { FileText, Folder, BookOpen, Layers, Target } from 'lucide-react'

// Recursive component to render the nested tree
function HierarchyTree({ nodes, depth = 0 }: { nodes: HierarchyNode[], depth?: number }) {
    const { activeSceneId, setActiveScene } = useWorkspaceStore()

    if (!nodes || nodes.length === 0) return null

    // For a basic implementation, we just make siblings sortable if we are at depth > 0,
    // but to keep it simple, we'll just render it read-only first to verify data flow, 
    // or wrap siblings in a SortableContext.

    return (
        <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
            <div className="hierarchy-list" style={{ marginLeft: depth > 0 ? '1rem' : '0' }}>
                {nodes.map(node => (
                    <SortableItem key={node.id} id={node.id} className={`hierarchy-node depth-${depth} ${activeSceneId === node.id ? 'active' : ''}`}>
                        <div
                            className="node-header"
                            onClick={() => node.type === 'Scene' ? setActiveScene(node.id) : null}
                        >
                            {node.type === 'Series' && <Layers size={16} />}
                            {node.type === 'Book' && <BookOpen size={16} />}
                            {node.type === 'Act' && <Target size={16} />}
                            {node.type === 'Chapter' && <Folder size={16} />}
                            {node.type === 'Scene' && <FileText size={16} />}
                            <span>{node.name}</span>
                        </div>
                        {/* Recursive Children Dropzone */}
                        {node.children && node.children.length > 0 && (
                            <HierarchyTree nodes={node.children} depth={depth + 1} />
                        )}
                    </SortableItem>
                ))}
            </div>
        </SortableContext>
    )
}

export default function HierarchySidebar() {
    const { activeProjectId } = useWorkspaceStore()
    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([])

    useEffect(() => {
        if (activeProjectId) {
            WritingService.getProjectHierarchy(activeProjectId).then(setHierarchy)
        }
    }, [activeProjectId])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = async (event: any) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        // Deep hierarchy drag-and-drop requires complex tree transformations.
        // For Phase 1B, flat sibling reordering is the immediate goal. 
        // We will expand on nested Reordering later.
        console.log(`Dragged ${active.id} over ${over.id}`)
    }

    return (
        <div className="hierarchy-sidebar">
            <div className="sidebar-header">
                <h3>Manuscript Explorer</h3>
            </div>
            <div className="hierarchy-content">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <HierarchyTree nodes={hierarchy} />
                </DndContext>
            </div>
        </div>
    )
}
