// Run ONLY against already-deployed GitHub Pages, never the Vite preview server.
// Invoke manually after the Pages deployment finishes, before a stable release.
import {defineConfig} from '@playwright/test';
const live=process.env.FRAMEFIELD_LIVE_URL||
  'https://michaelwave369.github.io/FramefieldStudio/';
if(!/^https:\/\//.test(live))throw Error('Live audit requires HTTPS.');
export default defineConfig({
  testDir:'./tests/live',
  timeout:30000,
  workers:1,
  retries:0,
  use:{browserName:'chromium',headless:true,baseURL:live,
    actionTimeout:12000,navigationTimeout:25000,
    trace:'retain-on-failure',screenshot:'only-on-failure'},
  reporter:[['list'],['html',{open:'never'}]]
});
