// Original Framefield scene model. SPDX-License-Identifier: MIT
import {sanitizeMaterial,sanitizeLighting,DEFAULT_LIGHTING,DEFAULT_MATERIAL} from './lighting.js';
import {sanitizeShotCamera,sanitizeRender} from './shot.js';
import {validateMesh} from './mesh.js';
import {sanitizeModifiers,evaluateModifiers} from './modifiers.js';
export const TYPES = ['box','sphere','pyramid','cylinder','torus'];
export const PALETTE = ['#9991ff','#62d6ca','#f6ad73','#e994d4','#73b9eb'];
export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const id = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
export const pose = (position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]) =>
  ({position:[...position],rotation:[...rotation],scale:[...scale]});
const copyPose = source => pose(source.position, source.rotation, source.scale);
const lerp = (a,b,t) => a+(b-a)*t;
// Each key owns interpolation data for its *outgoing* segment, per transform channel.
// Missing metadata means linear motion, preserving every existing v0.1-v0.3 project.
export const CHANNELS = Object.freeze(
  ['position','rotation','scale'].flatMap(group=>[0,1,2].map(index=>({
    id:group+'.'+index,group,index,label:group[0].toUpperCase()+group.slice(1)+' '+['X','Y','Z'][index]
  })))
);
export const CURVE_PRESETS = Object.freeze({
  linear:[0,0,1,1],
  smooth:[.42,0,.58,1],
  easeIn:[.42,0,1,1],
  easeOut:[0,0,.58,1],
  hold:'hold'
});
const validChannel=id=>CHANNELS.some(c=>c.id===id);
export function sanitizeCurve(curve){
  if(curve==='hold')return 'hold';
  if(!Array.isArray(curve)||curve.length!==4)return null;
  const numbers=curve.map(Number);
  if(numbers.some(n=>!Number.isFinite(n)))return null;
  return [clamp(numbers[0],0,1),clamp(numbers[1],0,1),
    clamp(numbers[2],0,1),clamp(numbers[3],0,1)];
}
function cub(t,a,b){const s=1-t;return 3*s*s*t*a+3*s*t*t*b+t*t*t;}
export function easeAt(t,curve){
  t=clamp(t,0,1);
  if(t===0||t===1)return t;
  if(curve==='hold')return 0;
  const points=sanitizeCurve(curve);
  if(!points)return t;
  const [x1,y1,x2,y2]=points;
  if(x1===0&&y1===0&&x2===1&&y2===1)return t;
  // Invert the monotone Bezier time coordinate with deterministic bisection.
  let lo=0,hi=1;
  for(let i=0;i<28;i++){
    const mid=(lo+hi)/2;
    if(cub(mid,x1,x2)<t)lo=mid;else hi=mid;
  }
  return cub((lo+hi)/2,y1,y2);
}
export function setChannelCurve(object,frame,channel,curve){
  if(!validChannel(channel))return object;
  const valid=sanitizeCurve(curve);
  if(!valid)return object;
  return {...object,keyframes:object.keyframes.map(k=>
    k.frame!==frame?k:{...k,curves:{...(k.curves||{}),[channel]:valid}})};
}
export function setChannelKeyValue(object,frame,channel,value){
  const c=CHANNELS.find(c=>c.id===channel);
  if(!c||!Number.isFinite(value))return object;
  return {...object,keyframes:object.keyframes.map(k=>{
    if(k.frame!==frame)return k;
    const group=[...k[c.group]];
    group[c.index]=clamp(value,-10000,10000);
    return {...k,[c.group]:group};
  })};
}
export function atFrame(object,frame) {
  const keys=object.keyframes;
  if(!keys?.length) return pose();
  if(frame<=keys[0].frame) return copyPose(keys[0]);
  if(frame>=keys[keys.length-1].frame) return copyPose(keys[keys.length-1]);
  for(let i=0;i<keys.length-1;i++) {
    const a=keys[i], b=keys[i+1];
    if(frame>=a.frame && frame<=b.frame) {
      const t=(frame-a.frame)/(b.frame-a.frame);
      return Object.fromEntries(['position','rotation','scale'].map(key =>
        [key,a[key].map((v,j)=>lerp(v,b[key][j],easeAt(t,a.curves?.[key+'.'+j])))]));
    }
  }
  return copyPose(keys[keys.length-1]);
}
export function putKey(object,frame,newPose) {
  const existing=object.keyframes.find(k=>k.frame===frame);
  const updated={...object,keyframes:object.keyframes.filter(k=>k.frame!==frame)};
  updated.keyframes.push({frame,...copyPose(newPose),
    ...(existing?.curves?{curves:{...existing.curves}}:{})});
  updated.keyframes.sort((a,b)=>a.frame-b.frame);
  return updated;
}
export function makeObject(type='box',index=0,frame=0) {
  const kind=TYPES.includes(type)?type:'box';
  return {id:id(),type:kind,name:`${kind[0].toUpperCase()+kind.slice(1)} ${String(index+1).padStart(2,'0')}`,
    color:PALETTE[index%PALETTE.length],material:{...DEFAULT_MATERIAL},visible:true,
    keyframes:[{frame,...pose([index%5-2,0,0])}]};
}
export function demoScene() {
  return {version:1,name:'First Motion',fps:24,duration:120,lighting:sanitizeLighting(DEFAULT_LIGHTING),
    shotCamera:sanitizeShotCamera(null),renderSettings:sanitizeRender(null),objects:[
    {id:id(),type:'box',name:'Orbit Cube',color:'#9a90ff',material:{...DEFAULT_MATERIAL},visible:true,
      keyframes:[{frame:0,...pose([-1.2,0,0])},{frame:60,...pose([1.2,0,0],[0,180,0])},
        {frame:120,...pose([-1.2,0,0],[0,360,0])}]},
    {id:id(),type:'sphere',name:'Floating Sphere',color:'#5bd8c7',material:{...DEFAULT_MATERIAL,roughness:.3},visible:true,
      keyframes:[{frame:0,...pose([1.5,-.35,0])},{frame:60,...pose([1.5,1.25,0])},
        {frame:120,...pose([1.5,-.35,0])}]}
  ]};
}
const vec=(raw,fallback) => {
  if(!Array.isArray(raw)||raw.length!==3) return [...fallback];
  return raw.map((n,i)=>Number.isFinite(Number(n))?clamp(Number(n),-10000,10000):fallback[i]);
};
export function validateProject(raw) {
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.objects)) throw Error('Invalid Framefield project.');
  if(raw.objects.length>100) throw Error('A scene may contain at most 100 objects.');
  const duration=clamp(Math.round(Number(raw.duration)||120),12,600);
  const objects=raw.objects.map((o,i)=>{
    if(!TYPES.includes(o.type)) throw Error('Unknown shape at object '+(i+1));
    if(!Array.isArray(o.keyframes)||!o.keyframes.length||o.keyframes.length>600)
      throw Error('Invalid keyframe count at object '+(i+1));
    const unique=new Map();
    for(const k of o.keyframes){
      const frame=clamp(Math.round(Number(k.frame)||0),0,duration);
      const curves={};
      if(k.curves&&typeof k.curves==='object'&&!Array.isArray(k.curves)){
        for(const [channel,raw] of Object.entries(k.curves)){
          if(!validChannel(channel))continue;
          const val=sanitizeCurve(raw);
          if(val)curves[channel]=val;
        }
      }
      unique.set(frame,{frame,position:vec(k.position,[0,0,0]),rotation:vec(k.rotation,[0,0,0]),
        scale:vec(k.scale,[1,1,1]),...(Object.keys(curves).length?{curves}:{})});
    }
    // Reject project files whose modifiers exceed the safe browser preview budget.
    const geometry=o.geometry!==undefined?validateMesh(o.geometry):undefined;
    const modifiers=sanitizeModifiers(o.modifiers);
    if(modifiers.some(mod=>mod.enabled))evaluateModifiers({type:o.type,geometry,modifiers});
    // Source provenance is informational: it identifies original imported bytes,
    // not the mesh after editing. Never trust unchecked saved-project metadata.
    let glbSource;
    if(o.glbSource!==undefined){
      const src=o.glbSource;
      if(!src||typeof src!=='object'||Array.isArray(src)||
        typeof src.sha256!=='string'||!(/^[a-f0-9]{64}$/).test(src.sha256)||
        typeof src.fileName!=='string'||src.fileName.length>128)
        throw Error('Invalid original GLB source evidence at object '+(i+1));
      glbSource={fileName:src.fileName,sha256:src.sha256,
        description:'Original GLB bytes only; subsequent scene edits are not covered by this digest.'};
    }
    return {id:id(),type:o.type,name:String(o.name||'Shape '+(i+1)).slice(0,65),
      color:/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#9991ff',material:sanitizeMaterial(o.material),visible:o.visible!==false,
      ...(geometry?{geometry}:{}),...(modifiers.length?{modifiers}:{}),
      ...(glbSource?{glbSource}:{}),
      keyframes:[...unique.values()].sort((a,b)=>a.frame-b.frame)};
  });
  return {version:1,name:String(raw.name||'Imported Scene').slice(0,80),
    fps:[12,24,30,60].includes(Number(raw.fps))?Number(raw.fps):24,duration,
    lighting:sanitizeLighting(raw.lighting),shotCamera:sanitizeShotCamera(raw.shotCamera),
    renderSettings:sanitizeRender(raw.renderSettings),objects};
}
