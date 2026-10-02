import {defineConfig} from 'astro/config';
export default defineConfig({site:'https://ben-keller.github.io',base:'/energy-socials-analytics',output:'static',outDir:'./dist',build:{assets:'assets'},vite:{build:{target:'es2022'}}});
