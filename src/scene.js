// Original Framefield scene model. SPDX-License-Identifier: MIT
export const TYPES = ['box','sphere','pyramid','cylinder','torus'];
export const PALETTE = ['#9991ff','#62d6ca','#f6ad73','#e994d4','#73b9eb'];
export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const id = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
export const pose = (position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]) =>
  ({position:[...position],rotation:[...rotation],scale:[...scale]});
const copyPose = source => pose(source.position, source.rotation, source.scale);
const lerp = (a,b,t) => a+(b-a)*t;
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
        [key,a[key].map((v,j)=>lerp(v,b[key][j],t))]));
    }
  }
  return copyPose(keys[keys.length-1]);
}
export function putKey(object,frame,newPose) {
  const updated={...object,keyframes:object.keyframes.filter(k=>k.frame!==frame)};
  updated.keyframes.push({frame,...copyPose(newPose)});
  updated.keyframes.sort((a,b)=>a.frame-b.frame);
  return updated;
}
export function makeObject(type='box',index=0,frame=0) {
  const kind=TYPES.includes(type)?type:'box';
  return {id:id(),type:kind,name:`${kind[0].toUpperCase()+kind.slice(1)} ${String(index+1).padStart(2,'0')}`,
    color:PALETTE[index%PALETTE.length],visible:true,
    keyframes:[{frame,...pose([index%5-2,0,0])}]};
}
export function demoScene() {
  return {version:1,name:'First Motion',fps:24,duration:120,objects:[
    {id:id(),type:'box',name:'Orbit Cube',color:'#9a90ff',visible:true,
      keyframes:[{frame:0,...pose([-1.2,0,0])},{frame:60,...pose([1.2,0,0],[0,180,0])},
        {frame:120,...pose([-1.2,0,0],[0,360,0])}]},
    {id:id(),type:'sphere',name:'Floating Sphere',color:'#5bd8c7',visible:true,
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
      unique.set(frame,{frame,position:vec(k.position,[0,0,0]),rotation:vec(k.rotation,[0,0,0]),
        scale:vec(k.scale,[1,1,1])});
    }
    return {id:id(),type:o.type,name:String(o.name||'Shape '+(i+1)).slice(0,65),
      color:/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#9991ff',visible:o.visible!==false,
      keyframes:[...unique.values()].sort((a,b)=>a.frame-b.frame)};
  });
  return {version:1,name:String(raw.name||'Imported Scene').slice(0,80),
    fps:[12,24,30,60].includes(Number(raw.fps))?Number(raw.fps):24,duration,objects};
}
