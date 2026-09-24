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
    static async createEntryUsingTemplate(projectId: string, name: string, type: string): Promise<string> {
        const entryId = await this.createEntry(projectId, name, type)
        const templateFields = BUILT_IN_TEMPLATES[type] || []

        for (const field of templateFields) {
            await this.addFieldValue(projectId, entryId, field, '')
        }

        return entryId
    }

    static async createEntry(projectId: string, name: string, type: string): Promise<string> {
        const entryId = uuidv4()
        const now = Date.now()

        const entry: BibleEntry = {
            id: entryId,
            projectId,
            name,
            type,
            tags: [],
            aliases: [],
            createdAt: now,
            updatedAt: now,
        }

        await db.bibleEntries.add(entry)
        return entryId
    }

    static async addFieldValue(
        projectId: string,
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
            projectId,
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

    static async getEntryWithFields(projectId: string, entryId: string) {
        const [entry, fields] = await Promise.all([
            db.bibleEntries.get(entryId),
            db.fieldValues.where({ projectId, entryId }).toArray()
        ])

        if (!entry) return null

        return { ...entry, fields }
    }

    static async queryFieldsByState(projectId: string, entryId: string, state: EntityState) {
        return db.fieldValues
            .where({ projectId, entryId })
            .filter(f => f.state === state)
            .toArray()
    }

    static async createRelationship(
        projectId: string,
        sourceId: string,
        targetId: string,
        type: string,
        validFrom: NarrativePosition | null = null,
        validUntil: NarrativePosition | null = null
    ): Promise<string> {
        const id = uuidv4()
        await db.relationships.add({
            id,
            projectId,
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

    static async getRelationships(projectId: string, entryId: string) {
        // Find relationships where the entry is either the source or the target
        const sources = await db.relationships.where({ projectId, sourceId: entryId }).toArray()
        const targets = await db.relationships.where({ projectId, targetId: entryId }).toArray()
        return [...sources, ...targets]
    }
}
