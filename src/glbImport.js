// A local, explicitly reviewed GLB-to-Framefield scene adapter.
// Imported source bytes are hashed independently by the browser before this call.
import {parseStaticGlb} from './lib/parseStaticGlb.js';
import {validateMesh} from './mesh.js';
import {makeObject} from './scene.js';

const SHA256=/^[a-f0-9]{64}$/;
export const MAX_GLB_BYTES=16*1024*1024;
export function createGlbObject(parsed,{fileName,index=0,frame=0,sha256}={}){
  if(!SHA256.test(sha256??''))throw Error('GLB import requires a verified SHA-256 digest.');
  if(!Number.isInteger(index)||index<0||index>=100||!Number.isInteger(frame)||frame<0||frame>600)
    throw Error('GLB import: invalid scene position.');
  const geometry=validateMesh(parsed);
  // The Framefield and BPC software renderers require positive-area triangles.
  for(const [i,face] of geometry.faces.entries()){
    if(face.length!==3)throw Error('GLB import: non-triangular face '+i+'.');
    const [a,b,c]=face.map(n=>geometry.vertices[n]);
    const u=b.map((v,j)=>v-a[j]),v=c.map((n,j)=>n-a[j]);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if(Math.hypot(...cross)<1e-8)throw Error('GLB import: degenerate triangle '+i+'.');
  }
  const originalName=String(fileName||'Imported mesh.glb').slice(0,128);
  const cleanName=originalName.replace(/\.glb$/i,'').replace(/[\\/]/g,' ').trim().slice(0,65)||'Imported GLB';
  const base=makeObject('box',index,frame);
  // Only the uniform glTF baseColorFactor can survive as a flat CSS color.
  // Material texture/shader semantics are never imported by this adapter.
  if (parsed.color !== undefined && parsed.color !== null &&
      (typeof parsed.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(parsed.color)))
    throw Error('GLB import: invalid preview color.');
  return {...base,name:cleanName,color:parsed.color || base.color,geometry,glbSource:{
    fileName:originalName,sha256,description:'Original GLB bytes only; subsequent scene edits are not covered by this digest.'
  }};
}
export function prepareGlbImport(buffer,options){
  const parsed=parseStaticGlb(buffer);
  return {object:createGlbObject(parsed,options),
    previewColor:parsed.color || null,
    warnings:parsed.warnings||[]};
}
