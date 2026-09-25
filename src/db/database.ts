import Dexie, { type Table } from 'dexie'
import type * as Schema from './schema'
import { applyMigrations } from './migrations'

export class AnansiDatabase extends Dexie {
    appSettings!: Table<Schema.AppSetting, string>
    series!: Table<Schema.Series, Schema.ID>
    novels!: Table<Schema.Novel, Schema.ID>
    acts!: Table<Schema.Act, Schema.ID>
    chapters!: Table<Schema.Chapter, Schema.ID>
    scenes!: Table<Schema.Scene, Schema.ID>
    sceneRevisions!: Table<Schema.SceneRevision, Schema.ID>

    bibleEntries!: Table<Schema.BibleEntry, Schema.ID>
    fieldValues!: Table<Schema.FieldValue, Schema.ID>
    relationships!: Table<Schema.Relationship, Schema.ID>

    assets!: Table<Schema.Asset, Schema.ID>
    assetLinks!: Table<Schema.AssetLink, Schema.ID>

    prompts!: Table<Schema.Prompt, Schema.ID>
    promptCategories!: Table<Schema.PromptCategory, Schema.ID>
    aiModels!: Table<Schema.AIModel, Schema.ID>
    stagingSessions!: Table<Schema.StagingSession, Schema.ID>
    aiRequestHistory!: Table<Schema.AIRequestHistory, Schema.ID>
    aiChatThreads!: Table<Schema.AIChatThread, Schema.ID>

    occurrences!: Table<Schema.Occurrence, Schema.ID>
    snapshots!: Table<Schema.Snapshot, Schema.ID>

    constructor() {
        super('AnansiWriterDB')

        // ─────────────────────────────────────────────────────────
        // Base Schema (Version 1)
        // Only indexed properties need to be defined in .stores()
        // ─────────────────────────────────────────────────────────
        this.version(2).stores({
            appSettings: 'key',
            series: 'id, createdAt',
            novels: 'id, seriesId, seriesIndex, createdAt',
            acts: 'id, novelId, sortOrder',
            chapters: 'id, novelId, actId, sortOrder',
            scenes: 'id, novelId, chapterId, sortOrder',
            sceneRevisions: 'id, sceneId, novelId, createdAt',

            bibleEntries: 'id, seriesId, novelId, type',
            fieldValues: 'id, [novelId+entryId], [seriesId+entryId], novelId, seriesId, entryId, fieldKey, state',
            relationships: 'id, [novelId+sourceId], [novelId+targetId], [seriesId+sourceId], [seriesId+targetId], novelId, seriesId, sourceId, targetId, type, state',

            assets: 'id, novelId, seriesId, mimeType',
            assetLinks: 'id, [novelId+assetId], [seriesId+assetId], novelId, seriesId, assetId, targetId, targetType, role',

            prompts: 'id, novelId, seriesId, category, isFavorite',
            aiModels: 'id, novelId, seriesId, provider',
            stagingSessions: 'id, novelId, seriesId, mode',
            aiRequestHistory: 'id, novelId, seriesId, promptName, modelId, timestamp',

            occurrences: 'id, [novelId+sceneId], [novelId+entryId], novelId, sceneId, entryId',
            snapshots: 'id, novelId, seriesId, reason, createdAt'
        })

        this.version(3).stores({
            scenes: 'id, novelId, chapterId, sortOrder, isArchived'
        })

        this.version(4).stores({
            aiChatThreads: 'id, novelId, isPinned, isArchived, updatedAt'
        })

        // Apply any subsequent migrations
        applyMigrations(this)
    }
}

export const db = new AnansiDatabase()
