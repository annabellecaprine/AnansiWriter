function extractAnalyticsDataFromJson(node, state = { text: [], links: [] }) {
    if (!node) return state
    if (typeof node === 'string') {
        state.text.push(node)
        return state
    }
    if (node.type === 'text' && node.text) {
        state.text.push(node.text)
        return state
    }
    if (node.type === 'internalLink') {
        if (node.attrs?.name) state.text.push(node.attrs.name)
        if (node.attrs?.id) state.links.push(node.attrs.id)
        return state
    }
    if (Array.isArray(node)) {
        node.forEach(n => extractAnalyticsDataFromJson(n, state))
        return state
    }
    if (node.content) {
        extractAnalyticsDataFromJson(node.content, state)
    }
    return state
}

const tiptapJson = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: [
                { type: 'text', text: 'Hello Arthur! This is ' },
                { type: 'internalLink', attrs: { id: 'uuid-123', name: 'King Arthur' } },
                { type: 'text', text: ' in the flesh.' }
            ]
        }
    ]
}

const result = extractAnalyticsDataFromJson(tiptapJson)
console.log("Extraction Test:", result)
console.log("Text join:", result.text.join(' '))

const searchTerms = ["Arthur", "King Arthur"]
const text = result.text.join(' ')
let matches = 0

searchTerms.forEach(term => {
    const safeT = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<=^|\\W)(${safeT})(?=$|\\W)`, 'gi')
    const regMatch = text.match(regex)
    if (regMatch) {
        console.log(`Matched '${term}':`, regMatch)
        matches += regMatch.length
    }
})
console.log("Total matched count:", matches)

const rawString = "Hello Arthur! This is King Arthur in the flesh."
const rawRes = extractAnalyticsDataFromJson(rawString)
console.log("String extraction:", rawRes)
