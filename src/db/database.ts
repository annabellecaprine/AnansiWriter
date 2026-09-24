import Dexie, { type Table } from 'dexie'
import type * as Schema from './schema'
import { applyMigrations } from './migrations'

export class AnansiDatabase extends Dexie {
    appSettings!: Table<Schema.AppSetting, string>
    projects!: Table<Schema.Project, Schema.ID>
    series!: Table<Schema.Series, Schema.ID>
    books!: Table<Schema.Book, Schema.ID>
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
    aiModels!: Table<Schema.AIModel, Schema.ID>
    stagingSessions!: Table<Schema.StagingSession, Schema.ID>
    aiRequestHistory!: Table<Schema.AIRequestHistory, Schema.ID>

    occurrences!: Table<Schema.Occurrence, Schema.ID>
    snapshots!: Table<Schema.Snapshot, Schema.ID>

    constructor() {
        super('AnansiWriterDB')

        // ─────────────────────────────────────────────────────────
        // Base Schema (Version 1)
        // Only indexed properties need to be defined in .stores()
        // ─────────────────────────────────────────────────────────
        this.version(1).stores({
            appSettings: 'key',
            projects: 'id, createdAt',
            series: 'id, projectId, sortOrder',
            books: 'id, projectId, seriesId, sortOrder',
            acts: 'id, projectId, bookId, sortOrder',
            chapters: 'id, projectId, bookId, actId, sortOrder',
            scenes: 'id, projectId, bookId, chapterId, sortOrder',
            sceneRevisions: 'id, sceneId, projectId, createdAt',

            bibleEntries: 'id, projectId, type',
            fieldValues: 'id, [projectId+entryId], projectId, entryId, fieldKey, state',
            relationships: 'id, [projectId+sourceId], [projectId+targetId], projectId, sourceId, targetId, type, state',

            assets: 'id, projectId, mimeType',
            assetLinks: 'id, [projectId+assetId], projectId, assetId, targetId, targetType, role',

            prompts: 'id, projectId, category, isFavorite',
            aiModels: 'id, projectId, provider',
            stagingSessions: 'id, projectId, mode',
            aiRequestHistory: 'id, projectId, promptName, modelId, timestamp',

            occurrences: 'id, [projectId+sceneId], [projectId+entryId], projectId, sceneId, entryId',
            snapshots: 'id, projectId, reason, createdAt'
        })

        // Apply any subsequent migrations
        applyMigrations(this)
    }
}

export const db = new AnansiDatabase()
