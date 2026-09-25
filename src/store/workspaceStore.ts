import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
    activeSeriesId: string | null
    setActiveSeries: (id: string | null) => void
    activeNovelId: string | null
    setActiveNovel: (id: string | null) => void
    activeActId: string | null
    setActiveAct: (id: string | null) => void
    activeChapterId: string | null
    setActiveChapter: (id: string | null) => void
    activeSceneId: string | null
    setActiveScene: (id: string | null) => void
    isSidebarOpen: boolean
    toggleSidebar: () => void
    isLeftPaneOpen: boolean
    toggleLeftPane: () => void
    isRightPaneOpen: boolean
    toggleRightPane: () => void
    isChatPaneOpen: boolean
    toggleChatPane: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            activeSeriesId: null,
            setActiveSeries: (id) => set({ activeSeriesId: id }),
            activeNovelId: null,
            setActiveNovel: (id) => set({ activeNovelId: id }),
            activeActId: null,
            setActiveAct: (id) => set({ activeActId: id }),
            activeChapterId: null,
            setActiveChapter: (id) => set({ activeChapterId: id }),
            activeSceneId: null,
            setActiveScene: (id) => set({ activeSceneId: id }),
            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            isLeftPaneOpen: true,
            toggleLeftPane: () => set((state) => ({ isLeftPaneOpen: !state.isLeftPaneOpen })),
            isRightPaneOpen: false,
            toggleRightPane: () => set((state) => ({ isRightPaneOpen: !state.isRightPaneOpen })),
            isChatPaneOpen: false,
            toggleChatPane: () => set((state) => ({ isChatPaneOpen: !state.isChatPaneOpen })),
        }),
        {
            name: 'anansi-workspace-storage',
        }
    )
)

