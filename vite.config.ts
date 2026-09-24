import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages deploys to https://<user>.github.io/<repo>/
// Set base to the repo name so asset paths resolve correctly.
// For a user/org root page (username.github.io), change to '/'.
const base = process.env.VITE_BASE_PATH ?? '/AnansiWriter/'

export default defineConfig({
    plugins: [react()],
    base,
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
})
