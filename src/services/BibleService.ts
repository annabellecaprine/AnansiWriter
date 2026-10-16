import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { BibleEntry, FieldValue, EntityState, NarrativePosition } from '../db/schema'
import { isNarrativePositionInRange } from './ai/narrativeComparator'
import { CodexConfigService } from './CodexConfigService'

export const BUILT_IN_TEMPLATES: Record<string, string[]> = {
    'Character': ['Full Name', 'Pronouns', 'Status', 'Age', 'Eye Color', 'Hair Color', 'Occupation', 'Motivation', 'Flaw'],
    'Location': ['Name', 'Region', 'Climate', 'Population', 'Key Landmarks'],
    'Organization': ['Name', 'Leader', 'Purpose', 'Headquarters', 'Members'],
    'Lore': ['Concept', 'Origin', 'Rules', 'Limitations', 'Known Examples']
}

export class BibleService {
    static async createEntryUsingTemplate(novelId: string, name: string, type: string, scope: 'project' | 'series' = 'project'): Promise<string> {
        const entryId = await this.createEntry(novelId, name, type, scope)
        const customCat = await CodexConfigService.getCategoryByName(type)
        const templateFields = customCat?.defaultFields && customCat.defaultFields.length > 0
            ? customCat.defaultFields
            : (BUILT_IN_TEMPLATES[type] || [])

        for (const field of templateFields) {
            await this.addFieldValue(novelId, entryId, field, '')
        }

        return entryId
    }

    static async createEntry(novelId: string, name: string, type: string, scope: 'project' | 'series' = 'project'): Promise<string> {
        const entryId = uuidv4()
        const now = Date.now()

        let targetNovelId: string | undefined = novelId;
        let targetSeriesId: string | undefined = undefined;

        if (scope === 'series') {
            const novel = await db.novels.get(novelId)
            targetSeriesId = novel?.seriesId
            targetNovelId = undefined
        }

        const entry: BibleEntry = {
            id: entryId,
            novelId: targetNovelId,
            seriesId: targetSeriesId,
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
        await db.bibleEntries.update(entryId, { ...updates, updatedAt: Date.now() })
    }

    static async moveToTrash(novelId: string, entryId: string): Promise<void> {
        await db.bibleEntries.update(entryId, { isTrashed: true, trashedAt: Date.now(), updatedAt: Date.now() })
    }

    static async restoreFromTrash(novelId: string, entryId: string): Promise<void> {
        await db.bibleEntries.update(entryId, { isTrashed: false, trashedAt: undefined, updatedAt: Date.now() })
    }

    static async getEntry(entryId: string): Promise<BibleEntry | undefined> {
        return await db.bibleEntries.get(entryId)
    }

    static async listActiveEntries(novelId: string): Promise<BibleEntry[]> {
        const novel = await db.novels.get(novelId)
        const seriesId = novel?.seriesId

        const novelEntries = await db.bibleEntries.where('novelId').equals(novelId).toArray()
        let allEntries = [...novelEntries]

        if (seriesId) {
            const seriesEntries = await db.bibleEntries.where('seriesId').equals(seriesId).toArray()
            allEntries = [...allEntries, ...seriesEntries]
        }

        // Deduplicate safely
        const unique = Array.from(new Map(allEntries.map(e => [e.id, e])).values());
        return unique.filter(e => !e.isTrashed).sort((a, b) => b.updatedAt - a.updatedAt)
    }

    static async listTrashedEntries(novelId: string): Promise<BibleEntry[]> {
        const novel = await db.novels.get(novelId)
        const seriesId = novel?.seriesId

        const novelEntries = await db.bibleEntries.where('novelId').equals(novelId).toArray()
        let allEntries = [...novelEntries]

        if (seriesId) {
            const seriesEntries = await db.bibleEntries.where('seriesId').equals(seriesId).toArray()
            allEntries = [...allEntries, ...seriesEntries]
        }

        const unique = Array.from(new Map(allEntries.map(e => [e.id, e])).values());
        return unique.filter(e => !!e.isTrashed).sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0))
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
        const entry = await db.bibleEntries.get(entryId)

        const field: FieldValue = {
            id: fieldId,
            novelId: entry?.novelId,
            seriesId: entry?.seriesId,
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
        await db.fieldValues.update(fieldId, { ...updates, updatedAt: Date.now() })
    }

    static async deleteFieldValue(novelId: string, fieldId: string): Promise<void> {
        await db.fieldValues.delete(fieldId)
    }

    static async getEntryWithFields(novelId: string, entryId: string) {
        const [entry, fields] = await Promise.all([
            db.bibleEntries.get(entryId),
            db.fieldValues.where({ entryId }).toArray()
        ])

        if (!entry || entry.isTrashed) return null

        return { ...entry, fields }
    }

    static async queryFieldsByState(novelId: string, entryId: string, state: EntityState) {
        return db.fieldValues
            .where({ entryId })
            .filter(f => f.state === state)
            .toArray()
    }

    /**
     * Queries fields for an entry that are eligible at targetNarrativeSequence.
     * Enforces strict state policy and narrative temporal bounds.
     */
    static async queryEligibleFields(
        entryId: string,
        targetSequence: number | null,
        allowedStates: EntityState[] = ['Canon']
    ): Promise<FieldValue[]> {
        const fields = await db.fieldValues.where({ entryId }).toArray()
        const eligible: FieldValue[] = []

        for (const f of fields) {
            // Never include Retconned or Discarded in automatic context
            if (f.state === 'Retconned' || f.state === 'Discarded') continue
            // State must be in allowed states (defaults strictly to ['Canon'])
            if (!allowedStates.includes(f.state)) continue

            // If target sequence is provided, evaluate narrative temporal bounds
            if (targetSequence != null) {
                const inRange = await isNarrativePositionInRange(targetSequence, f.validFrom, f.validUntil)
                if (!inRange) continue
            }

            eligible.push(f)
        }

        return eligible
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
        const entry = await db.bibleEntries.get(sourceId)
        await db.relationships.add({
            id,
            novelId: entry?.novelId,
            seriesId: entry?.seriesId,
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
        // Find relationships across all scopes strictly keyed by entryId
        const sources = await db.relationships.where({ sourceId: entryId }).toArray()
        const targets = await db.relationships.where({ targetId: entryId }).toArray()
        return [...sources, ...targets]
    }
}
