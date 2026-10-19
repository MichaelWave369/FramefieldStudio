// Framefield Studio Scene Vault: atomic local checkpoints before scene replacement.
// Checkpoints never leave the browser. Not a substitute for portable JSON downloads.
import {validateProject} from './scene.js';
export const VAULT_KEY='framefield-studio:scene-vault:v1';
export const VAULT_CAP=2_700_000;
export const VAULT_COUNT=5;
const allowedReasons=new Set(['Manual backup','Before new project','Before opening JSON',
  'Before starter scene','Before restoring checkpoint']);
export function readCheckpoints(storage){
  const raw=storage.getItem(VAULT_KEY);
  if(raw===null)return [];
  if(typeof raw!=='string'||raw.length>VAULT_CAP)throw Error('Local Scene Vault is oversized or corrupt.');
  let parsed;
  try{parsed=JSON.parse(raw);}catch{throw Error('Local Scene Vault contains invalid JSON.');}
  if(parsed?.kind!=='framefield-scene-vault'||parsed.version!==1||
    !Array.isArray(parsed.records)||parsed.records.length>VAULT_COUNT)throw Error('Local Scene Vault format invalid.');
  for(const record of parsed.records){
    if(!record||typeof record.id!=='string'||record.id.length>120||
      typeof record.reason!=='string'||!allowedReasons.has(record.reason)||
      !Number.isFinite(record.stamp)||!record.project||typeof record.project!=='object'||
      Array.isArray(record.project))
      throw Error('Local Scene Vault has an invalid checkpoint.');
  }
  if(new Set(parsed.records.map(r=>r.id)).size!==parsed.records.length)
    throw Error('Local Scene Vault has duplicate checkpoint IDs.');
  return parsed.records;
}
function write(storage,records){
  const content=JSON.stringify({kind:'framefield-scene-vault',version:1,records});
  if(content.length>VAULT_CAP)throw Error('Local Scene Vault size limit exceeded.');
  storage.setItem(VAULT_KEY,content); // one atomic browser-storage write
}
export function addCheckpoint(storage,project,reason='Manual backup',stamp=Date.now(),customId){
  if(!allowedReasons.has(reason))throw Error('Unknown backup reason.');
  // Validate the project as if it was opened from JSON. Fail without touching vault.
  validateProject(project);
  const id=customId||globalThis.crypto?.randomUUID?.()||'vault-'+stamp+'-'+Math.random().toString(36).slice(2);
  const entry={id,stamp,reason,project:JSON.parse(JSON.stringify(project))};
  const previous=readCheckpoints(storage);
  let records=[entry,...previous.filter(r=>r.id!==id)].slice(0,VAULT_COUNT);
  while(records.length>1&&JSON.stringify({kind:'framefield-scene-vault',version:1,records}).length>VAULT_CAP)
    records=records.slice(0,-1);
  write(storage,records);
  return entry;
}
export function deleteCheckpoint(storage,id){
  const entries=readCheckpoints(storage);
  if(!entries.some(r=>r.id===id))throw Error('Checkpoint no longer exists.');
  write(storage,entries.filter(r=>r.id!==id));
}
export function restoreCheckpoint(storage,id){
  const record=readCheckpoints(storage).find(r=>r.id===id);
  if(!record)throw Error('Checkpoint no longer exists.');
  return validateProject(record.project);
}
export function exportCheckpoint(storage,id){
  const record=readCheckpoints(storage).find(r=>r.id===id);
  if(!record)throw Error('Checkpoint no longer exists.');
  // Revalidate so bad local data never masquerades as a clean portable project.
  const project=validateProject(record.project);
  return JSON.stringify(project,null,2);
}
