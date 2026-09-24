import { useWorkspaceStore } from '../../store/workspaceStore'
import HierarchySidebar from './HierarchySidebar'
import SceneEditor from './SceneEditor'

export default function WritingContainer() {
    const { activeProjectId } = useWorkspaceStore()

    if (!activeProjectId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
                    Please open or create a project to start writing.
                </p>
            </div>
        )
    }

    return (
        <div className="writing-workspace" style={{ display: 'flex', height: '100%', width: '100%' }}>
            <HierarchySidebar />

            <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
                <div style={{ maxWidth: '800px', width: '100%', background: 'var(--color-surface)', minHeight: '800px', padding: '4rem', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid var(--color-border)' }}>
                    <SceneEditor />
                </div>
            </div>
        </div>
    )
}
