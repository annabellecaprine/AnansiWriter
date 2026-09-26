import { useWorkspaceStore } from '../../store/workspaceStore'
import HierarchySidebar from './HierarchySidebar'
import SceneEditor from './SceneEditor'
import SprintHUD from '../../components/editor/SprintHUD'
import ReferenceSceneViewer from './ReferenceSceneViewer'
import GlobalSearchReplace from '../../components/editor/GlobalSearchReplace'
import { useEffect } from 'react'

export default function WritingContainer() {
    const { activeNovelId, isLeftPaneOpen, showSprintHUD, referenceSceneId, setReferenceScene, isSearchModalOpen, toggleSearchModal } = useWorkspaceStore()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault()
                toggleSearchModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [toggleSearchModal])

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
        <div className="writing-workspace" style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
            {isLeftPaneOpen && <HierarchySidebar />}
            <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
                <SceneEditor />
                {showSprintHUD && <SprintHUD />}
            </div>

            {referenceSceneId && (
                <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                    <ReferenceSceneViewer sceneId={referenceSceneId} onClose={() => setReferenceScene(null)} />
                </div>
            )}

            {isSearchModalOpen && (
                <GlobalSearchReplace onClose={toggleSearchModal} />
            )}
        </div>
    )
}
