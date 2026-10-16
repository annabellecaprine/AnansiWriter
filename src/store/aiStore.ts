import { create } from 'zustand'
import { AIWritableFieldCapability, AIFieldBookmark } from '../components/ai/AITypes'

interface AIStoreState {
    isHubOpen: boolean;
    activeCapability: AIWritableFieldCapability | null;
    activeBookmark: AIFieldBookmark | null;

    openHub: (capability: AIWritableFieldCapability) => void;
    closeHub: () => void;
}

export const useAIStore = create<AIStoreState>((set) => ({
    isHubOpen: false,
    activeCapability: null,
    activeBookmark: null,

    openHub: (capability) => {
        // We capture the selection immediately upon invocation before focus shifts to the modal.
        const bookmark = capability.captureSelection();
        set({
            isHubOpen: true,
            activeCapability: capability,
            activeBookmark: bookmark
        });
    },

    closeHub: () => set({ isHubOpen: false, activeCapability: null, activeBookmark: null })
}));
