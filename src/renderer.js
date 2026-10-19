// Self-contained Canvas 2D perspective mesh renderer. SPDX-License-Identifier: MIT
import {atFrame,clamp} from './scene.js';
import {makeMoveHandles,drawMoveHandles,drawScaleHandles,makeRotateHandles,drawRotateHandles} from './gizmo.js';
import {makeProject} from './projection.js';
import {shadeFace,DEFAULT_LIGHTING} from './lighting.js';
import {primitiveMesh,transformVertex,componentHandles,componentIndices,uniqueEdges} from './mesh.js';
import {evaluateModifiers} from './modifiers.js';
const TAU=Math.PI*2;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>mul(v,1/(Math.hypot(...v)||1));
function rgb(hex) {return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)||0);}
export function render(canvas,scene,frame,camera,selectedId,tool='move',options={}) {
  if(!canvas)return {pick:[],handles:[]};
  const ctx=canvas.getContext('2d');if(!ctx)return {pick:[],handles:[]};
  const bounds=canvas.getBoundingClientRect?.()||{width:0,height:0};
  const w=Math.max(1,Math.round(options.width||bounds.width||canvas.width));
  const h=Math.max(1,Math.round(options.height||bounds.height||canvas.height));
  const dpr=options.pixelRatio||Math.min(window.devicePixelRatio||1,2);
  const helpers=options.helpers!==false;
  const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#070d19';ctx.fillRect(0,0,w,h);
  const aspect=options.aspect>0?options.aspect:w/h;
  const renderW=Math.min(w,h*aspect),renderH=renderW/aspect;
  const offsetX=(w-renderW)/2,offsetY=(h-renderH)/2;
  ctx.save();ctx.beginPath();ctx.rect(offsetX,offsetY,renderW,renderH);ctx.clip();
  ctx.fillStyle=scene.renderSettings?.background||'#0c1526';
  ctx.fillRect(offsetX,offsetY,renderW,renderH);
  const localProject=makeProject(camera,renderW,renderH);
  const project=point=>{
    const value=localProject(point);
    return value?{...value,x:value.x+offsetX,y:value.y+offsetY}:null;
  };
  function line(a,b,color,width=1){
    const pa=project(a),pb=project(b);if(!pa||!pb)return;
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(pa.x,pa.y);
    ctx.lineTo(pb.x,pb.y);ctx.stroke();
  }
  if(helpers){
    for(let i=-10;i<=10;i++) {
      line([i,0,-10],[i,0,10],i===0?'#33445d':'#223047');
      line([-10,0,i],[10,0,i],i===0?'#33445d':'#223047');
    }
    line([0,0,0],[2.4,0,0],'#e97982',2);
    line([0,0,0],[0,2.4,0],'#75d6a0',2);
    line([0,0,0],[0,0,2.4],'#80adff',2);
  }
  const polys=[],pick=[];
  for(const object of scene.objects) {
    if(!object.visible)continue;
    const p=atFrame(object,frame),m=evaluateModifiers(object);
    const verts=m.vertices.map(v=>transformVertex(v,p)),center=project(p.position);
    if(center)pick.push({...center,id:object.id});
    for(const face of m.faces){
      const points=face.map(i=>verts[i]),proj=points.map(project);
      if(proj.some(x=>!x))continue;
      const n=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      const faceCenter=points[0].map((_,j)=>points.reduce((s,v)=>s+v[j],0)/points.length);
      const eye=[camera.target[0]+Math.sin(camera.yaw)*Math.cos(camera.pitch)*camera.distance,
        camera.target[1]+Math.sin(camera.pitch)*camera.distance,
        camera.target[2]+Math.cos(camera.yaw)*Math.cos(camera.pitch)*camera.distance];
      const color=shadeFace(object.color,object.material,scene.lighting||DEFAULT_LIGHTING,
        n,faceCenter,eye);
      polys.push({id:object.id,proj,color,
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
  // Editable topology appears only in the interactive viewport, never in exports.
  let components=[];
  const meshKind=helpers?options.meshMode:null;
  if(meshKind&&selectedId){
    const object=scene.objects.find(o=>o.id===selectedId&&o.visible&&o.geometry);
    if(object){
      const p=atFrame(object,frame),geometry=object.geometry;
      const projected=geometry.vertices.map(v=>project(transformVertex(v,p)));
      if(meshKind==='edge'||meshKind==='face'){
        const selections=meshKind==='edge'?uniqueEdges(geometry):geometry.faces;
        ctx.save();ctx.lineWidth=1;
        selections.forEach((indices,i)=>{
          const points=indices.map(j=>projected[j]);
          if(points.some(pt=>!pt))return;
          ctx.beginPath();points.forEach((pt,k)=>k?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
          if(meshKind==='face')ctx.closePath();
          ctx.strokeStyle=i===options.componentSelection?'#f8d394':'#78b9ec80';
          ctx.lineWidth=i===options.componentSelection?3:1;
          ctx.stroke();
        });ctx.restore();
      }
      components=componentHandles(geometry,p,project,meshKind);
      ctx.save();for(const c of components){
        ctx.beginPath();ctx.arc(c.x,c.y,c.index===options.componentSelection?7:4.5,0,TAU);
        ctx.fillStyle=c.index===options.componentSelection?'#ffd589':meshKind==='vertex'?'#9af4dc':'#80baff';
        ctx.fill();ctx.strokeStyle='#061222';ctx.lineWidth=1.5;ctx.stroke();
      }ctx.restore();
    }
  }
  const selected=pick.find(p=>p.id===selectedId);
  if(helpers&&!meshKind&&selected){ctx.strokeStyle='#d4d1ff';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(selected.x,selected.y,16,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  const selectedObject=helpers&&!meshKind&&tool!=='orbit'?scene.objects.find(o=>o.id===selectedId && o.visible):null;
  const pose=selectedObject?atFrame(selectedObject,frame):null;
  const handles=!pose?[]:tool==='rotate'?makeRotateHandles(pose,project):makeMoveHandles(pose,project);
  if(helpers&&tool==='move')drawMoveHandles(ctx,handles);
  if(helpers&&tool==='rotate')drawRotateHandles(ctx,handles);
  if(helpers&&tool==='scale')drawScaleHandles(ctx,handles);
  ctx.restore();
  return {pick,handles,components,faces:helpers?polys.map(f=>({id:f.id,points:f.proj,depth:f.depth})):[]};
}
