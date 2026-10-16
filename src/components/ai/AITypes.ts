import { AIWritableFieldKind } from '../../db/schema'

export interface AIFieldBookmark {
    id: string; // Internal identifier for the bookmark instance
    from: number;
    to: number;
    contextType: AIWritableFieldKind;
    // For TipTap, could hold raw selection data if numeric isn't enough, but from/to numbers strictly work for most TipTap transactions.
    // For raw TextAreas, from/to are standard HTML selectionStart/End.
    meta?: any;
}

export interface AIFieldConstraints {
    targetLengthWords?: number;
    maxOutputWords?: number;
    toneConstraints?: string;
    description?: string; // e.g. "This is a Scene Summary with approximately 200 words factual constraint."
}

export interface AIWritableFieldCapability {
    kind: AIWritableFieldKind;
    contextEntityId?: string;

    // Grabs active internal selection indices before rendering an overlay, preventing focus loss.
    captureSelection(): AIFieldBookmark | null;

    // Returns exact strings represented by the specified Bookmark bounds.
    getSelectedText(bookmark: AIFieldBookmark): string | null;

    // Destructively executes the output replacement back into the specific element natively (firing undo/redo tracking appropriately!)
    applyResult(bookmark: AIFieldBookmark, result: string): void;

    // Safely restores focus when generation cancels
    onCancel?: (bookmark: AIFieldBookmark) => void;

    // Fetches localized contextual rules associated with this destination. 
    getFieldConstraints(): AIFieldConstraints;
}
