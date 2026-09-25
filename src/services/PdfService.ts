import { db } from '../db/database'
import { EpubService } from './EpubService'

export interface PdfConfig {
    profile: 'manuscript' | 'reader' | 'custom'
    fontSize?: string
    lineSpacing?: string
}

export class PdfService {
    static async generatePdf(seriesId: string, _novelId: string, config: PdfConfig): Promise<void> {
        const book = await db.novels.get(seriesId)
        if (!book) throw new Error('Book not found')

        const chapters = await db.chapters.where({ seriesId }).sortBy('sortOrder')
        const allScenes = await db.scenes.where({ seriesId }).toArray()

        let htmlString = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${book.title}</title>
                    <style>
                        @page {
                            margin: 1in;
                        }
                        body {
                            font-family: ${config.profile === 'manuscript' ? 'Courier, monospace' : 'Georgia, serif'};
                            font-size: ${config.fontSize || '12pt'};
                            line-height: ${config.lineSpacing || (config.profile === 'manuscript' ? '2.0' : '1.5')};
                            color: #000;
                            margin: 0;
                            padding: 0;
                        }
                        
                        /* Manuscript requires strictly left-aligned jagged margins, others allow justified */
                        p {
                            text-align: ${config.profile === 'manuscript' ? 'left' : 'justify'};
                            text-indent: 0.5in;
                            margin: 0;
                        }
                        
                        h1 {
                            font-weight: bold;
                            text-align: center;
                            font-size: 24pt;
                            page-break-before: always;
                            margin-top: 3in;
                            margin-bottom: 2in;
                        }

                        hr {
                            border: 0;
                            text-align: center;
                            margin: 2em 0;
                        }
                        hr:after {
                            content: '${config.profile === 'manuscript' ? '#' : '***'}';
                            letter-spacing: 1em;
                        }

                        .title-page {
                            text-align: center;
                            height: 100vh;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            page-break-after: always;
                        }
                        
                        .title-page h1 {
                            margin: 0;
                            page-break-before: avoid;
                        }

                        /* Clear internal text stylings that don't belong in physical manuscripts */
                        a { color: inherit; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <div class="title-page">
                        <h1>${book.title}</h1>
                    </div>
        `

        for (const chap of chapters) {
            htmlString += `<h1>${chap.name}</h1>\n`

            const scenes = allScenes.filter(s => s.chapterId === chap.id).sort((a, b) => {
                return (a.narrativePosition?.sequence ?? a.sortOrder) - (b.narrativePosition?.sequence ?? b.sortOrder)
            })

            for (let j = 0; j < scenes.length; j++) {
                if (j > 0) htmlString += '<hr/>\n'
                // Reusing EpubService's XHTML TipTap parser which beautifully clears internal proprietary blocks.
                htmlString += EpubService.convertTipTapToXhtml(scenes[j].content)
            }
        }

        htmlString += `</body></html>`

        // Output to hidden iframe to trigger Print Dialog
        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'

        document.body.appendChild(iframe)

        const doc = iframe.contentWindow || iframe.contentDocument
        if (!doc) throw new Error("Could not spawn PDF binding container.")

        const contentDoc = (iframe.contentWindow?.document) || (iframe.contentDocument as Document)
        contentDoc.open()
        contentDoc.write(htmlString)
        contentDoc.close()

        // Wait to allow rendering / font bindings
        await new Promise(resolve => setTimeout(resolve, 500))

        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()

        // Cleanup after print dialog naturally dismounts
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe)
            }
        }, 10000)
    }
}
