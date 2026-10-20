// Release artifact audit runs in both PR CI and the GitHub Pages build.
import {readFile,stat} from 'node:fs/promises';
import {verifyReleaseInfo,assetReferences} from './release-metadata.mjs';
const fromDist=path=>new URL('../dist/'+path,import.meta.url);
const [html,metadata,pkg,license]=await Promise.all([
 readFile(fromDist('index.html'),'utf8'),
 readFile(fromDist('release-info.json'),'utf8').then(JSON.parse),
 readFile(new URL('../package.json',import.meta.url),'utf8').then(JSON.parse),
 readFile(new URL('../LICENSE',import.meta.url),'utf8')
]);
verifyReleaseInfo(metadata);
if(metadata.version!==pkg.version)throw Error('Build metadata package version mismatch.');
if(!license.startsWith('MIT License'))throw Error('Missing MIT license.');
const assets=assetReferences(html);
for(const ref of assets){
 const file=fromDist(decodeURIComponent(ref.replace(/^\/FramefieldStudio\//,'')));
 const info=await stat(file);
 if(!info.isFile()||info.size<1)throw Error('Empty or missing release asset: '+ref);
}
if(/src="\/assets\//.test(html)||/href="\/assets\//.test(html))
 throw Error('Unprefixed root asset would break GitHub Pages.');
process.stdout.write('Framefield release artifact valid: '+assets.length+
  ' hashed assets; '+metadata.phase+' '+metadata.version+'; '+metadata.commit.slice(0,12)+'\n');
