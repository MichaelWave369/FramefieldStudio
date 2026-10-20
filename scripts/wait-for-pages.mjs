// Small, bounded deployment-freshness gate for GitHub Pages CDN propagation.
// This is an on-demand CI check, not a daemon, monitor, or user background task.
import {setTimeout as sleep} from 'node:timers/promises';
import {verifyReleaseInfo,VALID_COMMIT} from './release-metadata.mjs';

export const DEFAULT_LIVE_URL='https://michaelwave369.github.io/FramefieldStudio/';
export const DEFAULT_TIMEOUT_MS=180000;
export function releaseMetadataUrl(site,cacheKey=''){
  const url=new URL('release-info.json',site);
  if(url.protocol!=='https:')throw Error('Public release audit must use HTTPS.');
  if(cacheKey)url.searchParams.set('audit',String(cacheKey));
  return url.toString();
}
export async function waitForDeployedCommit({
  expectedSha,site=DEFAULT_LIVE_URL,fetchFn=fetch,
  now=()=>Date.now(),delay=sleep,timeoutMs=DEFAULT_TIMEOUT_MS,
  intervalMs=10000,onProgress=()=>{}
}={}){
  if(!VALID_COMMIT.test(expectedSha||''))throw Error('Expected complete deployed Git SHA.');
  if(!(Number.isFinite(timeoutMs)&&timeoutMs>0&&
       Number.isFinite(intervalMs)&&intervalMs>0))
    throw Error('Invalid freshness budget.');
  const endpoint=releaseMetadataUrl(site);
  const beginning=now();
  let observed='none',attempts=0;
  do{
    attempts++;
    try{
      const uri=releaseMetadataUrl(site,String(attempts)+'-'+String(now()));
      const response=await fetchFn(uri,{
        headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},
        cache:'no-store',signal:AbortSignal.timeout(9000)
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const record=verifyReleaseInfo(await response.json());
      observed=record.commit;
      if(record.commit===expectedSha){
        onProgress('Matched deployed revision '+expectedSha+' on attempt '+attempts);
        return {commit:record.commit,version:record.version,builtAt:record.builtAt,
          attempts,url:endpoint};
      }
      onProgress('Pages still serves '+record.commit.slice(0,12)+
        '; expecting '+expectedSha.slice(0,12));
    }catch(error){
      observed=String(error?.message||error).slice(0,160);
      onProgress('Could not read release metadata: '+observed);
    }
    const remaining=timeoutMs-(now()-beginning);
    if(remaining<=0)break;
    await delay(Math.min(intervalMs,remaining));
  }while(now()-beginning<=timeoutMs);
  throw Error('Live Pages revision did not match within '+timeoutMs+
    ' ms. Expected '+expectedSha+'; last observed '+observed+
    '. Check Pages deployment/CDN and rerun live acceptance.');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  const expectedSha=process.env.FRAMEFIELD_EXPECTED_SHA?.trim().toLowerCase();
  waitForDeployedCommit({
    expectedSha,site:process.env.FRAMEFIELD_LIVE_URL||DEFAULT_LIVE_URL,
    onProgress:line=>process.stdout.write(line+'\n')
  }).then(matched=>{
    process.stdout.write('Live deployment verified: '+JSON.stringify(matched)+'\n');
  }).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
}
