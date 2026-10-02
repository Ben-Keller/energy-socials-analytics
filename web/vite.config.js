import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'../site',emptyOutDir:false,target:'es2022',rollupOptions:{output:{manualChunks:{d3:['d3']}}}}});
