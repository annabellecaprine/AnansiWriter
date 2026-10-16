import { db } from '../db/database'

export interface CodexCategoryDefinition {
    id: string;
    name: string;
    icon: string;
    color: string;
    defaultFields: string[];
    isBuiltIn?: boolean;
}

export interface RelationshipTypeDefinition {
    id: string;
    name: string;
    reverseName?: string;
    defaultDirection: 'outbound' | 'inbound' | 'bidirectional';
    color?: string;
    isBuiltIn?: boolean;
}

export const DEFAULT_CODEX_CATEGORIES: CodexCategoryDefinition[] = [
    {
        id: 'cat-character',
        name: 'Character',
        icon: 'User',
        color: '#8b5cf6',
        defaultFields: ['Full Name', 'Pronouns', 'Status', 'Age', 'Eye Color', 'Hair Color', 'Occupation', 'Motivation', 'Flaw'],
        isBuiltIn: true
    },
    {
        id: 'cat-location',
        name: 'Location',
        icon: 'MapPin',
        color: '#10b981',
        defaultFields: ['Name', 'Region', 'Climate', 'Population', 'Key Landmarks'],
        isBuiltIn: true
    },
    {
        id: 'cat-organization',
        name: 'Organization',
        icon: 'Building',
        color: '#3b82f6',
        defaultFields: ['Name', 'Leader', 'Purpose', 'Headquarters', 'Members'],
        isBuiltIn: true
    },
    {
        id: 'cat-lore',
        name: 'Lore',
        icon: 'BookOpen',
        color: '#f59e0b',
        defaultFields: ['Concept', 'Origin', 'Rules', 'Limitations', 'Known Examples'],
        isBuiltIn: true
    },
    {
        id: 'cat-item',
        name: 'Item',
        icon: 'Package',
        color: '#ec4899',
        defaultFields: ['Item Type', 'Origin', 'Weight', 'Special Properties', 'Bearer'],
        isBuiltIn: true
    },
    {
        id: 'cat-creature',
        name: 'Creature',
        icon: 'Sparkles',
        color: '#14b8a6',
        defaultFields: ['Species', 'Habitat', 'Diet', 'Temperament', 'Abilities'],
        isBuiltIn: true
    },
    {
        id: 'cat-culture',
        name: 'Culture',
        icon: 'Crown',
        color: '#eab308',
        defaultFields: ['People', 'Language', 'Traditions', 'Beliefs', 'Social Structure'],
        isBuiltIn: true
    },
    {
        id: 'cat-event',
        name: 'Event',
        icon: 'Scroll',
        color: '#f97316',
        defaultFields: ['Date / Era', 'Location', 'Key Participants', 'Outcome', 'Significance'],
        isBuiltIn: true
    },
    {
        id: 'cat-technology',
        name: 'Technology / Magic',
        icon: 'Zap',
        color: '#06b6d4',
        defaultFields: ['Source / Mechanism', 'Applications', 'Dangers / Limitations'],
        isBuiltIn: true
    },
    {
        id: 'cat-story-guide',
        name: 'Story Guide',
        icon: 'Compass',
        color: '#6366f1',
        defaultFields: ['State of the World', 'Central Conflict', 'Current Era / Setting', 'Key Factions', 'Themes'],
        isBuiltIn: true
    }
]

/**
 * Normalizes legacy or aliased category strings into their canonical names.
 * Folds:
 *  - 'object' -> 'Item'
 *  - 'other', 'research note', 'research notes', 'note' -> 'Lore'
 *  - 'state of the world', 'state-of-the-world' -> 'Story Guide'
 *  - Case insensitivity: e.g. 'lore' -> 'Lore', 'character' -> 'Character'
 */
export function normalizeCategoryName(rawType: string | undefined | null, categories: CodexCategoryDefinition[] = []): string {
    if (!rawType) return 'Lore'
    const trimmed = rawType.trim()
    const lower = trimmed.toLowerCase()

    // 1. Direct legacy alias mappings
    if (lower === 'object') return 'Item'
    if (lower === 'other' || lower === 'research note' || lower === 'research notes' || lower === 'note') return 'Lore'
    if (lower === 'state of the world' || lower === 'state-of-the-world' || lower === 'story guide') return 'Story Guide'

    // 2. Match configured categories case-insensitively
    const matched = categories.find(c => c.name.toLowerCase() === lower)
    if (matched) return matched.name

    // 3. Fallback match built-in defaults case-insensitively
    const defaultMatched = DEFAULT_CODEX_CATEGORIES.find(c => c.name.toLowerCase() === lower)
    if (defaultMatched) return defaultMatched.name

    return trimmed
}

