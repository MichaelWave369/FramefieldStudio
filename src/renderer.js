// Self-contained Canvas 2D perspective mesh renderer. SPDX-License-Identifier: MIT
import {atFrame,clamp} from './scene.js';
const TAU=Math.PI*2;
const deg=n=>n*Math.PI/180;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>mul(v,1/(Math.hypot(...v)||1));
const meshes=new Map();
function mesh(kind) {
  if(meshes.has(kind)) return meshes.get(kind);
  let vertices=[],faces=[];
  if(kind==='box'){
    vertices=[[-.6,-.6,-.6],[.6,-.6,-.6],[.6,.6,-.6],[-.6,.6,-.6],
      [-.6,-.6,.6],[.6,-.6,.6],[.6,.6,.6],[-.6,.6,.6]];
    faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[3,2,6,7],[0,4,7,3],[1,5,6,2]];
  } else if(kind==='pyramid') {
    vertices=[[-.7,-.6,-.7],[.7,-.6,-.7],[.7,-.6,.7],[-.7,-.6,.7],[0,.8,0]];
    faces=[[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]];
  } else if(kind==='cylinder') {
    const n=18;
    for(let j=0;j<2;j++) for(let i=0;i<n;i++){
      const a=TAU*i/n;vertices.push([Math.cos(a)*.6,j? .7:-.7,Math.sin(a)*.6]);
    }
    for(let i=0;i<n;i++)faces.push([i,(i+1)%n,(i+1)%n+n,i+n]);
    faces.push([...Array(n).keys()].reverse(),[...Array(n).keys()].map(i=>i+n));
  } else {
    const ns=kind==='torus'?24:16, nr=kind==='torus'?10:10;
    for(let i=0;i<=ns;i++)for(let j=0;j<=nr;j++){
      const a=i/ns*TAU,b=j/nr*(kind==='torus'?TAU:Math.PI);
      vertices.push(kind==='torus'
        ?[(.7+.22*Math.cos(b))*Math.cos(a),.22*Math.sin(b),(.7+.22*Math.cos(b))*Math.sin(a)]
        :[.7*Math.sin(b)*Math.cos(a),.7*Math.cos(b),.7*Math.sin(b)*Math.sin(a)]);
    }
    for(let i=0;i<ns;i++)for(let j=0;j<nr;j++){
      const a=i*(nr+1)+j,b=a+nr+1;faces.push([a,b,b+1,a+1]);
    }
  }
  const result={vertices,faces};meshes.set(kind,result);return result;
}
function transform(v,p) {
  let [x,y,z]=[v[0]*p.scale[0],v[1]*p.scale[1],v[2]*p.scale[2]];
  let a=deg(p.rotation[0]),c=Math.cos(a),s=Math.sin(a);[y,z]=[y*c-z*s,y*s+z*c];
  a=deg(p.rotation[1]);c=Math.cos(a);s=Math.sin(a);[x,z]=[x*c+z*s,-x*s+z*c];
  a=deg(p.rotation[2]);c=Math.cos(a);s=Math.sin(a);[x,y]=[x*c-y*s,x*s+y*c];
  return [x+p.position[0],y+p.position[1],z+p.position[2]];
}
function rgb(hex) {return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)||0);}
export function render(canvas,scene,frame,camera,selectedId) {
  if(!canvas)return [];
  const ctx=canvas.getContext('2d');if(!ctx)return [];
  const bounds=canvas.getBoundingClientRect();
  const w=Math.max(1,Math.round(bounds.width)),h=Math.max(1,Math.round(bounds.height));
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#0c1526';ctx.fillRect(0,0,w,h);
  const {yaw,pitch,distance,target}=camera;
  const eye=add(target,[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance]);
  const forward=norm(sub(target,eye)),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));
  const focal=Math.min(w,h)*1.12;
  function project(p) {
    const rel=sub(p,eye),depth=dot(rel,forward);
    if(depth<.08)return null;
    return {x:w/2+dot(rel,right)/depth*focal,y:h/2-dot(rel,up)/depth*focal,depth};
  }
  function line(a,b,color,width=1){
    const pa=project(a),pb=project(b);if(!pa||!pb)return;
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(pa.x,pa.y);
    ctx.lineTo(pb.x,pb.y);ctx.stroke();
  }
  for(let i=-10;i<=10;i++) {
    line([i,0,-10],[i,0,10],i===0?'#33445d':'#223047');
    line([-10,0,i],[10,0,i],i===0?'#33445d':'#223047');
  }
  line([0,0,0],[2.4,0,0],'#e97982',2);
  line([0,0,0],[0,2.4,0],'#75d6a0',2);
  line([0,0,0],[0,0,2.4],'#80adff',2);
  const polys=[],pick=[];
  for(const object of scene.objects) {
    if(!object.visible)continue;
    const p=atFrame(object,frame),m=mesh(object.type);
    const verts=m.vertices.map(v=>transform(v,p)),center=project(p.position);
    if(center)pick.push({...center,id:object.id});
    for(const face of m.faces){
      const points=face.map(i=>verts[i]),proj=points.map(project);
      if(proj.some(x=>!x))continue;
      const n=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      const brightness=.40+.55*Math.abs(dot(n,norm([.6,1,.7])));
      const color=rgb(object.color).map(v=>Math.round(clamp(v*brightness,0,255)));
      polys.push({proj,color:'rgb('+color.join(',')+')',
        depth:proj.reduce((s,x)=>s+x.depth,0)/proj.length,
        selected:object.id===selectedId});
    }
  }
  polys.sort((a,b)=>b.depth-a.depth);
  for(const p of polys){
    ctx.beginPath();p.proj.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
    ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.strokeStyle=p.selected?'#bdc0ff':'#162037';
    ctx.lineWidth=p.selected?1.25:.5;ctx.stroke();
  }
  const selected=pick.find(p=>p.id===selectedId);
  if(selected){ctx.strokeStyle='#d4d1ff';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(selected.x,selected.y,16,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  return pick;
}
