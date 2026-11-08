// Framefield Character Acting Timeline: source-locked local cue data and pure evaluation.
// This is deliberately separate from Framefield's v1 scene and GLB importer.
// SPDX-License-Identifier: MIT
export const ACTING_SHEET_FORMAT='framefield-character-acting-sheet';
export const ACTING_SHEET_VERSION=1;
export const MAX_ACTING_KEYS=128;
export const MAX_DIALOGUE_CUES=64;
export const MAX_ACTING_SHEET_BYTES=96*1024;
const SHA256=/^[a-f0-9]{64}$/;
const TARGET_ID=/^\d+:\d+$/;
const MAX_MORPH_CONTROLS=64;

function fail(message){throw Error('Acting sheet: '+message);}
function cleanClip(clipIndex,timeMs,context){
  if(!Number.isInteger(clipIndex)||clipIndex<0||clipIndex>=context.durations.length)
    fail('unknown clip index');
  const duration=context.durations[clipIndex];
  if(!Number.isFinite(duration)||duration<=0||duration>300)fail('invalid clip duration');
  if(!Number.isInteger(timeMs)||timeMs<0||timeMs>Math.round(duration*1000))
    fail('cue outside clip duration');
  return {clipIndex,timeMs};
}
export function validateExpressionKey(raw,context){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('invalid expression key');
  const {clipIndex,timeMs}=cleanClip(raw.clipIndex,raw.timeMs,context);
  if(!['linear','hold'].includes(raw.interpolation))
    fail('unsupported expression interpolation');
  if(!raw.morphs||typeof raw.morphs!=='object'||Array.isArray(raw.morphs))
    fail('invalid expression channels');
  const entries=Object.entries(raw.morphs);
  if(entries.length>MAX_MORPH_CONTROLS)fail('too many expression channels');
  const known=new Set(context.morphIds);
  const morphs=Object.create(null);
  for(const [id,value] of entries){
    if(!TARGET_ID.test(id)||!known.has(id)||typeof value!=='number'||
       !Number.isFinite(value)||value<0||value>1)
      fail('unknown expression target or invalid weight');
    morphs[id]=value;
  }
  return {clipIndex,timeMs,interpolation:raw.interpolation,morphs:{...morphs}};
}
export function validateDialogueCue(raw,context){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('invalid dialogue cue');
  const {clipIndex,timeMs}=cleanClip(raw.clipIndex,raw.timeMs,context);
  if(typeof raw.text!=='string')fail('dialogue must be text');
  const text=raw.text.trim();
  if(!text||text.length>240||/[\u0000-\u001f\u007f]/.test(text))
    fail('dialogue must contain 1–240 printable characters');
  return {clipIndex,timeMs,text};
}
export function validateActingData(keys,dialogue,context){
  if(!context||!Array.isArray(context.durations)||!Array.isArray(context.morphIds))
    fail('missing character clip and morph context');
  if(!Array.isArray(keys)||keys.length>MAX_ACTING_KEYS)
    fail('too many expression keys');
  if(!Array.isArray(dialogue)||dialogue.length>MAX_DIALOGUE_CUES)
    fail('too many dialogue cues');
  const unique=new Set();
  const cleanKeys=keys.map(raw=>{
    const key=validateExpressionKey(raw,context);
    const id=key.clipIndex+':'+key.timeMs;
    if(unique.has(id))fail('duplicate keyframe time');
    unique.add(id);
    return key;
  }).sort((a,b)=>a.clipIndex-b.clipIndex||a.timeMs-b.timeMs);
  const cleanDialogue=dialogue.map(raw=>validateDialogueCue(raw,context))
    .sort((a,b)=>a.clipIndex-b.clipIndex||a.timeMs-b.timeMs);
  return {keys:cleanKeys,dialogue:cleanDialogue};
}
export function evaluateExpressionTrack(keys,clipIndex,timeMs,morphIds){
  const frames=keys.filter(k=>k.clipIndex===clipIndex);
  if(!frames.length)return null;
  const left=frames.reduce((best,key)=>key.timeMs<=timeMs?key:best,frames[0]);
  const right=frames.find(key=>key.timeMs>timeMs)||left;
  const interval=right.timeMs-left.timeMs;
  const alpha=interval>0&&left.interpolation==='linear'?
    Math.min(1,Math.max(0,(timeMs-left.timeMs)/interval)):0;
  const result=Object.create(null);
  for(const id of morphIds){
    const a=left.morphs[id]??0,b=right.morphs[id]??0;
    result[id]=a+(b-a)*alpha;
  }
  return result;
}
export function makeActingSheet(sourceSha256,keys,dialogue,context){
  if(typeof sourceSha256!=='string'||!SHA256.test(sourceSha256))
    fail('invalid source GLB fingerprint');
  const clean=validateActingData(keys,dialogue,context);
  return {format:ACTING_SHEET_FORMAT,version:ACTING_SHEET_VERSION,sourceSha256,...clean};
}
export function readActingSheet(raw,sourceSha256,context){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     raw.format!==ACTING_SHEET_FORMAT||raw.version!==ACTING_SHEET_VERSION)
    fail('unsupported acting sheet format or version');
  if(raw.sourceSha256!==sourceSha256)fail('acting sheet belongs to another GLB');
  return makeActingSheet(sourceSha256,raw.keys,raw.dialogue,context);
}
