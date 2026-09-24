import mammoth from 'mammoth'
import { generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'

export class DocxImportService {
    /**
     * Converts a raw docx blob into TipTap JSON using Mammoth HTML intermediaries.
     */
    static async importDocxToTipTap(file: File | Blob): Promise<any> {
        const arrayBuffer = await file.arrayBuffer()

        // Use Mammoth to convert the raw Buffer into HTML
        const result = await mammoth.convertToHtml({ arrayBuffer })

        let html = result.value

        // Mammoth often returns extremely barebones HTML which TipTap correctly parses securely
        // Replace empty paragraphs with true line breaks if mammoth collapsed them
        html = html.replace(/<p><\/p>/g, '<p><br></p>')

        // Rely on serverless TipTap parsing offline mapping HTML -> JSON AST
        const jsonOutput = generateJSON(html, [
            StarterKit
        ])

        return jsonOutput
    }
}
