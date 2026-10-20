// Framefield release provenance and build validation. Original MIT code.
// A metadata file is stamped into the built GitHub Pages artifact, not runtime state.
export const PAGES_BASE='/FramefieldStudio/';
export const RELEASE_PHASE='candidate';
export const VALID_COMMIT=/^[a-f0-9]{40}$/;
export function buildReleaseInfo(version,commit,builtAt){
  if(typeof version!=='string'||!/^\d+\.\d+\.\d+$/.test(version))
    throw Error('Package version must use MAJOR.MINOR.PATCH.');
  if(typeof commit!=='string'||!VALID_COMMIT.test(commit))
    throw Error('Build must have a full 40-character Git commit SHA.');
  if(typeof builtAt!=='string'||!Number.isFinite(Date.parse(builtAt)))
    throw Error('Build timestamp must be valid ISO time.');
  return {app:'framefield-studio',phase:RELEASE_PHASE,version,
    commit,base:PAGES_BASE,builtAt};
}
export function verifyReleaseInfo(info){
  if(!info||info.app!=='framefield-studio'||info.phase!==RELEASE_PHASE||
     info.base!==PAGES_BASE||!VALID_COMMIT.test(info.commit||'')||
     !/^\d+\.\d+\.\d+$/.test(info.version||'')||
     !Number.isFinite(Date.parse(info.builtAt)))
    throw Error('Invalid Framefield release provenance.');
  return info;
}
export function assetReferences(html){
  if(typeof html!=='string')throw Error('Built index HTML missing.');
  const refs=[...html.matchAll(/(?:src|href)="(\/FramefieldStudio\/assets\/[^"<>]+)"/g)]
    .map(m=>m[1]);
  if(!refs.some(x=>/\.js$/.test(x)))throw Error('Missing Pages-prefixed JavaScript entry.');
  if(refs.some(x=>x.includes('..')||x.includes('?')||x.includes('#')))
    throw Error('Invalid asset reference in built HTML.');
  return refs;
}
