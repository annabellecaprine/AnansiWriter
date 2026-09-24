import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { db } from '../db/database'

export class DocxService {

    // Core logic mapping TipTap nodes into Docx Elements
    private static processNode(node: any): any[] {
        if (!node) return []

        switch (node.type) {
            case 'paragraph':
                return [new Paragraph({
                    children: (node.content || []).map((child: any) => this.processRun(child))
                })]
            case 'heading':
                let level: any = HeadingLevel.HEADING_1
                if (node.attrs?.level === 2) level = HeadingLevel.HEADING_2
                if (node.attrs?.level === 3) level = HeadingLevel.HEADING_3
                return [new Paragraph({
                    text: this.extractText(node),
                    heading: level
                })]
            case 'bulletList':
                return (node.content || []).map((li: any) => new Paragraph({
                    text: this.extractText(li),
                    bullet: { level: 0 }
                }))
            case 'orderedList':
                return (node.content || []).map((li: any, idx: number) => new Paragraph({
                    text: `${idx + 1}. ${this.extractText(li)}`
                }))
            default:
                if (node.content) {
                    return node.content.flatMap((c: any) => this.processNode(c))
                }
                return []
        }
    }

    private static processRun(node: any): TextRun {
        if (node.type === 'text') {
            const isBold = node.marks?.some((m: any) => m.type === 'bold')
            const isItalic = node.marks?.some((m: any) => m.type === 'italic')
            const isStrike = node.marks?.some((m: any) => m.type === 'strike')

            return new TextRun({
                text: node.text,
                bold: isBold,
                italics: isItalic,
                strike: isStrike
            })
        }

        if (node.type === 'internalLink') {
            // Stripped representation of the linked entity natively for print format
            return new TextRun({
                text: node.attrs?.name ? node.attrs.name : ''
            })
        }

        return new TextRun({ text: '' })
    }

    private static extractText(node: any): string {
        if (!node) return ''
        if (node.type === 'text') return node.text || ''
        if (node.type === 'internalLink') return node.attrs?.name || ''
        if (node.content) return node.content.map((c: any) => this.extractText(c)).join('')
        return ''
    }

    /**
     * Exports a specific Book (or Series) combining all child chapters and scenes
     */
    static async exportBookToDocx(projectId: string, bookId: string): Promise<Blob> {
        const book = await db.books.get(bookId)
        if (!book) throw new Error("Book not found")

        const chapters = await db.chapters.where({ bookId }).toArray()
        chapters.sort((a, b) => a.sortOrder - b.sortOrder)

        const allScenes = await db.scenes.where({ projectId }).toArray()

        let docChildren: any[] = []

        docChildren.push(new Paragraph({
            text: book.name,
            heading: HeadingLevel.TITLE
        }))

        for (const chapter of chapters) {
            docChildren.push(new Paragraph({
                text: chapter.name,
                heading: HeadingLevel.HEADING_1,
                pageBreakBefore: true
            }))

            const scenes = allScenes.filter(s => s.chapterId === chapter.id).sort((a, b) => a.sortOrder - b.sortOrder)

            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i]

                // Scene separator if multiple scenes exist
                if (i > 0) {
                    docChildren.push(new Paragraph({ text: '***', alignment: 'center' }))
                    // Spacer
                    docChildren.push(new Paragraph({ text: '' }))
                }

                const docNodes = this.processNode(scene.content)
                docChildren = docChildren.concat(docNodes)
            }
        }

        const doc = new Document({
            sections: [{
                children: docChildren
            }]
        })

        return Packer.toBlob(doc)
    }
}