export interface CodexCategoryPreset {
    name: string;
    icon: string;
    color: string;
    defaultFields: string[];
    description: string;
}

export const RECOMMENDED_CATEGORY_PRESETS: CodexCategoryPreset[] = [
    {
        name: 'Species',
        icon: 'Sparkles',
        color: '#0d9488',
        defaultFields: ['Description', 'Distinguishing Traits', 'Weaknesses', 'Population / Numbers', 'Notable Members'],
        description: 'Taxonomic entries (traits, weaknesses, populations), not individuals. Answers: "X is a Y — what are Ys?"'
    },
    {
        name: 'Plot Thread',
        icon: 'Scroll',
        color: '#d97706',
        defaultFields: ['Status', 'Participants', 'Stakes', 'Key Beats', 'Payoff'],
        description: 'Subplot / arc entries. Answers: "what\'s the state of this arc?"'
    },
    {
        name: 'Magic System',
        icon: 'Zap',
        color: '#0284c7',
        defaultFields: ['Rules', 'Costs / Limitations', 'Who Can Use It', 'Dangers'],
        description: 'System rules (not discrete powers). Answers: "how does magic work in this world?"'
    }
]

export const DEFAULT_RELATIONSHIP_TYPES: RelationshipTypeDefinition[] = [
    {
        id: 'rel-friend',
        name: 'Friend Of',
        defaultDirection: 'bidirectional',
        color: '#10b981',
        isBuiltIn: true
    },
    {
        id: 'rel-allied',
        name: 'Allied With',
        defaultDirection: 'bidirectional',
        color: '#3b82f6',
        isBuiltIn: true
    },
    {
        id: 'rel-rival',
        name: 'Rival Of',
        defaultDirection: 'bidirectional',
        color: '#ef4444',
        isBuiltIn: true
    },
    {
        id: 'rel-enemy',
        name: 'Enemy Of',
        defaultDirection: 'bidirectional',
        color: '#dc2626',
        isBuiltIn: true
    },
    {
        id: 'rel-mentor',
        name: 'Mentor Of',
        reverseName: 'Mentored By',
        defaultDirection: 'outbound',
        color: '#8b5cf6',
        isBuiltIn: true
    },
    {
        id: 'rel-romantic',
        name: 'Romantic Partner',
        defaultDirection: 'bidirectional',
        color: '#f43f5e',
        isBuiltIn: true
    },
    {
        id: 'rel-sibling',
        name: 'Sibling Of',
        defaultDirection: 'bidirectional',
        color: '#a855f7',
        isBuiltIn: true
    },
    {
        id: 'rel-parent',
        name: 'Parent Of',
        reverseName: 'Child Of',
        defaultDirection: 'outbound',
        color: '#c084fc',
        isBuiltIn: true
    },
    {
        id: 'rel-possesses',
        name: 'Possesses a...',
        reverseName: 'Possessed by...',
        defaultDirection: 'outbound',
        color: '#ec4899',
        isBuiltIn: true
    },
    {
        id: 'rel-member',
        name: 'Member Of',
        reverseName: 'Has Member',
        defaultDirection: 'outbound',
        color: '#f59e0b',
        isBuiltIn: true
    },
    {
        id: 'rel-works-for',
        name: 'Works For',
        reverseName: 'Employs',
        defaultDirection: 'outbound',
        color: '#06b6d4',
        isBuiltIn: true
    },
    {
        id: 'rel-lives-in',
        name: 'Lives In',
        reverseName: 'Inhabited By',
        defaultDirection: 'outbound',
        color: '#14b8a6',
        isBuiltIn: true
    },
    {
        id: 'rel-located-in',
        name: 'Located In',
        reverseName: 'Contains',
        defaultDirection: 'outbound',
        color: '#6366f1',
        isBuiltIn: true
    },
    {
        id: 'rel-created',
        name: 'Created',
        reverseName: 'Created By',
        defaultDirection: 'outbound',
        color: '#eab308',
        isBuiltIn: true
    },
    {
        id: 'rel-rules',
        name: 'Rules / Governs',
        reverseName: 'Ruled By',
        defaultDirection: 'outbound',
        color: '#f97316',
        isBuiltIn: true
    }
]

