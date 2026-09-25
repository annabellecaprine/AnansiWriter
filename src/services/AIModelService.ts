import { db } from '../db/database'
import type { AIModel } from '../db/schema'
import { v4 as uuidv4 } from 'uuid'

export class AIModelService {
    static async getAllModels(): Promise<AIModel[]> {
        const models = await db.aiModels.toArray()
        if (models.length === 0) {
            return await this.seedDefaultModels()
        }
        return models
    }

    static async seedDefaultModels(): Promise<AIModel[]> {
        const defaultModels: Omit<AIModel, 'id'>[] = [
            {
                novelId: 'global',
                provider: 'openrouter',
                modelId: 'anthropic/claude-3.5-sonnet',
                name: 'Claude 3.5 Sonnet',
                maxContextTokens: 200000,
                defaultTemperature: 0.7,
                hasVision: true,
                tags: ['General', 'Writing', 'Brainstorming'],
                isEnabled: true,
                costPer1kInput: 0.003,
                costPer1kOutput: 0.015
            },
            {
                novelId: 'global',
                provider: 'openrouter',
                modelId: 'meta-llama/llama-3.1-8b-instruct:free',
                name: 'Llama 3.1 8B (Free)',
                maxContextTokens: 131072,
                defaultTemperature: 0.7,
                hasVision: false,
                tags: ['Fast', 'Cheap', 'General'],
                isEnabled: true,
                costPer1kInput: 0.0,
                costPer1kOutput: 0.0
            },
            {
                novelId: 'global',
                provider: 'chutes',
                modelId: 'deepseek-ai/DeepSeek-V3',
                name: 'DeepSeek V3 (Chutes)',
                maxContextTokens: 64000,
                defaultTemperature: 0.7,
                hasVision: false,
                tags: ['Writing', 'Long context'],
                isEnabled: true,
                costPer1kInput: 0.00027,
                costPer1kOutput: 0.0011
            },
            {
                novelId: 'global',
                provider: 'openai',
                modelId: 'gpt-4o-mini',
                name: 'GPT-4o Mini',
                maxContextTokens: 128000,
                defaultTemperature: 0.7,
                hasVision: true,
                tags: ['Fast', 'Cheap', 'Editing'],
                isEnabled: true,
                costPer1kInput: 0.00015,
                costPer1kOutput: 0.0006
            },
            {
                novelId: 'global',
                provider: 'openai-compatible',
                modelId: 'local-model',
                name: 'Local LLM (LM Studio / Ollama)',
                maxContextTokens: 32768,
                defaultTemperature: 0.7,
                hasVision: false,
                tags: ['Local', 'Private', 'Offline'],
                isEnabled: true,
                costPer1kInput: 0.0,
                costPer1kOutput: 0.0
            }
        ]

        const created: AIModel[] = []
        for (const model of defaultModels) {
            const record: AIModel = { id: uuidv4(), ...model }
            await db.aiModels.put(record)
            created.push(record)
        }
        return created
    }

    static async saveModel(model: AIModel): Promise<void> {
        await db.aiModels.put(model)
    }

    static async deleteModel(id: string): Promise<void> {
        await db.aiModels.delete(id)
    }

    static async toggleModelEnabled(id: string, isEnabled: boolean): Promise<void> {
        const model = await db.aiModels.get(id)
        if (model) {
            await db.aiModels.update(id, { isEnabled })
        }
    }
}
