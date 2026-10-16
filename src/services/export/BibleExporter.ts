import JSZip from 'jszip';
import { db } from '../../db/database';
import type { BibleEntry, FieldValue, Relationship } from '../../db/schema';
import { BibleService } from '../BibleService';
import { ExportService } from './ExportService';
import { stripHtmlToMarkdown } from './MarkdownExporter';

export interface BibleExportOptions {
    /** Include trashed entries in the export. Default: false. */
    includeTrashed?: boolean;
}

/**
 * Exports all codex (Bible) entries in a project to a zip archive
 * containing clean, standard Markdown files with YAML frontmatter.
 */
export class BibleExporter {
    static async exportBible(novelId: string, opts: BibleExportOptions = {}): Promise<Blob> {
        const { includeTrashed = false } = opts;

        // Resolve entries across both novel and series scopes using BibleService
        let entries: BibleEntry[] = [];
        if (includeTrashed) {
            const active = await BibleService.listActiveEntries(novelId);
            const trashed = await BibleService.listTrashedEntries(novelId);
            entries = [...active, ...trashed];
        } else {
            entries = await BibleService.listActiveEntries(novelId);
        }

        entries.sort((a: BibleEntry, b: BibleEntry) => (a.name || '').localeCompare(b.name || ''));

        // Preload entry map for relationship name resolution
        const entryNameMap = new Map<string, string>(entries.map(e => [e.id, e.name]));

        // Fetch relationships for the novel and series
        const novel = await db.novels.get(novelId);
        const seriesId = novel?.seriesId;
        const novelRels = await db.relationships.where({ novelId }).toArray();
        let seriesRels: Relationship[] = [];
        if (seriesId) {
            seriesRels = await db.relationships.where({ seriesId }).toArray();
        }
        const allRels = Array.from(new Map([...novelRels, ...seriesRels].map(r => [r.id, r])).values());

        const zip = new JSZip();
        const indexLines: string[] = ['# Codex Index', ''];

        for (const entry of entries) {
            // Query fields for this entry, excluding discarded fields
            const fields = await db.fieldValues
                .where('entryId').equals(entry.id)
                .filter(f => f.state !== 'Discarded')
                .toArray();

            // Find relationships concerning this entry
            const entryRels = allRels.filter(r =>
                r.state !== 'Discarded' &&
                (r.sourceId === entry.id || (r.isBidirectional && r.targetId === entry.id))
            );

            const md = this.renderEntry(entry, fields, entryRels, entryNameMap);
            const slug = this.slugify(entry.name, entry.id);
            const filePath = `${slug}/entry.md`;

            zip.file(filePath, md);
            indexLines.push(`- **${entry.type}** — [${entry.name}](${filePath}) (\`${slug}\`)`);
        }

        indexLines.push('', `_Exported ${new Date().toISOString()} — ${entries.length} entries._`);
        zip.file('codex-index.md', indexLines.join('\n'));

        return zip.generateAsync({ type: 'blob' });
    }

    static renderEntry(
        entry: BibleEntry,
        fields: FieldValue[],
        relationships: Relationship[] = [],
        entryNameMap: Map<string, string> = new Map()
    ): string {
        const fm: string[] = ['---'];
        fm.push(`type: ${escapeYaml(entry.type)}`);
        fm.push(`name: ${escapeYaml(entry.name)}`);
        fm.push(`id: ${escapeYaml(entry.id)}`);
        if (entry.aliases?.length) {
            fm.push('aliases:');
            for (const a of entry.aliases) fm.push(`  - ${escapeYaml(a)}`);
        }
        if (entry.tags?.length) {
            fm.push('tags:');
            for (const t of entry.tags) fm.push(`  - ${escapeYaml(t)}`);
        }
        if (entry.keywords?.length) {
            fm.push('keywords:');
            for (const k of entry.keywords) fm.push(`  - ${escapeYaml(k)}`);
        }
        fm.push(`alwaysIncludeInContext: ${!!entry.alwaysIncludeInContext}`);
        fm.push(`excludeFromContext: ${!!entry.excludeFromContext}`);
        fm.push(`doNotTrack: ${!!entry.doNotTrack}`);
        fm.push('---');

        const sections: string[] = [];

        if (entry.description?.trim()) {
            sections.push(`## Description\n\n${entry.description.trim()}`);
        }
        if (entry.researchNotes?.trim()) {
            sections.push(`## Research Notes\n\n${entry.researchNotes.trim()}`);
        }

        const validFields = fields
            .filter(f => f.value != null && String(f.value).trim().length > 0)
            .sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));

        if (validFields.length > 0) {
            const attrLines = validFields.map(f => {
                const val = this.fieldValueToMarkdown(f.value);
                const formattedVal = val.includes('\n')
                    ? '\n' + val.split('\n').map(l => `    ${l}`).join('\n')
                    : ` ${val.trim()}`;
                return `- **${f.fieldKey}**:${formattedVal}`;
            });
            sections.push(`## Attributes\n\n${attrLines.join('\n')}`);
        }

        if (relationships.length > 0) {
            const relLines = relationships.map(r => {
                const otherId = r.sourceId === entry.id ? r.targetId : r.sourceId;
                const otherName = entryNameMap.get(otherId) || 'Unknown Entity';
                const notesStr = r.notes?.trim() ? ` — ${r.notes.trim()}` : '';
                return `- **${r.type}**: [[${otherName}]]${notesStr}`;
            });
            sections.push(`## Relationships\n\n${relLines.join('\n')}`);
        }

        return fm.join('\n') + '\n\n' + sections.join('\n\n') + '\n';
    }

    static slugify(name: string, id: string): string {
        const base = (name || 'entry')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-+|-+$/g, '') || 'entry';
        return `${base}-${String(id).slice(0, 8)}`;
    }

    /**
     * Field values can be plain text, TipTap JSON, or other primitives.
     * Render each to markdown text.
     */
    static fieldValueToMarkdown(value: any): string {
        if (value == null) return '';
        if (typeof value === 'string') {
            const t = value.trim();
            if (t.startsWith('{') && t.includes('"type"')) {
                try {
                    return this.fieldValueToMarkdown(JSON.parse(t));
                } catch {
                    return value;
                }
            }
            return value;
        }
        if (typeof value === 'object') {
            if (value.type === 'doc' || Array.isArray(value.content)) {
                return stripHtmlToMarkdown(ExportService.renderSceneToHTML(value));
            }
            return JSON.stringify(value);
        }
        return String(value);
    }
}

function escapeYaml(s: string | undefined): string {
    if (s == null) return '""';
    return JSON.stringify(s);
}
