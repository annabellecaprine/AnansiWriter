import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { AIRequestPayload, AIResponse } from './ai/ProviderAdapter'
import { OpenRouterProvider } from './ai/OpenRouterProvider'
import { ChutesProvider } from './ai/ChutesProvider'
import { OpenAICompatibleProvider } from './ai/OpenAICompatibleProvider'

export class AIService {

    // Credentials securely stored in decoupled IndexedDB table (not serialized into project JSONs)
    static async getApiKey(provider: string): Promise<string | null> {
        const setting = await db.appSettings.get(`api_key_${provider}`)
        return setting ? setting.value : null
    }

    static async setApiKey(provider: string, key: string) {
        await db.appSettings.put({
            key: `api_key_${provider}`,
            value: key,
            description: `Credential token for generic inference access on ${provider}. Maintained strictly locally.`,
            updatedAt: Date.now()
        })
    }

    static async generate(
        projectId: string,
        systemInstruction: string,
        userPrompt: string,
        model: string = 'anthropic/claude-3-haiku',
        providerName: string = 'openrouter',
        sourceId?: string
    ): Promise<string> {

        let providerAdapter;
        if (providerName === 'chutes') {
            providerAdapter = new ChutesProvider()
        } else if (providerName === 'openai-compatible') {
            providerAdapter = new OpenAICompatibleProvider()
        } else {
            providerAdapter = new OpenRouterProvider()
        }

        const key = await this.getApiKey(providerName)
        // Only require API key if not local endpoint
        if (!key && providerName !== 'openai-compatible') {
            throw new Error(`No API key configured for ${providerName}. Please set one securely in settings.`)
        }

        const customUrlDb = await db.appSettings.get(`baseUrl_${providerName}`)

        const payload: AIRequestPayload = {
            modelId: model,
            systemInstruction: systemInstruction,
            userPrompt: userPrompt,
            baseUrl: customUrlDb?.value
        }

        // The adapter ensures no global credentials mutate backward natively
        const response: AIResponse = await providerAdapter.generate(payload, key || "")

        // Log to history tracking table
        await db.aiRequestHistory.add({
            id: uuidv4(),
            projectId,
            promptName: 'Staging Invocation',
            modelId: model,
            tokenCount: response.totalTokens,
            sourceId,
            timestamp: Date.now(),
            payload: { systemInstruction, userPrompt, response: response.content }
        })

        return response.content
    }
}
