import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
    activeProjectId: string | null
    setActiveProject: (id: string | null) => void
    activeSceneId: string | null
    setActiveScene: (id: string | null) => void
    isSidebarOpen: boolean
    toggleSidebar: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            activeProjectId: null,
            setActiveProject: (id) => set({ activeProjectId: id }),
            activeSceneId: null,
            setActiveScene: (id) => set({ activeSceneId: id }),
            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        }),
        {
            name: 'anansi-workspace-storage',
        }
    )
)

