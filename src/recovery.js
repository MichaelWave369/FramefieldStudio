// Local-only autosave envelope. Explicit recovery is required before editing.
// Never silently replace a working scene with a previous browser draft.
import {validateProject} from './scene.js';
export const AUTOSAVE_KEY='framefield-studio:local-draft:v1';
export const AUTOSAVE_LIMIT=2_900_000;
export function parseRecovery(raw){
  if(typeof raw!=='string'||!raw.length)return null;
  if(raw.length>AUTOSAVE_LIMIT)return {error:'Stored draft is too large.',raw};
  try{
    const value=JSON.parse(raw);
    if(value?.kind!=='framefield-local-draft'||value.version!==1||
      !value.project||!Number.isFinite(value.savedAt))
      throw Error('Unrecognized autosave format.');
    const project=validateProject(value.project);
    return {project,savedAt:value.savedAt,raw};
  }catch(error){return {error:error.message,raw};}
}
export function readRecovery(storage){
  try{return parseRecovery(storage.getItem(AUTOSAVE_KEY));}
  catch(error){return {error:'Local browser storage unavailable: '+error.message};}
}
export function storeDraft(storage,project,stamp=Date.now()){
  const envelope=JSON.stringify({kind:'framefield-local-draft',version:1,
    savedAt:stamp,project});
  if(envelope.length>AUTOSAVE_LIMIT)throw Error('Project exceeds local autosave size limit. Download JSON instead.');
  storage.setItem(AUTOSAVE_KEY,envelope);
  return {bytes:envelope.length,savedAt:stamp};
}
export function clearRecovery(storage){storage.removeItem(AUTOSAVE_KEY);}
