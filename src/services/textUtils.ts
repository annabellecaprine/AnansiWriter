/**
 * Shared utility functions for deeply extracting and transforming text from TipTap JSON tree structures.
 */

export function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
}

export function extractExplicitLinks(node: any, result: { id: string, name: string }[]) {
    if (!node) return
    if (node.type === 'internalLink' && node.attrs?.id) {
        result.push({ id: node.attrs.id, name: node.attrs.name || 'Explicit Link' })
    }
    if (Array.isArray(node)) {
        node.forEach(n => extractExplicitLinks(n, result))
    }
    if (node.content) {
        extractExplicitLinks(node.content, result)
    }
}
