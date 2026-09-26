import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Node } from '@tiptap/pm/model'

export const codexHighlightKey = new PluginKey('codexHighlight')

export const LiveCodexHighlight = Extension.create({
    name: 'codexHighlight',

    addStorage() {
        return {
            entries: [], // Will hold the bibleEntries array dynamically assigned from React
        }
    },

    addProseMirrorPlugins() {
        const { editor } = this

        return [
            new Plugin({
                key: codexHighlightKey,
                state: {
                    init(_, { doc }) {
                        return getDecorations(doc, (editor.storage as any).codexHighlight.entries)
                    },
                    apply(tr, oldSet) {
                        const shouldUpdate = tr.getMeta('codexHighlightUpdate')
                        if (shouldUpdate || tr.docChanged) {
                            return getDecorations(tr.doc, (editor.storage as any).codexHighlight.entries)
                        }
                        return oldSet.map(tr.mapping, tr.doc)
                    }
                },
                props: {
                    decorations(state) {
                        return this.getState(state)
                    }
                }
            })
        ]
    }
})

function getDecorations(doc: Node, entries: any[]): DecorationSet {
    const decorations: Decoration[] = []

    if (!entries || entries.length === 0) {
        return DecorationSet.create(doc, decorations)
    }

    doc.descendants((node, pos) => {
        if (!node.isText) return

        const text = node.text || ''

        entries.forEach(entry => {
            const targets = [entry.name, ...(entry.aliases || [])].filter(Boolean)
            targets.forEach(t => {
                if (!t || t.trim().length < 3) return // Ignore very short phrases to prevent false-positives

                const safeT = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const regex = new RegExp(`\\b(${safeT})\\b`, 'gi')

                let match
                while ((match = regex.exec(text)) !== null) {
                    const start = pos + match.index
                    const end = start + match[0].length

                    let titleStr = `[${entry.type || 'Codex'}] ${entry.name}`
                    if (entry.summary) {
                        titleStr += `\n${entry.summary.substring(0, 150)}${entry.summary.length > 150 ? '...' : ''}`
                    }

                    decorations.push(
                        Decoration.inline(start, end, {
                            class: 'codex-live-highlight',
                            'data-id': entry.id,
                            'title': titleStr
                        })
                    )
                }
            })
        })
    })

    return DecorationSet.create(doc, decorations)
}
