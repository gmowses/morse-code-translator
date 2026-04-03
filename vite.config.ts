import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/morse-code-translator/',
  plugins: [react(), tailwindcss()],
})
