import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  // Fail promptly on stalled browser workflows so CI exposes the problem.
  timeout:10000,
  workers:process.env.CI?2:undefined,
  use:{browserName:'chromium',headless:true},
  webServer:{
    command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173/FramefieldStudio/',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  },
  reporter:'list'
});
