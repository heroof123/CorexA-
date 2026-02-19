import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tauri-apps/api/tauri': path.resolve(__dirname, 'src/test/mocks/tauri.ts'),
      '@tauri-apps/api/core': path.resolve(__dirname, 'src/test/mocks/tauri.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'src/test/mocks/tauri.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
});
