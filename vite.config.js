import { defineConfig } from 'vite'

export default defineConfig({
  // Configure the root to be the current directory
  root: './',
  // Define build options if needed
  build: {
    outDir: 'dist', // Output directory for the build
  },
  // Configure server for local development
  server: {
    port: 8080, // Or any port you prefer
    open: '/index.html' // Open index.html when server starts
  }
}) 