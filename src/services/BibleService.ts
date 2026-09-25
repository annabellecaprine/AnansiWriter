import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { BibleEntry, FieldValue, EntityState, NarrativePosition } from '../db/schema'

export const BUILT_IN_TEMPLATES: Record<string, string[]> = {
    'Character': ['Full Name', 'Age', 'Eye Color', 'Hair Color', 'Occupation', 'Motivation', 'Flaw'],
    'Location': ['Name', 'Region', 'Climate', 'Population', 'Key Landmarks'],
    'Organization': ['Name', 'Leader', 'Purpose', 'Headquarters', 'Members'],
    'Lore': ['Concept', 'Origin', 'Rules', 'Limitations', 'Known Examples']
}

export class BibleService {
    static async createEntryUsingTemplate(novelId: string, name: string, type: string): Promise<string> {
        const entryId = await this.createEntry(novelId, name, type)
        const templateFields = BUILT_IN_TEMPLATES[type] || []

        for (const field of templateFields) {
            await this.addFieldValue(novelId, entryId, field, '')
        }

        return entryId
    }

    static async createEntry(novelId: string, name: string, type: string): Promise<string> {
        const entryId = uuidv4()
        const now = Date.now()

        const entry: BibleEntry = {
            id: entryId,
            novelId,
            name,
            type,
            tags: [],
            aliases: [],
            keywords: [],
            description: '',
            createdAt: now,
            updatedAt: now,
        }

        await db.bibleEntries.add(entry)
        return entryId
    }

    static async updateEntry(novelId: string, entryId: string, updates: Partial<BibleEntry>): Promise<void> {
        await db.bibleEntries.where({ novelId, id: entryId }).modify({ ...updates, updatedAt: Date.now() })
    }

    static async moveToTrash(novelId: string, entryId: string): Promise<void> {
        await db.bibleEntries.where({ novelId, id: entryId }).modify({ isTrashed: true, trashedAt: Date.now(), updatedAt: Date.now() })
    }

    static async restoreFromTrash(novelId: string, entryId: string): Promise<void> {
        await db.bibleEntries.where({ novelId, id: entryId }).modify({ isTrashed: false, trashedAt: undefined, updatedAt: Date.now() })
    }

    static async listActiveEntries(novelId: string): Promise<BibleEntry[]> {
        const entries = await db.bibleEntries.where({ novelId }).toArray()
        return entries.filter(e => !e.isTrashed).sort((a, b) => b.updatedAt - a.updatedAt)
    }

    static async listTrashedEntries(novelId: string): Promise<BibleEntry[]> {
        const entries = await db.bibleEntries.where({ novelId }).toArray()
        return entries.filter(e => !!e.isTrashed).sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0))
    }

    static async addFieldValue(
        novelId: string,
        entryId: string,
        fieldKey: string,
        value: any,
        state: EntityState = 'Canon',
        provenance: string[] = []
    ): Promise<string> {
        const fieldId = uuidv4()
        const now = Date.now()

        const field: FieldValue = {
            id: fieldId,
            novelId,
            entryId,
            fieldKey,
            value,
            state,
            validFrom: null,
            validUntil: null,
            provenance,
            createdAt: now,
            updatedAt: now,
        }

        await db.fieldValues.add(field)
        return fieldId
    }

    static async updateFieldValue(novelId: string, fieldId: string, updates: Partial<FieldValue>): Promise<void> {
        await db.fieldValues.where({ novelId, id: fieldId }).modify({ ...updates, updatedAt: Date.now() })
    }

    static async deleteFieldValue(novelId: string, fieldId: string): Promise<void> {
        await db.fieldValues.where({ novelId, id: fieldId }).delete()
    }

    static async getEntryWithFields(novelId: string, entryId: string) {
        const [entry, fields] = await Promise.all([
            db.bibleEntries.get(entryId),
            db.fieldValues.where({ novelId, entryId }).toArray()
        ])

        if (!entry || entry.isTrashed) return null

        return { ...entry, fields }
    }

    static async queryFieldsByState(novelId: string, entryId: string, state: EntityState) {
        return db.fieldValues
            .where({ novelId, entryId })
            .filter(f => f.state === state)
            .toArray()
    }

    static async createRelationship(
        novelId: string,
        sourceId: string,
        targetId: string,
        type: string,
        validFrom: NarrativePosition | null = null,
        validUntil: NarrativePosition | null = null
    ): Promise<string> {
        const id = uuidv4()
        await db.relationships.add({
            id,
            novelId,
            sourceId,
            targetId,
            type,
            validFrom,
            validUntil,
            state: 'Canon',
            isBidirectional: false,
            notes: '',
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }

    static async getRelationships(novelId: string, entryId: string) {
        // Find relationships where the entry is either the source or the target
        const sources = await db.relationships.where({ novelId, sourceId: entryId }).toArray()
        const targets = await db.relationships.where({ novelId, targetId: entryId }).toArray()
        return [...sources, ...targets]
    }
}
