import { defineConfig } from 'vite'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    adonisjs({
      entrypoints: ['resources/css/app.css', 'resources/js/app.js'],

      reload: ['resources/views/**/*.edge'],
    }),
  ],

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },

  optimizeDeps: {
    noDiscovery: true,
    include: [
      'alpinejs',
      '@hotwired/turbo',
      'tom-select',
      'codemirror',
      '@codemirror/lang-html',
      '@codemirror/autocomplete',
      '@codemirror/commands',
      '@codemirror/view',
    ],
  },
})
