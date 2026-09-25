import { useWorkspaceStore } from '../../store/workspaceStore'
import HierarchySidebar from './HierarchySidebar'
import SceneEditor from './SceneEditor'

export default function WritingContainer() {
    const { activeNovelId, isLeftPaneOpen } = useWorkspaceStore()

    if (!activeNovelId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
                    Please open or create a project to start writing.
                </p>
            </div>
        )
    }

    return (
        <div className="writing-workspace" style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {isLeftPaneOpen && <HierarchySidebar />}
            <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                <SceneEditor />
            </div>
        </div>
    )
}
