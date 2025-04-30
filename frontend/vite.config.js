// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Подключаем плагин React
  server: {
    port: 3000, // Опционально: задаем порт для сервера разработки (как у CRA)
    open: true    // Опционально: автоматически открывать браузер при запуске
  },
  build: {
    outDir: 'build' // Опционально: Указываем папку для сборки (как у CRA)
  }
});