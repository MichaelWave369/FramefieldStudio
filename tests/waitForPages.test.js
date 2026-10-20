import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForDeployedCommit,releaseMetadataUrl} from '../scripts/wait-for-pages.mjs';
const first='0123456789abcdef0123456789abcdef01234567';
const second='abcdef0123456789abcdef0123456789abcdef01';
const info=commit=>({app:'framefield-studio',phase:'candidate',version:'0.1.0',
 commit,base:'/FramefieldStudio/',builtAt:'2026-10-20T01:29:11.426Z'});
const response=value=>({ok:true,status:200,json:async()=>value});
test('Pages freshness waits through stale revision and validates the exact new SHA',async()=>{
 let clock=0,checks=0;const notes=[];
 const result=await waitForDeployedCommit({
  expectedSha:second,timeoutMs:1000,intervalMs:50,
  now:()=>clock,delay:async ms=>{clock+=ms;},
  fetchFn:async()=>response(info(++checks===1?first:second)),
  onProgress:line=>notes.push(line)
 });
 assert.equal(result.commit,second);
 assert.equal(result.attempts,2);
 assert.equal(notes.some(line=>line.includes('still serves')),true);
 assert.match(result.url,/release-info\.json$/);
});
test('deployment check fails closed when CDN stays stale after bounded retries',async()=>{
 let clock=0;
 await assert.rejects(()=>waitForDeployedCommit({
  expectedSha:second,timeoutMs:120,intervalMs:40,
  now:()=>clock,delay:async ms=>{clock+=ms;},
  fetchFn:async()=>response(info(first))
 }),/Expected abcdef.*last observed 012345/);
});
test('invalid release metadata never passes a freshness check',async()=>{
 let clock=0;
 await assert.rejects(()=>waitForDeployedCommit({
  expectedSha:second,timeoutMs:75,intervalMs:25,
  now:()=>clock,delay:async ms=>{clock+=ms;},
  fetchFn:async()=>response({...info(second),phase:'stable'})
 }),/Invalid Framefield release provenance/);
});
test('HTTP errors and temporary fetch failures are retried without a false success',async()=>{
 let clock=0,n=0;
 const result=await waitForDeployedCommit({
  expectedSha:second,timeoutMs:100,intervalMs:10,
  now:()=>clock,delay:async ms=>{clock+=ms;},
  fetchFn:async()=>{
   n++;
   if(n===1)throw Error('network reset');
   if(n===2)return {ok:false,status:404};
   return response(info(second));
  }
 });
 assert.equal(result.attempts,3);
});
test('invalid SHA or non-HTTPS public URL is rejected',async()=>{
 await assert.rejects(()=>waitForDeployedCommit({expectedSha:'12345'}),/complete deployed Git SHA/);
 assert.throws(()=>releaseMetadataUrl('http://example.com/FramefieldStudio/'),/HTTPS/);
 assert.equal(releaseMetadataUrl('https://example.com/FramefieldStudio/'),
  'https://example.com/FramefieldStudio/release-info.json');
});
