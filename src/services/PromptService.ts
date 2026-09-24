import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt } from '../db/schema'

export class PromptService {
    static async getPrompts(projectId?: string): Promise<Prompt[]> {
        if (!projectId) return await db.prompts.toArray()
        return await db.prompts.filter(p => !p.projectId || p.projectId === projectId || p.projectId === 'GLOBAL').toArray()
    }

    static async createPrompt(
        projectId: string,
        name: string,
        category: string = 'General',
        systemInstruction: string = 'You are a helpful AI writing assistant.',
        userTemplate: string = '{{content}}'
    ): Promise<string> {
        const id = uuidv4()
        await db.prompts.add({
            id,
            projectId,
            name,
            category,
            tags: [],
            description: 'Provide an overview of its behavior and boundaries here.',
            defaultModel: 'anthropic/claude-3-haiku',
            temperature: 0.7,
            maxOutputTokens: 2000,
            tokenBudget: 35000,
            systemInstruction,
            userTemplate,
            inputs: [
                { type: 'Scene', isRequired: true, isAutomatic: true }
            ],
            isFavorite: false,
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }

    static async updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<void> {
        await db.prompts.update(promptId, {
            ...updates,
            updatedAt: Date.now()
        })
    }

    static async deletePrompt(promptId: string): Promise<void> {
        await db.prompts.delete(promptId)
    }

    static async duplicatePrompt(prompt: Prompt): Promise<string> {
        const id = uuidv4()
        await db.prompts.add({
            ...prompt,
            id,
            name: `${prompt.name} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }
}
