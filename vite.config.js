import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bind to 0.0.0.0 and accept any Host header so the dev server also works behind a proxy / remote preview.
const serverOptions = { host: '0.0.0.0', port: 5173, allowedHosts: true };

export default defineConfig({
    plugins: [react()],
    server: serverOptions,
    preview: { ...serverOptions, port: 4173 },
    test: { environment: 'jsdom', setupFiles: ['./tests/setup.js'], include: ['tests/**/*.test.{js,jsx}'] }
});
