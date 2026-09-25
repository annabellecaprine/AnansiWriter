import type { ExportPackage } from './ExportService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';

export class DocxExporter {
    /**
     * Traverses the TipTap JSON tree explicitly translating text formatting rules into exact DOCX runs
     */
    private static parseTipTapNodeToDocxParagraph(node: any): Paragraph[] {
        if (!node || !node.content) return [];

        const output: Paragraph[] = [];

        for (const block of node.content) {
            if (block.type === 'paragraph' || block.type === 'heading') {
                const runs: TextRun[] = [];

                if (block.content) {
                    for (const textNode of block.content) {
                        if (textNode.type === 'text') {
                            const isBold = textNode.marks?.some((m: any) => m.type === 'bold');
                            const isItalic = textNode.marks?.some((m: any) => m.type === 'italic');
                            const isStrike = textNode.marks?.some((m: any) => m.type === 'strike');

                            runs.push(new TextRun({
                                text: textNode.text || '',
                                bold: isBold,
                                italics: isItalic,
                                strike: isStrike
                            }));
                        }
                    }
                }

                if (block.type === 'heading') {
                    const level = block.attrs?.level;
                    const docxLevel = level === 1 ? HeadingLevel.HEADING_1 :
                        level === 2 ? HeadingLevel.HEADING_2 :
                            HeadingLevel.HEADING_3;
                    output.push(new Paragraph({ children: runs, heading: docxLevel, spacing: { after: 200 } }));
                } else {
                    // Standard Paragraph
                    output.push(new Paragraph({ children: runs, spacing: { after: 200 } }));
                }
            }
        }

        return output;
    }

    /**
     * Maps an entire ExportPackage into a compliant docx.Document object.
     */
    static generateDocx(pkg: ExportPackage): Document {
        const sections: any[] = [];
        let currentChildren: any[] = [];

        // Title Page
        currentChildren.push(new Paragraph({
            text: pkg.novel.title,
            heading: HeadingLevel.TITLE,
            alignment: 'center',
            spacing: { before: 2000, after: 1000 }
        }));

        if (pkg.novel.author) {
            currentChildren.push(new Paragraph({
                text: pkg.novel.author,
                heading: HeadingLevel.HEADING_1,
                alignment: 'center'
            }));
        }

        currentChildren.push(new Paragraph({ children: [new PageBreak()] }));

        // Standard hierarchy compilation
        const acts = [...pkg.acts];
        const unassignedChapters = pkg.chapters.filter(c => !c.actId);

        const addChapters = (chaptersArr: any[]) => {
            for (const chap of chaptersArr) {
                currentChildren.push(new Paragraph({
                    text: chap.name,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 }
                }));

                const chapScenes = pkg.scenes.filter(s => s.chapterId === chap.id).sort((a, b) => a.sortOrder - b.sortOrder);
                for (let i = 0; i < chapScenes.length; i++) {
                    const s = chapScenes[i];
                    const docxParagraphs = this.parseTipTapNodeToDocxParagraph(s.content);
                    currentChildren.push(...docxParagraphs);

                    if (i < chapScenes.length - 1) {
                        currentChildren.push(new Paragraph({
                            text: "* * *",
                            alignment: 'center',
                            spacing: { before: 200, after: 200 }
                        }));
                    }
                }
                currentChildren.push(new Paragraph({ children: [new PageBreak()] }));
            }
        };

        addChapters(unassignedChapters);

        for (const act of acts.sort((a, b) => a.sortOrder - b.sortOrder)) {
            currentChildren.push(new Paragraph({
                text: act.name,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            }));

            const actChapters = pkg.chapters.filter(c => c.actId === act.id).sort((a, b) => a.sortOrder - b.sortOrder);
            addChapters(actChapters);
        }

        sections.push({
            properties: {},
            children: currentChildren
        });

        const doc = new Document({
            sections: sections
        });

        return doc;
    }

    /**
     * Executes the Document packer into a raw Javascript Blob suitable for downloading locally
     */
    static async generateBlob(pkg: ExportPackage): Promise<Blob> {
        const doc = this.generateDocx(pkg);
        const blob = await Packer.toBlob(doc);
        return blob;
    }
}
