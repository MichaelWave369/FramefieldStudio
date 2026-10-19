import {defineConfig} from 'vite';
// Automatic JSX runtime keeps components from crashing if they omit `import React`.
export default defineConfig({base:'/FramefieldStudio/',esbuild:{jsx:'automatic'}});
