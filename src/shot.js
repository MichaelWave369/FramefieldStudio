// Framefield Studio: saved shot framing and offline render preferences.
// Original MIT code, independent of editor viewport navigation.
export const DEFAULT_SHOT_CAMERA=Object.freeze({yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]});
export const DEFAULT_RENDER=Object.freeze({width:960,height:540,background:'#0c1526'});
export const RESOLUTIONS=Object.freeze([
  [640,360],[960,540],[1280,720],[1920,1080],[1080,1080],[1080,1350]
]);
const clip=(n,min,max)=>Math.min(max,Math.max(min,n));
const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;
export function sanitizeShotCamera(raw){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const def=DEFAULT_SHOT_CAMERA;
  const target=Array.isArray(src.target)&&src.target.length===3?
    src.target.map((v,i)=>clip(finite(v,def.target[i]),-100,100)):[...def.target];
  return {yaw:clip(finite(src.yaw,def.yaw),-30,30),
    pitch:clip(finite(src.pitch,def.pitch),-1.42,1.42),
    distance:clip(finite(src.distance,def.distance),2,70),target};
}
export function sanitizeRender(raw){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const width=finite(src.width,DEFAULT_RENDER.width);
  const height=finite(src.height,DEFAULT_RENDER.height);
  const valid=RESOLUTIONS.some(([w,h])=>w===width&&h===height);
  const hex=typeof src.background==='string'&&/^#[0-9a-f]{6}$/i.test(src.background)
    ?src.background.toLowerCase():DEFAULT_RENDER.background;
  return {width:valid?width:DEFAULT_RENDER.width,
    height:valid?height:DEFAULT_RENDER.height,background:hex};
}
export function frameRange(start,end,step,duration,maxFrames=120){
  const a=Math.floor(start),b=Math.floor(end),c=Math.floor(step);
  if(![a,b,c,duration].every(Number.isFinite)||a<0||a>b||b>duration||
    c<1||c>60)throw Error('Invalid render frame range.');
  const count=Math.floor((b-a)/c)+1;
  if(count>maxFrames)throw Error('Frame range exceeds '+maxFrames+' PNGs. Increase Step.');
  return Array.from({length:count},(_,i)=>a+i*c);
}
