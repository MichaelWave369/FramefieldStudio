/**
 * BPC XR export adapter for FramefieldStudio.
 *
 * Standalone user-requested, file-only export to bpc.spatial-preview.v1.
 * Reads evaluated source geometry without changing the Framefield project,
 * and produces a bounded packet compatible with Domistika XR's receiver.
 * An export is not an import, signing, render, or publication authorization.
 */
import {evaluateModifiers} from './modifiers.js';

export const BPC_XR_SCHEMA='bpc.spatial-preview.v1';
const TYPES=new Set(['box','sphere','pyramid','cylinder','torus']);
const COLOR=/^#[a-f0-9]{6}$/i;
const MAX_VERTICES=3500,MAX_TRIANGLES=9000;
const LIMIT=30,EPS=1e-8;
const fail=reason=>{throw Error(reason);};
const finite=(n,min,max,label)=>{
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)fail('BPC export: invalid '+label+'.');
  return n;
};
const vec=(v,min,max,label)=>{
  if(!Array.isArray(v)||v.length!==3)fail('BPC export: invalid '+label+'.');
  return v.map((n,i)=>finite(n,min,max,label+' '+i));
};
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const area=(a,b,c)=>Math.hypot(...cross(sub(b,a),sub(c,a)));
function toTriangles(geometry,label,isPrimitive){
  const vertices=geometry.vertices;
  const inputFaces=geometry.faces;
  if(!Array.isArray(vertices)||vertices.length<3||vertices.length>800||
    !Array.isArray(inputFaces)||inputFaces.length<1||inputFaces.length>1200)
    fail(label+': evaluated mesh exceeds BPC source-cage limits (800 vertices / 1200 faces).');
  const positions=vertices.map((v,i)=>vec(v,-LIMIT,LIMIT,label+' vertex '+i));
  const faces=[];
  for(const [fi,f] of inputFaces.entries()){
    if(!Array.isArray(f)||f.length<3||f.length>(isPrimitive?32:16))fail(label+': invalid polygon size at face '+fi+'.');
    if(f.some(i=>!Number.isInteger(i)||i<0||i>=positions.length)||new Set(f).size!==f.length)
      fail(label+': invalid polygon index at face '+fi+'.');
    // Fan triangulation approximates original Framefield primitive tessellation.
    // For *edited* meshes, fail closed rather than guessing how to cut a concave polygon.
    if(!isPrimitive&&f.length>3){
      const points=f.map(i=>positions[i]),normal=[0,0,0];
      for(let j=0;j<points.length;j++){
        const a=points[j],b=points[(j+1)%points.length];
        normal[0]+=(a[1]-b[1])*(a[2]+b[2]);
        normal[1]+=(a[2]-b[2])*(a[0]+b[0]);
        normal[2]+=(a[0]-b[0])*(a[1]+b[1]);
      }
      const mag=Math.hypot(...normal);
      if(mag<EPS)fail(label+': degenerate polygon '+fi+'.');
      const n=normal.map(x=>x/mag);
      if(points.some(p=>Math.abs(n[0]*(p[0]-points[0][0])+n[1]*(p[1]-points[0][1])+n[2]*(p[2]-points[0][2]))>.001))
        fail(label+': nonplanar edited face '+fi+'. Triangulate or repair it first.');
      for(let j=0;j<points.length;j++){
        const a=points[j],b=points[(j+1)%points.length],c=points[(j+2)%points.length];
        const cr=cross(sub(b,a),sub(c,b));
        if(cr[0]*n[0]+cr[1]*n[1]+cr[2]*n[2]<-EPS)
          fail(label+': concave edited face '+fi+'. Triangulate or repair it first.');
      }
    }
    for(let j=1;j<f.length-1;j++){
      const tri=[f[0],f[j],f[j+1]];
      if(area(...tri.map(i=>positions[i]))<EPS){
        // Common in generated sphere primitives at the poles; harmless to omit
        // one zero-area triangle, but never silently alter an authored cage.
        if(isPrimitive)continue;
        fail(label+': degenerate edited face '+fi+'.');
      }
      faces.push(tri);
      if(faces.length>1200)fail(label+': output exceeds 1200 triangles per object.');
    }
  }
  if(!faces.length)fail(label+': no renderable triangles remain.');
  return {vertices:positions,faces};
}
const frames=(raw,duration,label)=>{
  if(!Array.isArray(raw)||raw.length<1||raw.length>600)fail(label+': invalid keyframes.');
  const unique=new Set();
  return raw.map(k=>{
    const frame=finite(k.frame,0,duration,label+' frame');
    if(!Number.isInteger(frame)||unique.has(frame))fail(label+': duplicate or non-integer keyframe.');
    unique.add(frame);
    const rotationRadians=vec(k.rotation,-5729,5729,label+' rotation').map(deg=>deg*Math.PI/180);
    const scale=vec(k.scale,-LIMIT,LIMIT,label+' scale');
    if(scale.some(n=>Math.abs(n)<.001))fail(label+': non-invertible scale.');
    const entry={frame,position:vec(k.position,-LIMIT,LIMIT,label+' position'),rotationRadians,scale};
    if(k.curves!==undefined){
      if(!k.curves||typeof k.curves!=='object'||Array.isArray(k.curves))fail(label+': invalid curve map.');
      const curves={};
      for(const [channel,c] of Object.entries(k.curves)){
        if(!/^(position|rotation|scale)\.[012]$/.test(channel))fail(label+': unsupported animation curve '+channel+'.');
        if(c==='hold')curves[channel]='hold';
        else if(Array.isArray(c)&&c.length===4)curves[channel]=c.map((n,i)=>finite(n,0,1,label+' Bezier '+i));
        else fail(label+': invalid Bezier curve.');
      }
      if(Object.keys(curves).length)entry.curves=curves;
    }
    return entry;
  }).sort((a,b)=>a.frame-b.frame);
};
export function makeBpcXrPacket(project){
  if(!project||project.version!==1||!Array.isArray(project.objects))
    fail('BPC export expects a Framefield v1 scene.');
  const fps=finite(project.fps,12,60,'FPS');
  if(![12,24,30,60].includes(fps))fail('BPC export supports 12, 24, 30 or 60 FPS.');
  const duration=finite(project.duration,12,600,'duration');
  if(!Number.isInteger(duration))fail('BPC export duration must be a whole frame.');
  const visible=project.objects.filter(obj=>obj.visible!==false);
  if(visible.length===0)fail('BPC export needs at least one visible object.');
  if(visible.length>12)fail('BPC XR preview supports at most 12 visible objects. Hide some before export.');
  const assets=visible.map((obj,i)=>{
    const label=String(obj.name||('Object '+(i+1))).slice(0,65);
    if(!TYPES.has(obj.type))fail(label+': unsupported primitive.');
    if(!COLOR.test(obj.color))fail(label+': invalid hex color.');
    const isPrimitive=!obj.geometry;
    // evaluateModifiers uses Framefield's exact source primitive/mesh and modifier
    // operations. The resulting *evaluated* surface is an export-only copy.
    const evaluated=evaluateModifiers(obj);
    const geometry=toTriangles(evaluated,label,isPrimitive);
    return {kind:'framefield-object',sourceId:String(obj.id||('object-'+i)).slice(0,80),
      label,primitive:obj.type,color:obj.color.toLowerCase(),visible:true,
      mesh:{representation:'editable-source-cage',...geometry},modifiers:[],
      keyframes:frames(obj.keyframes,duration,label)};
  });
  const vertices=assets.reduce((n,a)=>n+a.mesh.vertices.length,0);
  const triangles=assets.reduce((n,a)=>n+a.mesh.faces.length,0);
  if(vertices>MAX_VERTICES||triangles>MAX_TRIANGLES)
    fail('BPC XR device budget exceeded: '+vertices+' vertices and '+triangles+' triangles. Hide objects or simplify the scene.');
  const result={schema:BPC_XR_SCHEMA,purpose:'inspection-only',coordinateSpace:'source-native',
    source:{format:'framefield.scene.v1',projectName:String(project.name||'FramefieldStudio').slice(0,80),
      sourceObjectCount:assets.length,fps,duration},
    assets,
    disclosures:[
      'User-requested local export only. No media upload, editor import, rendering or publishing.',
      'Visible Framefield surfaces and modifier results were triangulated for temporary XR preview.',
      'This packet carries transform keyframes but not materials, shader maps, editor history or native project editability.',
      'Transforms use source-native units and XYZ source rotation degrees normalized to radians. Receiver should apply Framefield X→Y→Z transform order.',
      'No signed provenance, asset rights assertion, collision mesh, manufacturing validation or print-ready geometry.'
    ],
    permissions:{execute:false,importIntoEditor:false,render:false,publish:false}};
  const bytes=new TextEncoder().encode(JSON.stringify(result)).byteLength;
  if(bytes>5*1024*1024)fail('BPC XR packet exceeds the 5 MiB receiver size limit.');
  return result;
}
