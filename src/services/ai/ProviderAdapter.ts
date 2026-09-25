export interface AIRequestPayload {
    modelId: string;
    systemInstruction: string;
    userPrompt: string;
    messages?: { role: 'system' | 'user' | 'assistant', content: string }[];
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
    [key: string]: any;
}

export interface AIResponse {
    content: string;
    totalTokens: number;
    id: string;
}

export interface ProviderAdapter {
    /**
     * The unique identifier for the provider adapter.
     */
    getProviderId(): string;

    /**
     * Dispatches a standardized request directly to the provider endpoint securely.
     */
    generate(payload: AIRequestPayload, apiKey: string): Promise<AIResponse>;
}
