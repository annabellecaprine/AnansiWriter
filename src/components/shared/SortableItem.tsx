import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItemProps {
    id: string
    children: React.ReactNode
    className?: string
    isDraggingClass?: string
}

export function SortableItem({ id, children, className = '', isDraggingClass = '' }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`${className} ${isDragging ? isDraggingClass : ''}`}
        >
            {children}
        </div>
    )
}