const SETTINGS_CATEGORIES_KEY = 'codex_categories'
const SETTINGS_RELATIONSHIP_TYPES_KEY = 'relationship_types'

export class CodexConfigService {
    // ==========================================
    // Categories
    // ==========================================

    static async getCategories(): Promise<CodexCategoryDefinition[]> {
        const row = await db.appSettings.get(SETTINGS_CATEGORIES_KEY)
        if (!row || !row.value) {
            // First time: initialize with defaults
            await this.saveCategories(DEFAULT_CODEX_CATEGORIES)
            return DEFAULT_CODEX_CATEGORIES
        }
        try {
            const parsed: CodexCategoryDefinition[] = JSON.parse(row.value)
            if (!Array.isArray(parsed) || parsed.length === 0) {
                await this.saveCategories(DEFAULT_CODEX_CATEGORIES)
                return DEFAULT_CODEX_CATEGORIES
            }

            // Bradley-approved 2026-10-16 amendment: Ensure built-in Character includes 'Pronouns' and 'Status'
            let categoriesUpdated = false
            for (const cat of parsed) {
                if ((cat.id === 'cat-character' || cat.name === 'Character') && Array.isArray(cat.defaultFields)) {
                    if (!cat.defaultFields.includes('Pronouns')) {
                        const fnIdx = cat.defaultFields.indexOf('Full Name')
                        cat.defaultFields.splice(fnIdx >= 0 ? fnIdx + 1 : 0, 0, 'Pronouns')
                        categoriesUpdated = true
                    }
                    if (!cat.defaultFields.includes('Status')) {
                        const pIdx = cat.defaultFields.indexOf('Pronouns')
                        cat.defaultFields.splice(pIdx >= 0 ? pIdx + 1 : 1, 0, 'Status')
                        categoriesUpdated = true
                    }
                }
            }

            // Ensure built-in 'Story Guide' category is present in configured categories
            if (!parsed.some(c => c.name.toLowerCase() === 'story guide')) {
                parsed.push({
                    id: 'cat-story-guide',
                    name: 'Story Guide',
                    icon: 'Compass',
                    color: '#6366f1',
                    defaultFields: ['State of the World', 'Central Conflict', 'Current Era / Setting', 'Key Factions', 'Themes'],
                    isBuiltIn: true
                })
                categoriesUpdated = true
            }

            if (categoriesUpdated) {
                await this.saveCategories(parsed)
            }

            return parsed
        } catch {
            await this.saveCategories(DEFAULT_CODEX_CATEGORIES)
            return DEFAULT_CODEX_CATEGORIES
        }
    }

    static async saveCategories(categories: CodexCategoryDefinition[]): Promise<void> {
        await db.appSettings.put({
            key: SETTINGS_CATEGORIES_KEY,
            value: JSON.stringify(categories),
            updatedAt: Date.now()
        })
    }

    static async addCategory(category: Omit<CodexCategoryDefinition, 'id'> & { id?: string }): Promise<CodexCategoryDefinition> {
        const categories = await this.getCategories()
        const id = category.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        const newCat: CodexCategoryDefinition = {
            id,
            name: category.name.trim(),
            icon: category.icon || 'Tag',
            color: category.color || '#8b5cf6',
            defaultFields: category.defaultFields || [],
            isBuiltIn: false
        }
        categories.push(newCat)
        await this.saveCategories(categories)
        return newCat
    }

    static async updateCategory(
        id: string,
        updates: Partial<CodexCategoryDefinition>,
        applyToExisting = false
    ): Promise<{ category: CodexCategoryDefinition; modifiedCount: number }> {
        const categories = await this.getCategories()
        const index = categories.findIndex(c => c.id === id)
        if (index === -1) throw new Error('Category not found')

        const oldName = categories[index].name
        const newName = updates.name ? updates.name.trim() : oldName

        categories[index] = {
            ...categories[index],
            ...updates,
            name: newName
        }

        await this.saveCategories(categories)

        let modifiedCount = 0
        if (applyToExisting && oldName !== newName) {
            modifiedCount = await db.bibleEntries
                .where('type')
                .equals(oldName)
                .modify({ type: newName, updatedAt: Date.now() })
        }

        return { category: categories[index], modifiedCount }
    }

