export class CryptoService {
    /**
     * Derives an AES-GCM 256-bit key from a password using PBKDF2 with a random 16-byte salt.
     * Returns both the raw key bytes (as CryptoKey) and the salt used.
     */
    static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const enc = new TextEncoder()
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        )

        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as BufferSource,
                iterations: 210000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        )
    }

    /**
     * Encrypts a binary Blob using AES-GCM.
     * The resulting Blob contains:
     * [0..15] 16 bytes IV (Initialization Vector)
     * [16..31] 16 bytes Salt (for PBKDF2 derivation)
     * [32...] Ciphertext (encrypted ZIP payload) + Auth Tag
     */
    static async encryptBlob(blob: Blob, password: string): Promise<Blob> {
        const salt = window.crypto.getRandomValues(new Uint8Array(16))
        const iv = window.crypto.getRandomValues(new Uint8Array(12))

        const key = await this.deriveKey(password, salt)
        const buffer = await blob.arrayBuffer()

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            buffer
        )

        // Prepend IV and Salt to the ciphertext so they can be extracted during decryption
        // IV length = 12, Salt = 16 => Total Header = 28 bytes
        const finalBuffer = new Uint8Array(iv.length + salt.length + ciphertext.byteLength)
        finalBuffer.set(iv, 0)
        finalBuffer.set(salt, iv.length)
        finalBuffer.set(new Uint8Array(ciphertext), iv.length + salt.length)

        return new Blob([finalBuffer], { type: 'application/octet-stream' })
    }

    /**
     * Decrypts an encrypted binary Blob using the password.
     * Extracts the IV and Salt from the header natively.
     */
    static async decryptBlob(blob: Blob, password: string): Promise<Blob> {
        const buffer = await blob.arrayBuffer()
        if (buffer.byteLength < 28) {
            throw new Error('File is too small to be a valid encrypted archive.')
        }

        const dataBytes = new Uint8Array(buffer)
        const iv = dataBytes.slice(0, 12)
        const salt = dataBytes.slice(12, 28)
        const ciphertext = dataBytes.slice(28)

        let key: CryptoKey
        try {
            key = await this.deriveKey(password, salt)
        } catch (err) {
            throw new Error('Key derivation failed.')
        }

        try {
            const decryptBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                ciphertext
            )
            // Re-wrap as standard storyproject ZIP Application file
            return new Blob([decryptBuffer], { type: 'application/zip' })
        } catch (err: any) {
            throw new Error('INCORRECT_PASSWORD')
        }
    }

    /**
     * Checks heuristically whether a blob resembles our custom encrypted AES container.
     * Unencrypted JSZip blobs usually start with `PK` header.
     * Since pure AES-GCM output is pseudo-random, a `.storyproject` NOT starting with `PK`
     * strongly implies an encrypted binary layout, ensuring ImportService can branch explicitly.
     */
    static async isEncrypted(blob: Blob): Promise<boolean> {
        const header = await blob.slice(0, 2).text()
        return header !== 'PK'
    }
}
