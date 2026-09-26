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
    referenceSceneId: string | null
    setReferenceScene: (id: string | null) => void
    isSidebarOpen: boolean
    toggleSidebar: () => void
    isLeftPaneOpen: boolean
    toggleLeftPane: () => void
    isRightPaneOpen: boolean
    toggleRightPane: () => void
    isChatPaneOpen: boolean
    toggleChatPane: () => void

    showSprintHUD: boolean
    setShowSprintHUD: (show: boolean) => void

    isSearchModalOpen: boolean
    toggleSearchModal: () => void

    // Word Tracking & Sprints
    dailyWordCountStamp: string
    dailyWordCount: number
    dailyWordTarget: number
    setDailyWordTarget: (target: number) => void
    addDailyWords: (amount: number) => void

    sprintSecondsRemaining: number
    isSprintActive: boolean
    startSprint: (minutes: number) => void
    stopSprint: () => void
    tickSprint: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            activeSeriesId: null,
            setActiveSeries: (id) => set(state => state.activeSeriesId === id ? {} : {
                activeSeriesId: id,
                activeNovelId: null,
                activeActId: null,
                activeChapterId: null,
                activeSceneId: null
            }),
            activeNovelId: null,
            setActiveNovel: (id) => set(state => state.activeNovelId === id ? {} : {
                activeNovelId: id,
                activeActId: null,
                activeChapterId: null,
                activeSceneId: null
            }),
            activeActId: null,
            setActiveAct: (id) => set({ activeActId: id }),
            activeChapterId: null,
            setActiveChapter: (id) => set({ activeChapterId: id }),
            activeSceneId: null,
            setActiveScene: (id) => set({ activeSceneId: id }),
            referenceSceneId: null,
            setReferenceScene: (id) => set({ referenceSceneId: id }),
            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            isLeftPaneOpen: true,
            toggleLeftPane: () => set((state) => ({ isLeftPaneOpen: !state.isLeftPaneOpen })),
            isRightPaneOpen: false,
            toggleRightPane: () => set((state) => ({ isRightPaneOpen: !state.isRightPaneOpen })),
            isChatPaneOpen: false,
            toggleChatPane: () => set((state) => ({ isChatPaneOpen: !state.isChatPaneOpen })),

            showSprintHUD: true,
            setShowSprintHUD: (show) => set({ showSprintHUD: show }),

            isSearchModalOpen: false,
            toggleSearchModal: () => set((state) => ({ isSearchModalOpen: !state.isSearchModalOpen })),

            // Word Tracking & Sprints
            dailyWordCountStamp: new Date().toISOString().split('T')[0],
            dailyWordCount: 0,
            dailyWordTarget: 2000,
            setDailyWordTarget: (target) => set({ dailyWordTarget: target }),
            addDailyWords: (amount) => set((state) => {
                const today = new Date().toISOString().split('T')[0]
                if (state.dailyWordCountStamp !== today) {
                    return { dailyWordCountStamp: today, dailyWordCount: amount }
                }
                return { dailyWordCount: Math.max(0, state.dailyWordCount + amount) }
            }),

            sprintSecondsRemaining: 0,
            isSprintActive: false,
            startSprint: (minutes) => set({ isSprintActive: true, sprintSecondsRemaining: minutes * 60 }),
            stopSprint: () => set({ isSprintActive: false, sprintSecondsRemaining: 0 }),
            tickSprint: () => set((state) => {
                if (!state.isSprintActive) return {}
                const next = state.sprintSecondsRemaining - 1
                if (next <= 0) return { isSprintActive: false, sprintSecondsRemaining: 0 }
                return { sprintSecondsRemaining: next }
            }),
        }),
        {
            name: 'anansi-workspace-storage',
        }
    )
)

