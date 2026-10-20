import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReleaseInfo,verifyReleaseInfo,assetReferences,RELEASE_PHASE,PAGES_BASE}
  from '../scripts/release-metadata.mjs';
const sha='0123456789abcdef0123456789abcdef01234567';
test('release manifest is intentionally a candidate until manual acceptance',()=>{
 const m=buildReleaseInfo('0.1.0',sha,'2026-10-19T23:00:00.000Z');
 assert.equal(m.phase,'candidate');assert.equal(RELEASE_PHASE,'candidate');
 assert.equal(m.base,PAGES_BASE);assert.equal(m.commit,sha);
 assert.deepEqual(verifyReleaseInfo(m),m);
});
test('bad metadata cannot appear as a verified deployed commit',()=>{
 assert.throws(()=>buildReleaseInfo('v1.0',sha,'2026-10-19T23:00:00Z'));
 assert.throws(()=>buildReleaseInfo('0.1.0','abcdef','2026-10-19T23:00:00Z'));
 assert.throws(()=>buildReleaseInfo('0.1.0',sha,'yesterday'));
 assert.throws(()=>verifyReleaseInfo({app:'framefield-studio',phase:'stable',
   version:'1.0.0',commit:sha,base:PAGES_BASE,builtAt:'2026-10-19T23:00:00Z'}));
});
test('Pages HTML audit checks actual bundled JS and safely anchored assets',()=>{
 const html='<script type="module" src="/FramefieldStudio/assets/index-abcdef.js"></script>'+
   '<link rel="stylesheet" href="/FramefieldStudio/assets/index-1234.css">';
 assert.deepEqual(assetReferences(html),[
  '/FramefieldStudio/assets/index-abcdef.js',
  '/FramefieldStudio/assets/index-1234.css'
 ]);
 assert.throws(()=>assetReferences('<script src="/assets/index.js"></script>'),/JavaScript/);
 assert.throws(()=>assetReferences('<script src="/FramefieldStudio/assets/../bad.js"></script>'),/Invalid/);
});
