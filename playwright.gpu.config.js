import {defineConfig} from '@playwright/test';
// Dedicated Chromium GPU suite: opt-in software WebGL for headless CI only.
// Other browsers continue to use the existing software-editor compatibility tests.
export default defineConfig({
  testDir:'./tests/gpu',
  timeout:30000,
  workers:1,
  retries:process.env.CI?1:0,
  use:{
    browserName:'chromium',
    headless:true,
    launchOptions:{args:[
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]}
  },
  webServer:{
    command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173/FramefieldStudio/',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  },
  reporter:'list'
});
