// Focused desktop release compatibility suite for Firefox and WebKit.
// Chromium already runs the complete 35-test studio E2E suite.
import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/compat',
  timeout:20000,
  workers:process.env.CI?1:undefined,
  retries:0,
  projects:[
    {name:'firefox',use:{browserName:'firefox'}},
    {name:'webkit',use:{browserName:'webkit'}}
  ],
  use:{
    headless:true,viewport:{width:1280,height:800},acceptDownloads:true,
    actionTimeout:9000,trace:'retain-on-failure',screenshot:'only-on-failure'
  },
  webServer:{
    command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173/FramefieldStudio/',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  },
  reporter:'list'
});
