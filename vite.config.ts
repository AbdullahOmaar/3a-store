import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// بيانات البناء بتتحقن وقت البناء نفسه (قاعدة المالك 2026-11-25: الإصدار ووقت النشر
// بيظهروا داخل التطبيق مبنيين من بيانات البناء، مش مكتوبين يدوي)
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
