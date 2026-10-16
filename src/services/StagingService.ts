import { db } from '../db/database'
import type { StagingSession, StagingMessage, FieldValue, EntityState, Provenance } from '../db/schema'

export interface SaveSessionInput {
    id?: string;
    novelId: string;
    name: string;
    mode?: string;
    characterId: string;
    modelId?: string;
    provider?: string;
    contextSnapshot: object;
    history: StagingMessage[];
}

export interface PromoteInsightInput {
    novelId: string;
    entryId: string;
    fieldKey: string;
    value: any;
    state: EntityState;
    provenance: {
        stagingSessionId: string;
        branchId?: string;
        messageId: string;
        promotionTarget?: string;
    };
}

export class StagingService {
    /**
     * Saves or updates a StagingSession record in the database.
     */
    static async saveSession(input: SaveSessionInput): Promise<string> {
        if (!input.novelId) throw new Error('novelId is required to save a staging session')
        if (!input.name || !input.name.trim()) throw new Error('Session name cannot be empty')
        if (!input.characterId) throw new Error('A target character is required for staging')

        const now = Date.now()
        const id = input.id || crypto.randomUUID()

        const sessionRecord: StagingSession = {
            id,
            novelId: input.novelId,
            name: input.name.trim(),
            mode: input.mode || 'Character Interview',
            context: input.contextSnapshot,
            history: input.history,
            metadata: {
                characterId: input.characterId,
                modelId: input.modelId,
                userRole: input.provider
            },
            createdAt: now,
            updatedAt: now
        }

        const existing = await db.stagingSessions.get(id)
        if (existing) {
            sessionRecord.createdAt = existing.createdAt
            await db.stagingSessions.put(sessionRecord)
        } else {
            await db.stagingSessions.add(sessionRecord)
        }

        return id
    }

    /**
     * Retrieves a saved StagingSession by ID.
     */
    static async getSession(sessionId: string): Promise<StagingSession | undefined> {
        return await db.stagingSessions.get(sessionId)
    }

    /**
     * Lists all saved staging sessions for a given novel.
     */
    static async listSessions(novelId: string): Promise<StagingSession[]> {
        const list = await db.stagingSessions.where('novelId').equals(novelId).toArray()
        return list.sort((a, b) => b.updatedAt - a.updatedAt)
    }

    /**
     * Deletes a staging session by ID.
     */
    static async deleteSession(sessionId: string): Promise<void> {
        await db.stagingSessions.delete(sessionId)
    }

    /**
     * Walks the tree of branchable messages from a given leaf message up to root (parentId === null),
     * returning the linear conversation trajectory in chronological order.
     */
    static getActivePath(history: StagingMessage[], currentLeafId: string | null): StagingMessage[] {
        if (!history || history.length === 0) return []
        if (!currentLeafId) {
            // Default to the latest message in history if no explicit leaf provided
            const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp)
            return sorted
        }

        const map = new Map(history.map(m => [m.id, m]))
        const path: StagingMessage[] = []
        let curr: StagingMessage | undefined = map.get(currentLeafId)

        while (curr) {
            path.unshift(curr)
            curr = curr.parentId ? map.get(curr.parentId) : undefined
        }

        return path
    }

    /**
     * Appends a message onto a specific parent node in the history tree without mutating existing branches.
     */
    static addMessage(
        history: StagingMessage[],
        role: string,
        content: string,
        parentId: string | null
    ): { message: StagingMessage; newHistory: StagingMessage[] } {
        const id = crypto.randomUUID()
        const message: StagingMessage = {
            id,
            parentId,
            role,
            content,
            timestamp: Date.now()
        }

        return {
            message,
            newHistory: [...history, message]
        }
    }

    /**
     * Branches from a selected message ID without mutating the original path or descendants.
     * The branched leaf ID becomes the parent for subsequent turns.
     */
    static branchFromMessage(
        history: StagingMessage[],
        targetMessageId: string
    ): { branchId: string; activeLeafId: string } {
        const exists = history.some(m => m.id === targetMessageId)
        if (!exists) throw new Error(`Target message ${targetMessageId} not found in staging history`)

        const branchId = `branch-${crypto.randomUUID().slice(0, 8)}`
        return {
            branchId,
            activeLeafId: targetMessageId
        }
    }

    /**
     * Promotes a discovery or insight from Staging to a Codex field or note with strict provenance.
     * Guardrail: Promoted content is NOT marked Canon unless the author explicitly selected 'Canon'.
     */
    static async promoteInsight(input: PromoteInsightInput): Promise<string> {
        if (!input.novelId) throw new Error('novelId is required for promotion')
        if (!input.entryId) throw new Error('A target Bible entry destination is required')
        if (!input.fieldKey || !input.fieldKey.trim()) throw new Error('Field key/name is required')
        if (input.value === undefined || input.value === null || String(input.value).trim() === '') {
            throw new Error('Promoted content cannot be empty')
        }
        if (!input.state) throw new Error('Explicit entity state is required for promotion')

        const entry = await db.bibleEntries.get(input.entryId)
        if (!entry) throw new Error('Target Bible entry does not exist')

        const fieldId = crypto.randomUUID()
        const now = Date.now()

        const provenanceRecord: Provenance = {
            stagingSessionId: input.provenance.stagingSessionId,
            branchId: input.provenance.branchId,
            messageId: input.provenance.messageId,
            timestamp: now,
            promotionTarget: input.provenance.promotionTarget || 'BibleEntry'
        }

        const newField: FieldValue = {
            id: fieldId,
            novelId: input.novelId,
            entryId: input.entryId,
            fieldKey: input.fieldKey.trim(),
            value: input.value,
            state: input.state,
            validFrom: null,
            validUntil: null,
            provenance: [provenanceRecord as any],
            createdAt: now,
            updatedAt: now
        }

        await db.fieldValues.add(newField)
        return fieldId
    }
}
