import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: __dirname,
  server: {
    proxy: {
      // Forward /api/* to the Express backend so VITE_API_URL=/api works in dev (see .env.example).
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui-vendor';
          if (id.includes('@radix-ui')) return 'radix-vendor';
          if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('d3-')) return 'charts-vendor';
          if (id.includes('date-fns')) return 'date-vendor';
          if (id.includes('lucide-react') || id.includes('motion')) return 'ui-effects-vendor';
          return undefined;
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
