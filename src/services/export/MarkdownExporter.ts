import type { ExportPackage } from './ExportService';
import { ExportService } from './ExportService';

/**
 * Strips superficial HTML tags natively for clean markdown text layouts.
 * Specifically converts basic TipTap html back into plaintext equivalents.
 */
function stripHtmlToMarkdown(htmlText: string): string {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    let md = '';
    doc.body.childNodes.forEach((node) => {
        if (node.nodeName === 'P') {
            md += node.textContent + '\n\n';
        } else if (node.nodeName === 'H1') {
            md += '# ' + node.textContent + '\n\n';
        } else if (node.nodeName === 'H2') {
            md += '## ' + node.textContent + '\n\n';
        } else if (node.nodeName === 'H3') {
            md += '### ' + node.textContent + '\n\n';
        } else {
            md += (node.textContent || '') + '\n\n';
        }
    });
    return md.trim();
}

export class MarkdownExporter {
    /**
     * Maps an entire ExportPackage into a single unified Markdown string. 
     * Applies `# Novel`, `## Act`, `### Chapter` and `* * *` Scene breaks.
     */
    static generateMarkdown(pkg: ExportPackage): string {
        let md = `# ${pkg.novel.title}\n\n`;

        // We track orphaned chapters (no act), if the user isn't using acts.
        const acts = [...pkg.acts];
        const unassignedChapters = pkg.chapters.filter(c => !c.actId);

        // Render unassigned chapters first
        for (const chap of unassignedChapters) {
            md += `### ${chap.name}\n\n`;
            const chapScenes = pkg.scenes.filter(s => s.chapterId === chap.id).sort((a, b) => a.sortOrder - b.sortOrder);
            for (let i = 0; i < chapScenes.length; i++) {
                const s = chapScenes[i];
                const html = ExportService.renderSceneToHTML(s.content);
                md += stripHtmlToMarkdown(html) + '\n\n';

                // Add split separator if it's not the last scene
                if (i < chapScenes.length - 1) {
                    md += `* * *\n\n`;
                }
            }
        }

        // Render explicit Acts
        for (const act of acts.sort((a, b) => a.sortOrder - b.sortOrder)) {
            md += `## ${act.name}\n\n`;
            const actChapters = pkg.chapters.filter(c => c.actId === act.id).sort((a, b) => a.sortOrder - b.sortOrder);

            for (const chap of actChapters) {
                md += `### ${chap.name}\n\n`;
                const chapScenes = pkg.scenes.filter(s => s.chapterId === chap.id).sort((a, b) => a.sortOrder - b.sortOrder);
                for (let i = 0; i < chapScenes.length; i++) {
                    const s = chapScenes[i];
                    const html = ExportService.renderSceneToHTML(s.content);
                    md += stripHtmlToMarkdown(html) + '\n\n';

                    if (i < chapScenes.length - 1) {
                        md += `* * *\n\n`;
                    }
                }
            }
        }

        return md.trim();
    }
}
