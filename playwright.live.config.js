// Run ONLY against already-deployed GitHub Pages, never the Vite preview server.
// Invoked automatically after a successful Pages deployment, or manually.
import {defineConfig} from '@playwright/test';
const live=process.env.FRAMEFIELD_LIVE_URL||
  'https://michaelwave369.github.io/FramefieldStudio/';
if(!/^https:\/\//.test(live))throw Error('Live audit requires HTTPS.');
export default defineConfig({
  testDir:'./tests/live',
  timeout:30000,
  workers:1,
  retries:0,
  projects:[
    {name:'chromium',use:{browserName:'chromium'}},
    {name:'firefox',use:{browserName:'firefox'}},
    {name:'webkit',use:{browserName:'webkit'}}
  ],
  use:{headless:true,baseURL:live,
    actionTimeout:12000,navigationTimeout:25000,
    trace:'retain-on-failure',screenshot:'only-on-failure'},
  reporter:[['list'],['html',{open:'never'}]]
});
