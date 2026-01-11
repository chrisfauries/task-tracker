/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true, // Allows using describe, it, expect without importing
    environment: 'jsdom', // Simulates browser DOM
    setupFiles: './src/setupTests.ts', // (Optional) For global setups like jest-dom
  },
})
