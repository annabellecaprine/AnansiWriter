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
    novelId?: ID;
    chapterId?: ID;
    sceneId?: ID;
    // A numerical weight for ordering chronologically
    sequence?: number;
}

// ─────────────────────────────────────────────────────────
// Core Hierarchy
// ─────────────────────────────────────────────────────────

export interface Series {
    id: ID;
    title: string;
    description?: string;
    coverAssetId?: string;
    tags?: string[];
    status?: string;
    createdAt: number;
    updatedAt: number;
}

export interface Novel {
    id: ID;
    seriesId?: ID;
    seriesIndex?: number;
    title: string;
    subtitle?: string;
    author?: string;
    coverAssetId?: string;
    summary?: string;
    language?: string;
    status?: string;
    tags?: string[];
    targetWordCount?: number;
    planningContent?: object;
    createdAt: number;
    updatedAt: number;
}

export interface Act {
    id: ID;
    novelId: ID;
    name: string;
    sortOrder: number;
    planningContent?: object; // TipTap JSON
    createdAt: number;
    updatedAt: number;
}

export interface Chapter {
    id: ID;
    novelId: ID;
    actId?: ID; // Acts are optional
    name: string;
    sortOrder: number;
    planningContent?: object; // TipTap JSON
    isTrashed?: boolean;
    trashedAt?: number;
    createdAt: number;
    updatedAt: number;
}

export type SceneStatus = 'Idea' | 'Planned' | 'Draft' | 'Revised' | 'Edited' | 'Final'

export interface Scene {
    id: ID;
    novelId: ID;
    chapterId: ID;
    name: string;
    subtitle?: string;
    content: object; // TipTap JSON
    pov?: string;
    povCharacterId?: string;
    location?: string;
    status: SceneStatus;
    wordCount: number;
    targetWordCount?: number;
    summary?: string;
    notes: string | string[];
    labels?: string[];
    planningContent?: object; // TipTap JSON
    narrativePosition?: NarrativePosition;
    sortOrder: number;
    isArchived?: boolean;
    archivedAt?: number;
    isTrashed?: boolean;
    trashedAt?: number;
    createdAt: number;
    updatedAt: number;
}

export interface SceneRevision {
    id: ID;
    sceneId: ID;
    novelId: ID;
    content: object; // TipTap JSON at the time
    wordCount: number;
    createdAt: number;
}

// ─────────────────────────────────────────────────────────
// Bible & Lore (FieldValue Model)
// ─────────────────────────────────────────────────────────
export interface BibleEntry {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
    name: string;
    type: string; // 'Character', 'Location', 'Organization', etc.
    tags: string[];
    aliases: string[];
    keywords?: string[];
    description?: string;

    // Phase C: AI Override Flags
    alwaysIncludeInContext?: boolean;
    excludeFromContext?: boolean;
    doNotTrack?: boolean;

    isTrashed?: boolean;
    trashedAt?: number;
    createdAt: number;
    updatedAt: number;
}

export interface FieldValue {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
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
    seriesId?: ID;
    novelId?: ID;
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
    seriesId?: ID;
    novelId?: ID;
    name: string;
    mimeType: string;
    blob: Blob;
    sizeBytes: number;
    createdAt: number;
}

export interface AssetLink {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
    assetId: ID;
    targetId: ID; // Can be a BibleEntry, a Scene, etc.
    targetType: string;
    role: string; // e.g., 'primary_portrait', 'map_reference', 'Cover'
}

// ─────────────────────────────────────────────────────────
// AI & Prompts
// ─────────────────────────────────────────────────────────

export interface AIChatThread {
    id: ID;
    novelId: ID;
    title: string;
    description?: string;
    messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    modelId: string;
    contextReferences: { type: string, id: string, name: string }[];
    isPinned: boolean;
    isArchived: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface PromptCategory {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
    name: string;
    sortOrder: number;
    isSystem: boolean; // built-in category that cannot be normally deleted
}

export interface PromptInputRule {
    kind: 'context' | 'manual';
    name: string;
    description?: string;

    // For kind = 'context'
    type?: 'Selection' | 'CurrentScene' | 'CurrentScenePlan' | 'CurrentChapter' | 'CurrentBook' | 'PreviousScene' | 'PreviousNScenes' | 'NextScene' | 'RelevantBibleEntries' | 'SpecificBibleEntries' | 'CharacterState' | 'RelationshipState' | 'CurrentLocation' | 'TimelineState' | 'PlanningNotes' | 'Assets' | 'SeriesContext' | 'PinnedContext' | 'StoryGuides';
    isAutomatic?: boolean;
    recencyCount?: number; // Suggests grabbing a specific numerical limit on narrative proximity

    // For kind = 'manual'
    manualType?: 'text' | 'multiline' | 'number' | 'boolean' | 'select' | 'multi-select';
    options?: string[]; // for select/multi-select
    defaultValue?: any;
    min?: number;
    max?: number;

    // Shared
    isRequired: boolean;
    maxItems?: number;
    tokenBudgetLimit?: number; // Caps consumption logic structurally
    includeImages?: boolean; // for vision capable contexts
}

export interface Prompt {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
    scope: 'built-in' | 'global' | 'project' | 'series' | 'novel';

    categoryId: ID;

    // General
    name: string;
    tags: string[];
    description: string; // Human readable documentation
    outputMode: 'chat' | 'suggestion' | 'diff' | 'structured';

    // Model Configuration
    defaultModel: string;
    allowedModels: string[];

    // Inference Settings
    temperature: number;
    maxOutputTokens: number;
    tokenBudget: number; // The maximum amount context should consume globally

    // Additional parameters like topP could be added here in the future

    // Instructions
    systemInstruction: string;
    userTemplate: string;

    // Inputs Specification
    inputs: PromptInputRule[];

    isFavorite: boolean;
    isEnabled: boolean;

    // For soft deletes
    isTrashed: boolean;
    trashedAt?: number;

    createdAt: number;
    updatedAt: number;
}

export interface AIModel {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
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
    seriesId?: ID;
    novelId?: ID;
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
    seriesId?: ID;
    novelId?: ID;
    promptName: string;                     // Legacy/fallback identifier
    executedPromptSnapshot?: Prompt;        // Complete configuration mapping at execution time
    executionMetadata?: {                   // Specific overrides or actual inference settings used
        temperatureUsed: number;
        outputTokensUsed: number;
        inputVariablesResolved: Record<string, any>;
    };
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
    novelId: ID;
    sceneId: ID;
    entryId: ID; // BibleEntry ID
    keywordOrAlias: string;
    confidence: number;
    isConfirmed: boolean;
    isDismissed: boolean;
}

export interface Snapshot {
    id: ID;
    seriesId?: ID;
    novelId?: ID;
    name: string;
    reason: string; // 'pre-migration', 'bulk-delete'
    data: object; // Full ZIP or serialized DB
    createdAt: number;
}
