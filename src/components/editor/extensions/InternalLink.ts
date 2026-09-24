import { Node, mergeAttributes } from '@tiptap/core'

export interface InternalLinkOptions {
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        internalLink: {
            /**
             * Set an internal link node
             */
            setInternalLink: (options: { id: string, name: string, type: string }) => ReturnType
        }
    }
}

export const InternalLink = Node.create<InternalLinkOptions>({
    name: 'internalLink',
    group: 'inline',
    inline: true,
    selectable: true,
    atom: true, // Acts as a single impassable unit

    addAttributes() {
        return {
            id: {
                default: null,
            },
            name: {
                default: null,
            },
            type: {
                default: 'Entity',
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-internal-link]',
            },
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-internal-link': '',
                'data-id': node.attrs.id,
                'data-type': node.attrs.type,
                class: 'internal-link-chip',
                style: 'background: var(--color-surface-hover); color: var(--color-primary); padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.9em; cursor: pointer; user-select: none;'
            }),
            `@${node.attrs.name}`,
        ]
    },

    addCommands() {
        return {
            setInternalLink: options => ({ chain }) => {
                return chain()
                    .insertContent({
                        type: this.name,
                        attrs: options,
                    })
                    .insertContent(' ') // Add a space after the chip
                    .run()
            },
        }
    },
})
