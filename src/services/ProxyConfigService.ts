import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'

export interface ProxyConfig {
    id: string
    name: string
    proxyUrl: string
    apiKey: string
    model: string
    isActive: boolean
    updatedAt: number
}

const STORAGE_KEY = 'proxy_configurations'

export class ProxyConfigService {
    static async getProxyConfigs(): Promise<ProxyConfig[]> {
        const item = await db.appSettings.get(STORAGE_KEY)
        if (!item || !item.value) {
            return await this.seedDefaultProxies()
        }
        try {
            const configs: ProxyConfig[] = JSON.parse(item.value)
            if (!Array.isArray(configs) || configs.length === 0) {
                return await this.seedDefaultProxies()
            }
            return configs
        } catch {
            return await this.seedDefaultProxies()
        }
    }

    static async seedDefaultProxies(): Promise<ProxyConfig[]> {
        const defaultConfigs: ProxyConfig[] = [
            {
                id: 'default-chutes-glm',
                name: 'GLM 5.1 TEE FP8',
                proxyUrl: 'https://llm.chutes.ai/v1/chat/completions',
                apiKey: '',
                model: 'zai-org/GLM-5.1-TEE',
                isActive: true,
                updatedAt: Date.now()
            },
            {
                id: 'default-chutes-deepseek',
                name: 'Deepseek V3.2',
                proxyUrl: 'https://llm.chutes.ai/v1/chat/completions',
                apiKey: '',
                model: 'deepseek-ai/DeepSeek-V3.2-TEE',
                isActive: false,
                updatedAt: Date.now()
            },
            {
                id: 'default-chutes-llama',
                name: 'LLama R1 Distill',
                proxyUrl: 'https://llm.chutes.ai/v1/chat/completions',
                apiKey: '',
                model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
                isActive: false,
                updatedAt: Date.now()
            },
            {
                id: 'default-openrouter-sonnet',
                name: 'Claude 3.5 Sonnet (OpenRouter)',
                proxyUrl: 'https://openrouter.ai/api/v1/chat/completions',
                apiKey: '',
                model: 'anthropic/claude-3.5-sonnet',
                isActive: false,
                updatedAt: Date.now()
            },
            {
                id: 'default-local-lmstudio',
                name: 'Local LM Studio / Ollama',
                proxyUrl: 'http://localhost:1234/v1/chat/completions',
                apiKey: '',
                model: 'local-model',
                isActive: false,
                updatedAt: Date.now()
            }
        ]

        await this.saveAllProxyConfigs(defaultConfigs)
        return defaultConfigs
    }

    static async saveAllProxyConfigs(configs: ProxyConfig[]): Promise<void> {
        await db.appSettings.put({
            key: STORAGE_KEY,
            value: JSON.stringify(configs),
            updatedAt: Date.now()
        })
    }

    static async getActiveProxyConfig(): Promise<ProxyConfig | null> {
        const configs = await this.getProxyConfigs()
        const active = configs.find(c => c.isActive)
        return active || configs[0] || null
    }

    static async setActiveProxyConfig(id: string): Promise<ProxyConfig[]> {
        const configs = await this.getProxyConfigs()
        const updated = configs.map(c => ({
            ...c,
            isActive: c.id === id
        }))
        await this.saveAllProxyConfigs(updated)
        return updated
    }

    static async saveProxyConfig(config: Partial<ProxyConfig> & { name: string; proxyUrl: string; model: string }): Promise<ProxyConfig[]> {
        const configs = await this.getProxyConfigs()
        const targetId = config.id || uuidv4()
        const isFirst = configs.length === 0

        const existingIndex = configs.findIndex(c => c.id === targetId)

        const newRecord: ProxyConfig = {
            id: targetId,
            name: config.name || 'My Custom Proxy',
            proxyUrl: config.proxyUrl || 'https://proxy.com/v1/chat/completions',
            apiKey: config.apiKey || '',
            model: config.model || 'gpt-4',
            isActive: config.isActive ?? (existingIndex >= 0 ? configs[existingIndex].isActive : isFirst),
            updatedAt: Date.now()
        }

        if (existingIndex >= 0) {
            configs[existingIndex] = newRecord
        } else {
            configs.push(newRecord)
        }

        await this.saveAllProxyConfigs(configs)
        return configs
    }

    static async deleteProxyConfig(id: string): Promise<ProxyConfig[]> {
        const configs = await this.getProxyConfigs()
        const filtered = configs.filter(c => c.id !== id)
        if (filtered.length > 0 && !filtered.some(c => c.isActive)) {
            filtered[0].isActive = true
        }
        await this.saveAllProxyConfigs(filtered)
        return filtered
    }

    static async exportProxyConfigs(): Promise<void> {
        const configs = await this.getProxyConfigs()
        const json = JSON.stringify(configs, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `anansi_proxy_configurations_${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    static async importProxyConfigs(jsonContent: string): Promise<ProxyConfig[]> {
        const parsed = JSON.parse(jsonContent)
        if (!Array.isArray(parsed)) throw new Error('Invalid proxy configurations file.')

        const validated: ProxyConfig[] = parsed.map((item, idx) => ({
            id: item.id || uuidv4(),
            name: item.name || 'Imported Proxy',
            proxyUrl: item.proxyUrl || 'https://proxy.com/v1/chat/completions',
            apiKey: item.apiKey || '',
            model: item.model || 'gpt-4',
            isActive: Boolean(item.isActive || idx === 0),
            updatedAt: Date.now()
        }))

        await this.saveAllProxyConfigs(validated)
        return validated
    }
}
