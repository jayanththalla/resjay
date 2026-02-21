import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'popup.html'),
                sidepanel: resolve(__dirname, 'sidepanel.html'),
                background: resolve(__dirname, 'src/background.ts'),
                autofill: resolve(__dirname, 'src/content-script.ts'),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    const name = chunkInfo.name;
                    if (name === 'background' || name === 'autofill') {
                        return '[name].js';
                    }
                    return '[name]-[hash].js';
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
        target: 'esnext',
        minify: false,
        sourcemap: true,
    },
});
