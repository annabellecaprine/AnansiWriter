import type { ProviderAdapter, AIRequestPayload, AIResponse } from './ProviderAdapter';

export class OpenAIProvider implements ProviderAdapter {
    getProviderId(): string {
        return 'openai';
    }

    async generate(payload: AIRequestPayload, apiKey: string): Promise<AIResponse> {
        if (!apiKey) throw new Error("OpenAI API key missing. Ensure credentials are set in settings.");

        const baseUrl = payload.baseUrl || "https://api.openai.com/v1";
        const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: payload.modelId || 'gpt-4o-mini',
                temperature: payload.temperature ?? 0.7,
                messages: payload.messages && payload.messages.length > 0 ? payload.messages : [
                    { role: "system", content: payload.systemInstruction },
                    { role: "user", content: payload.userPrompt }
                ]
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenAI Request failed [${res.status}]: ${err}`);
        }

        const data = await res.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            totalTokens: data.usage?.total_tokens || 0,
            id: data.id || ''
        };
    }
}
