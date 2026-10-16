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
        defaultFields: ['Full Name', 'Age', 'Eye Color', 'Hair Color', 'Occupation', 'Motivation', 'Flaw'],
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
        id: 'rel-sibling',
        name: 'Sibling Of',
        defaultDirection: 'bidirectional',
        color: '#8b5cf6',
        isBuiltIn: true
    },
    {
        id: 'rel-parent',
        name: 'Parent Of',
        reverseName: 'Child Of',
        defaultDirection: 'outbound',
        color: '#a855f7',
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
            const parsed = JSON.parse(row.value)
            if (!Array.isArray(parsed) || parsed.length === 0) {
                await this.saveCategories(DEFAULT_CODEX_CATEGORIES)
                return DEFAULT_CODEX_CATEGORIES
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
            const parsed = JSON.parse(row.value)
            if (!Array.isArray(parsed) || parsed.length === 0) {
                await this.saveRelationshipTypes(DEFAULT_RELATIONSHIP_TYPES)
                return DEFAULT_RELATIONSHIP_TYPES
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
}
