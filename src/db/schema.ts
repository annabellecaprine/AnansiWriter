export type ID = string;

// Global settings schema explicitly decoupled from `projectId` to isolate credentials from the ExportService pipeline
export interface AppSetting {
    key: string;
    value: string;
    description?: string;
    updatedAt: number;
}

export interface Provenance {
    stagingSessionId: string;
    branchId?: string;
    messageId: string;
    timestamp: number;
    promotionTarget: string; // e.g. "Note", "BibleEntry"
}

// The types of states a piece of information can be in.
export type EntityState = 'Planned' | 'Drafted' | 'Canon' | 'Retconned' | 'Discarded';

export interface NarrativePosition {
    bookId?: ID;
    chapterId?: ID;
    sceneId?: ID;
    // A numerical weight for ordering chronologically
    sequence?: number;
}

// ─────────────────────────────────────────────────────────
// Core Hierarchy
// ─────────────────────────────────────────────────────────
export interface Project {
    id: ID;
    name: string;
    createdAt: number;
    updatedAt: number;
    version: number;
    // Used to mark a project as in the Trash
    isTrashed: boolean;
    trashedAt?: number;
    lastExportedAt?: number;
}

export interface Series {
    id: ID;
    projectId: ID;
    name: string;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export interface Book {
    id: ID;
    projectId: ID;
    seriesId?: ID;
    name: string;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export interface Act {
    id: ID;
    projectId: ID;
    bookId: ID;
    name: string;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export interface Chapter {
    id: ID;
    projectId: ID;
    bookId: ID;
    actId?: ID; // Acts are optional
    name: string;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export interface Scene {
    id: ID;
    projectId: ID;
    bookId: ID;
    chapterId: ID;
    name: string;
    content: object; // TipTap JSON
    pov?: string;
    povCharacterId?: string;
    location?: string;
    status: string; // e.g., 'Draft', 'Revised', 'Final'
    wordCount: number;
    targetWordCount?: number;
    summary?: string;
    notes: string | string[];
    narrativePosition?: NarrativePosition;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export interface SceneRevision {
    id: ID;
    sceneId: ID;
    projectId: ID;
    content: object; // TipTap JSON at the time
    wordCount: number;
    createdAt: number;
}

// ─────────────────────────────────────────────────────────
// Bible & Lore (FieldValue Model)
// ─────────────────────────────────────────────────────────
export interface BibleEntry {
    id: ID;
    projectId: ID;
    name: string;
    type: string; // 'Character', 'Location', 'Organization', etc.
    tags: string[];
    aliases: string[];
    createdAt: number;
    updatedAt: number;
}

export interface FieldValue {
    id: ID;
    projectId: ID;
    entryId: ID;
    fieldKey: string; // "eye_color", "occupation"
    // Content can be plain text, TipTap JSON, or other primitives
    value: any;
    state: EntityState;
    validFrom: NarrativePosition | null;
    validUntil: NarrativePosition | null;
    provenance: ID[]; // Array of Scene UUIDs
    createdAt: number;
    updatedAt: number;
}

export interface Relationship {
    id: ID;
    projectId: ID;
    sourceId: ID; // BibleEntry ID
    targetId: ID; // BibleEntry ID
    type: string; // e.g., 'parent', 'enemy', 'member'
    isBidirectional: boolean;
    notes: string;
    state: EntityState;
    validFrom: NarrativePosition | null;
    validUntil: NarrativePosition | null;
    provenance: ID[]; // Scene UUIDs
    createdAt: number;
    updatedAt: number;
}

// ─────────────────────────────────────────────────────────
// Assets
// ─────────────────────────────────────────────────────────
export interface Asset {
    id: ID;
    projectId: ID;
    name: string;
    mimeType: string;
    blob: Blob;
    sizeBytes: number;
    createdAt: number;
}

export interface AssetLink {
    id: ID;
    projectId: ID;
    assetId: ID;
    targetId: ID; // Can be a BibleEntry, a Scene, etc.
    targetType: string;
    role: string; // e.g., 'primary_portrait', 'map_reference'
}

// ─────────────────────────────────────────────────────────
// AI & Prompts
// ─────────────────────────────────────────────────────────
export interface PromptInputRule {
    type: 'Scene' | 'Chapter' | 'Book' | 'Character' | 'BibleEntry' | 'Relationship' | 'Timeline' | 'Notes' | 'Selection' | 'Asset' | 'PinnedContext';
    isRequired: boolean;
    isAutomatic: boolean;
    maxItems?: number;
    recencyBias?: boolean; // Suggests to grab narrative proximity natively
    tokenBudgetLimit?: number; // Caps consumption logic structurally
}

export interface Prompt {
    id: ID;
    projectId?: ID;

    // General
    name: string;
    category: string;
    tags: string[];
    description: string; // Human readable documentation
    defaultModel: string;
    temperature: number;
    maxOutputTokens: number;
    tokenBudget: number; // The maximum amount context should consume globally

    // Instructions
    systemInstruction: string;
    userTemplate: string;

    // Inputs Specification
    inputs: PromptInputRule[];

    isFavorite: boolean;
    isEnabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface AIModel {
    id: ID;
    projectId: ID;
    provider: string; // e.g., 'chutes' or 'openrouter'
    modelId: string; // e.g., 'anthropic/claude-3-haiku'
    name: string;

    // Configurations
    maxContextTokens: number;
    defaultTemperature: number;
    hasVision: boolean;
    tags: string[];

    isEnabled: boolean;

    // Pricing vectors
    costPer1kInput: number;
    costPer1kOutput: number;
}

export interface StagingMessage {
    id: string;
    parentId: string | null; // Null targets the root node of the conversation
    role: 'user' | 'assistant' | 'system' | string;
    content: string;
    timestamp: number;
}

export interface StagingSession {
    id: ID;
    projectId: ID;
    name: string;
    mode: string; // 'Character Interview', 'Voice Test', etc.
    context: object; // Serialized context state
    history: StagingMessage[]; // Array of branchable messages mapping a node tree securely
    metadata: {
        modelId?: string;
        promptId?: string;
        userRole?: string;
    }
    createdAt: number;
    updatedAt: number;
}

export interface AIRequestHistory {
    id: ID;
    projectId: ID;
    promptName: string;
    modelId: string;
    tokenCount: number;
    sourceId?: ID; // Associated object ID
    payload?: object; // Full payload context + response (if not metadata-only)
    timestamp: number;
}

// ─────────────────────────────────────────────────────────
// Occurrences & Snapshots
// ─────────────────────────────────────────────────────────
export interface Occurrence {
    id: ID;
    projectId: ID;
    sceneId: ID;
    entryId: ID; // BibleEntry ID
    keywordOrAlias: string;
    confidence: number;
    isConfirmed: boolean;
    isDismissed: boolean;
}

export interface Snapshot {
    id: ID;
    projectId: ID;
    name: string;
    reason: string; // 'pre-migration', 'bulk-delete'
    data: object; // Full ZIP or serialized DB
    createdAt: number;
}
