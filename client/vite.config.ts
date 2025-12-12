import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/imageinf/ui/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'localhost',
      'cep.test',
      '.tacc.utexas.edu', // Allow all *.tacc.utexas.edu domains
    ],
  },
});
