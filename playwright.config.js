import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  use:{browserName:'chromium',headless:true},
  webServer:{
    command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173/FramefieldStudio/',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  },
  reporter:'list'
});