    static async deleteCategory(id: string): Promise<void> {
        const categories = await this.getCategories()
        const filtered = categories.filter(c => c.id !== id)
        await this.saveCategories(filtered)
    }

    static async getCategoryByName(name: string): Promise<CodexCategoryDefinition | undefined> {
        const categories = await this.getCategories()
        return categories.find(c => c.name.toLowerCase() === name.toLowerCase())
    }

    // ==========================================
    // Relationship Types
    // ==========================================

    static async getRelationshipTypes(): Promise<RelationshipTypeDefinition[]> {
        const row = await db.appSettings.get(SETTINGS_RELATIONSHIP_TYPES_KEY)
        if (!row || !row.value) {
            await this.saveRelationshipTypes(DEFAULT_RELATIONSHIP_TYPES)
            return DEFAULT_RELATIONSHIP_TYPES
        }
        try {
            const parsed: RelationshipTypeDefinition[] = JSON.parse(row.value)
            if (!Array.isArray(parsed) || parsed.length === 0) {
                await this.saveRelationshipTypes(DEFAULT_RELATIONSHIP_TYPES)
                return DEFAULT_RELATIONSHIP_TYPES
            }

            // Bradley-approved 2026-10-16 amendment: Ensure newly introduced built-in types exist
            let typesUpdated = false
            for (const defType of DEFAULT_RELATIONSHIP_TYPES) {
                const exists = parsed.some(t => t.id === defType.id || t.name.toLowerCase() === defType.name.toLowerCase())
                if (!exists && defType.isBuiltIn) {
                    parsed.push(defType)
                    typesUpdated = true
                }
            }
            if (typesUpdated) {
                await this.saveRelationshipTypes(parsed)
            }

            return parsed
        } catch {
            await this.saveRelationshipTypes(DEFAULT_RELATIONSHIP_TYPES)
            return DEFAULT_RELATIONSHIP_TYPES
        }
    }

    static async saveRelationshipTypes(types: RelationshipTypeDefinition[]): Promise<void> {
        await db.appSettings.put({
            key: SETTINGS_RELATIONSHIP_TYPES_KEY,
            value: JSON.stringify(types),
            updatedAt: Date.now()
        })
    }

