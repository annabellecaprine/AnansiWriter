import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { AIRequestPayload, AIResponse } from './ai/ProviderAdapter'
import { OpenRouterProvider } from './ai/OpenRouterProvider'
import { ChutesProvider } from './ai/ChutesProvider'
import { OpenAICompatibleProvider } from './ai/OpenAICompatibleProvider'
import { OpenAIProvider } from './ai/OpenAIProvider'
import { ProxyConfigService } from './ProxyConfigService'

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

    static getProviderAdapter(providerName: string) {
        if (providerName === 'chutes') {
            return new ChutesProvider()
        } else if (providerName === 'openai-compatible' || providerName === 'proxy') {
            return new OpenAICompatibleProvider()
        } else if (providerName === 'openai') {
            return new OpenAIProvider()
        } else {
            return new OpenRouterProvider()
        }
    }

    static async testConnection(providerName: string, apiKey: string, baseUrl?: string, modelId?: string): Promise<{ success: boolean; message: string }> {
        try {
            const providerAdapter = this.getProviderAdapter(providerName)
            let testModel = modelId || 'gpt-4o-mini'
            if (!modelId && providerName === 'chutes') testModel = 'deepseek-ai/DeepSeek-V3'
            if (!modelId && providerName === 'openrouter') testModel = 'meta-llama/llama-3.1-8b-instruct:free'

            const payload: AIRequestPayload = {
                modelId: testModel,
                systemInstruction: 'You are a test ping. Respond with exactly the word "OK" and nothing else.',
                userPrompt: 'Respond with "OK".',
                maxTokens: 50,
                baseUrl
            }

            const response = await providerAdapter.generate(payload, apiKey)
            if (response.content || response.id) {
                return { success: true, message: `Connected! ${response.content ? `Response: ${response.content.trim()}` : '(Model returned empty body)'}` }
            } else {
                return { success: false, message: 'Provider returned a structural malformation.' }
            }
        } catch (err: any) {
            return { success: false, message: err.message || 'Connection failed.' }
        }
    }

    static async generate(
        novelId: string,
        systemInstruction: string,
        userPrompt: string,
        model: string = 'anthropic/claude-3-haiku',
        providerName: string = 'proxy',
        sourceId?: string,
        executedPromptSnapshot?: any,
        inputVariablesResolved?: Record<string, any>,
        messages?: { role: 'system' | 'user' | 'assistant', content: string }[]
    ): Promise<string> {

        // Check if an active proxy configuration exists in the ProxyConfigService
        const activeProxy = await ProxyConfigService.getActiveProxyConfig()

        let effectiveModel = model
        let effectiveApiKey = ''
        let effectiveBaseUrl = ''
        let providerAdapter

        if (activeProxy) {
            effectiveModel = activeProxy.model || model
            effectiveApiKey = activeProxy.apiKey || (await this.getApiKey('openai') || await this.getApiKey('chutes') || await this.getApiKey('openrouter') || '')
            effectiveBaseUrl = activeProxy.proxyUrl
            providerAdapter = new OpenAICompatibleProvider()
        } else {
            providerAdapter = this.getProviderAdapter(providerName)
            const key = await this.getApiKey(providerName)
            if (!key && providerName !== 'openai-compatible') {
                throw new Error(`No API key configured for ${providerName}. Please set one securely in settings.`)
            }
            effectiveApiKey = key || ''
            const customUrlDb = await db.appSettings.get(`baseUrl_${providerName}`)
            effectiveBaseUrl = customUrlDb?.value || ''
        }

        const payload: AIRequestPayload = {
            modelId: effectiveModel,
            systemInstruction: systemInstruction,
            userPrompt: userPrompt,
            baseUrl: effectiveBaseUrl,
            messages: messages
        }

        // The adapter ensures no global credentials mutate backward natively
        const response: AIResponse = await providerAdapter.generate(payload, effectiveApiKey)

        // Log to history tracking table
        await db.aiRequestHistory.add({
            id: uuidv4(),
            novelId,
            promptName: executedPromptSnapshot ? executedPromptSnapshot.name : 'Staging Invocation',
            executedPromptSnapshot,
            executionMetadata: {
                temperatureUsed: 0.7, // stub
                outputTokensUsed: response.totalTokens, // approx
                inputVariablesResolved: inputVariablesResolved || {}
            },
            modelId: effectiveModel,
            tokenCount: response.totalTokens,
            sourceId,
            timestamp: Date.now(),
            payload: { systemInstruction, userPrompt, response: response.content }
        })

        return response.content
    }
}
