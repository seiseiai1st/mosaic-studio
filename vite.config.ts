import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sites-worker-entry',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'server/index.js',
          source: `export default { async fetch(request, env) { return env.ASSETS.fetch(request) } }`,
        })
      },
    },
  ],
})