    static async addRelationshipType(relType: Omit<RelationshipTypeDefinition, 'id'> & { id?: string }): Promise<RelationshipTypeDefinition> {
        const types = await this.getRelationshipTypes()
        const id = relType.id || `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        const newType: RelationshipTypeDefinition = {
            id,
            name: relType.name.trim(),
            reverseName: relType.reverseName?.trim() || undefined,
            defaultDirection: relType.defaultDirection || 'outbound',
            color: relType.color || '#3b82f6',
            isBuiltIn: false
        }
        types.push(newType)
        await this.saveRelationshipTypes(types)
        return newType
    }

    static async updateRelationshipType(
        id: string,
        updates: Partial<RelationshipTypeDefinition>,
        applyToExisting = false
    ): Promise<{ relType: RelationshipTypeDefinition; modifiedCount: number }> {
        const types = await this.getRelationshipTypes()
        const index = types.findIndex(t => t.id === id)
        if (index === -1) throw new Error('Relationship type not found')

        const oldName = types[index].name
        const newName = updates.name ? updates.name.trim() : oldName

        types[index] = {
            ...types[index],
            ...updates,
            name: newName
        }

        await this.saveRelationshipTypes(types)

        let modifiedCount = 0
        if (applyToExisting && oldName !== newName) {
            modifiedCount = await db.relationships
                .where('type')
                .equals(oldName)
                .modify({ type: newName, updatedAt: Date.now() })
        }

        return { relType: types[index], modifiedCount }
    }

    static async deleteRelationshipType(id: string): Promise<void> {
        const types = await this.getRelationshipTypes()
        const filtered = types.filter(t => t.id !== id)
        await this.saveRelationshipTypes(filtered)
    }

    static async getRelationshipTypeByName(name: string): Promise<RelationshipTypeDefinition | undefined> {
        const types = await this.getRelationshipTypes()
        return types.find(t => t.name.toLowerCase() === name.toLowerCase())
    }

    // ==========================================
    // Field Maintenance & Schema Vocabulary
    // ==========================================

    /**
     * Safely backfills missing starter fields for entries without overwriting existing data.
     * Can target all entries in a novel, or entries of a specific category.
     */
    static async backfillStarterFields(novelId: string, categoryName?: string): Promise<{ entriesUpdated: number; fieldsAdded: number }> {
        const novel = await db.novels.get(novelId)
        const seriesId = novel?.seriesId

        const novelEntries = await db.bibleEntries.where('novelId').equals(novelId).toArray()
        let allEntries = [...novelEntries]
        if (seriesId) {
            const seriesEntries = await db.bibleEntries.where('seriesId').equals(seriesId).toArray()
            allEntries = [...allEntries, ...seriesEntries]
        }
        const uniqueEntries = Array.from(new Map(allEntries.map(e => [e.id, e])).values()).filter(e => !e.isTrashed)
        const targetEntries = categoryName
            ? uniqueEntries.filter(e => e.type.toLowerCase() === categoryName.toLowerCase())
            : uniqueEntries

        const categories = await this.getCategories()
        const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c]))

        let entriesUpdated = 0
        let fieldsAdded = 0

        for (const entry of targetEntries) {
            const cat = catMap.get(entry.type.toLowerCase())
            if (!cat || !cat.defaultFields || cat.defaultFields.length === 0) continue

            const existingFields = await db.fieldValues.where('entryId').equals(entry.id).toArray()
            const existingKeys = new Set(existingFields.map(f => f.fieldKey.toLowerCase()))

            const missingKeys = cat.defaultFields.filter(df => !existingKeys.has(df.toLowerCase()))
            if (missingKeys.length > 0) {
                for (const key of missingKeys) {
                    const now = Date.now()
                    await db.fieldValues.add({
                        id: `fv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        novelId: entry.novelId || novelId,
                        seriesId: entry.seriesId,
                        entryId: entry.id,
                        fieldKey: key,
                        value: '',
                        state: 'Canon',
                        validFrom: null,
                        validUntil: null,
                        provenance: [],
                        createdAt: now,
                        updatedAt: now
                    })
                    fieldsAdded++
                }
                entriesUpdated++
            }
        }

        return { entriesUpdated, fieldsAdded }
    }

    /**
     * Gathers the consolidated vocabulary of known field keys from built-in categories,
     * custom categories, and existing active entries.
     */
    static async getKnownFieldKeys(novelId?: string): Promise<string[]> {
        const defaultSet = new Set<string>([
            'Full Name', 'Pronouns', 'Status', 'Age', 'Eye Color', 'Hair Color', 'Occupation', 'Motivation', 'Flaw',
            'Description', 'Distinguishing Traits', 'Weaknesses', 'Population / Numbers', 'Notable Members',
            'Rules', 'Costs / Limitations', 'Who Can Use It', 'Dangers',
            'Participants', 'Stakes', 'Key Beats', 'Payoff',
            'Name', 'Region', 'Climate', 'Population', 'Key Landmarks',
            'Leader', 'Purpose', 'Headquarters', 'Members',
            'Concept', 'Origin', 'Limitations', 'Known Examples',
            'Item Type', 'Weight', 'Special Properties', 'Bearer',
            'Species', 'Habitat', 'Diet', 'Temperament', 'Abilities',
            'People', 'Language', 'Traditions', 'Beliefs', 'Social Structure',
            'Date / Era', 'Location', 'Key Participants', 'Outcome', 'Significance',
            'Source / Mechanism', 'Applications', 'Dangers / Limitations'
        ])

        try {
            const categories = await this.getCategories()
            for (const cat of categories) {
                for (const f of cat.defaultFields || []) {
                    if (f && f.trim()) defaultSet.add(f.trim())
                }
            }
        } catch {
            // fallback to preset
        }

        try {
            let query = db.fieldValues.toCollection()
            if (novelId) {
                query = db.fieldValues.where('novelId').equals(novelId)
            }
            const storedFields = await query.toArray()
            for (const sf of storedFields) {
                if (sf.fieldKey && sf.fieldKey.trim()) {
                    defaultSet.add(sf.fieldKey.trim())
                }
            }
        } catch {
            // continue
        }

        return Array.from(defaultSet).sort((a, b) => a.localeCompare(b))
    }
}
