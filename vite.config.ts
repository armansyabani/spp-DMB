import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Pisahkan library besar ke chunk sendiri supaya file JS utama tidak
      // menggendong semuanya (Firebase, jsPDF/html2canvas, ikon) dalam satu
      // bundle raksasa — mempercepat load pertama kali di HP wali santri
      // dengan koneksi lambat.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            pdf: ['jspdf', 'jspdf-autotable', 'qrcode'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
