import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt, PromptCategory } from '../db/schema'

export class PromptService {
    // ─────────────────────────────────────────────────────────
    // Categories
    // ─────────────────────────────────────────────────────────
    static async getCategories(novelId?: string): Promise<PromptCategory[]> {
        const all = await db.promptCategories.toArray()
        // Return globals + project specific
        return all.filter(c => !c.novelId || c.novelId === novelId).sort((a, b) => a.sortOrder - b.sortOrder)
    }

    static async createCategory(name: string, isSystem: boolean = false, novelId?: string): Promise<string> {
        const id = uuidv4()
        const count = await db.promptCategories.count()
        await db.promptCategories.add({
            id,
            novelId,
            name,
            sortOrder: count,
            isSystem
        })
        return id
    }

    static async updateCategory(id: string, updates: Partial<PromptCategory>): Promise<void> {
        await db.promptCategories.update(id, updates)
    }

    static async deleteCategory(id: string, fallbackCategoryId: string): Promise<void> {
        const cat = await db.promptCategories.get(id)
        if (cat?.isSystem) throw new Error("Cannot delete a system/built-in category.")

        // Move all prompts to the fallback category
        const prompts = await db.prompts.where({ categoryId: id }).toArray()
        for (const p of prompts) {
            await db.prompts.update(p.id, { categoryId: fallbackCategoryId, updatedAt: Date.now() })
        }
        await db.promptCategories.delete(id)
    }

    // ─────────────────────────────────────────────────────────
    // Prompts
    // ─────────────────────────────────────────────────────────
    static async getPrompts(novelId?: string, includeTrashed: boolean = false): Promise<Prompt[]> {
        const all = await db.prompts.toArray()
        return all.filter(p => {
            if (!includeTrashed && p.isTrashed) return false
            if (p.scope === 'built-in' || p.scope === 'global') return true
            return p.novelId === novelId
        })
    }

    static async createPrompt(
        name: string,
        categoryId: string,
        scope: 'built-in' | 'global' | 'project',
        novelId?: string
    ): Promise<string> {
        const id = uuidv4()
        await db.prompts.add({
            id,
            novelId: scope === 'project' ? novelId : undefined,
            scope,
            categoryId,
            name,
            tags: [],
            description: '',
            outputMode: 'chat',
            defaultModel: 'anthropic/claude-3-haiku',
            allowedModels: [],
            temperature: 0.7,
            maxOutputTokens: 2000,
            tokenBudget: 35000,
            systemInstruction: 'You are a helpful AI writing assistant.',
            userTemplate: '{{content}}',
            inputs: [],
            isFavorite: false,
            isEnabled: true,
            isTrashed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }

    static async updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<void> {
        const existing = await db.prompts.get(promptId)
        if (existing?.scope === 'built-in') throw new Error("Cannot modify a built-in prompt.")

        await db.prompts.update(promptId, {
            ...updates,
            updatedAt: Date.now()
        })
    }

    static async softDeletePrompt(promptId: string): Promise<void> {
        const existing = await db.prompts.get(promptId)
        if (existing?.scope === 'built-in') throw new Error("Cannot delete a built-in prompt.")

        await db.prompts.update(promptId, {
            isTrashed: true,
            trashedAt: Date.now(),
            updatedAt: Date.now()
        })
    }

    static async restorePrompt(promptId: string): Promise<void> {
        await db.prompts.update(promptId, {
            isTrashed: false,
            trashedAt: undefined,
            updatedAt: Date.now()
        })
    }

    static async permanentDeletePrompt(promptId: string): Promise<void> {
        await db.prompts.delete(promptId)
    }

    static async duplicatePrompt(prompt: Prompt, targetScope: 'global' | 'project', targetProjectId?: string): Promise<string> {
        const id = uuidv4()
        await db.prompts.add({
            ...prompt,
            id,
            scope: targetScope,
            novelId: targetScope === 'project' ? targetProjectId : undefined,
            name: `${prompt.name} (Copy)`,
            isTrashed: false,
            trashedAt: undefined,
            isFavorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }

    // ─────────────────────────────────────────────────────────
    // Import / Export
    // ─────────────────────────────────────────────────────────
    // Basic transactional stubs - to be fleshed out with UI conflict views
    static async exportPrompts(promptIds: string[]): Promise<string> {
        const prompts = await Promise.all(promptIds.map(id => db.prompts.get(id)))
        return JSON.stringify(prompts.filter(Boolean), null, 2)
    }
}
