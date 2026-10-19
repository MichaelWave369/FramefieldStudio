// A reusable perspective camera transform shared by rendering and browser tests.
// SPDX-License-Identifier: MIT
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const mul=(v,s)=>v.map(n=>n*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>mul(v,1/(Math.hypot(...v)||1));
export function makeProject(camera,w,h){
  const {yaw,pitch,distance,target}=camera;
  const eye=add(target,[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance]);
  const forward=norm(sub(target,eye)),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));
  const focal=Math.min(w,h)*1.12;
  return p=>{
    const rel=sub(p,eye),depth=dot(rel,forward);
    if(depth<.08)return null;
    return {x:w/2+dot(rel,right)/depth*focal,y:h/2-dot(rel,up)/depth*focal,depth};
  };
}
