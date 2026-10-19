// Framefield Studio v0.9: local, non-destructive mesh modifier evaluation.
// Original MIT implementation. Source geometry is never mutated.
// This is Catmull-Clark surface subdivision, not triangle-only tessellation.
import {primitiveMesh,validateMesh} from './mesh.js';
export const MAX_MODIFIERS=4, MAX_EVALUATED_VERTICES=7000, MAX_EVALUATED_FACES=6000;
const LIMIT=10000, EPS=1e-7;
const round=n=>Math.round(n*1e6)/1e6;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(v,k)=>v.map(n=>n*k);
const mean=(points)=>scale(points.reduce((s,v)=>add(s,v),[0,0,0]),1/points.length);
const edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
export function sanitizeModifiers(raw){
  if(raw===undefined||raw===null)return [];
  if(!Array.isArray(raw)||raw.length>MAX_MODIFIERS)throw Error('Invalid modifier stack.');
  return raw.map((m,i)=>{
    if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Invalid modifier at '+(i+1));
    const enabled=m.enabled!==false;
    if(m.type==='subdivide'){
      if(!Number.isInteger(m.levels)||m.levels<1||m.levels>2)
        throw Error('Subdivision levels must be 1 or 2.');
      return {type:'subdivide',enabled,levels:m.levels};
    }
    if(m.type==='mirror'){
      if(!Number.isInteger(m.axis)||m.axis<0||m.axis>2)
        throw Error('Mirror axis must be X, Y, or Z.');
      return {type:'mirror',enabled,axis:m.axis};
    }
    throw Error('Unknown modifier type.');
  });
}
function assertBudget(vertexCount,faceCount){
  if(vertexCount>MAX_EVALUATED_VERTICES||faceCount>MAX_EVALUATED_FACES)
    throw Error('Modifier preview exceeds mesh budget. Disable a modifier or lower subdivision.');
}
export function subdivideOnce(raw){
  const mesh=validateGeometry(raw);
  const {vertices,faces}=mesh,edges=new Map(),vertexFaces=vertices.map(()=>[]),
    vertexEdges=vertices.map(()=>[]),boundaryNeighbors=vertices.map(()=>new Set());
  const facePoints=faces.map(face=>mean(face.map(i=>vertices[i])));
  let corners=0;
  for(let fi=0;fi<faces.length;fi++){
    const face=faces[fi];corners+=face.length;
    for(const vi of face)vertexFaces[vi].push(fi);
    for(let j=0;j<face.length;j++){
      const a=face[j],b=face[(j+1)%face.length];
      const key=edgeKey(a,b);
      let edge=edges.get(key);
      if(!edge){edge={a,b,faces:[]};edges.set(key,edge);}
      if(!edge.faces.includes(fi))edge.faces.push(fi);
    }
  }
  assertBudget(vertices.length+edges.size+faces.length,corners);
  for(const edge of edges.values()){
    if(edge.faces.length>2)throw Error('Subdivision requires manifold edges.');
    vertexEdges[edge.a].push(edge);vertexEdges[edge.b].push(edge);
    if(edge.faces.length===1){
      boundaryNeighbors[edge.a].add(edge.b);
      boundaryNeighbors[edge.b].add(edge.a);
    }
  }
  const moved=vertices.map((p,i)=>{
    const edgeList=vertexEdges[i],adjacent=vertexFaces[i];
    if(!edgeList.length)return [...p];
    const boundary=[...boundaryNeighbors[i]];
    if(boundary.length){
      // Standard Catmull-Clark boundary rule; avoid undefined non-manifold forks.
      if(boundary.length!==2)return [...p];
      return [0,1,2].map(k=>round((6*p[k]+vertices[boundary[0]][k]+vertices[boundary[1]][k])/8));
    }
    const n=adjacent.length;
    if(!n)return [...p];
    const F=mean(adjacent.map(fi=>facePoints[fi]));
    const R=mean(edgeList.map(e=>mean([vertices[e.a],vertices[e.b]])));
    return [0,1,2].map(k=>round((F[k]+2*R[k]+(n-3)*p[k])/n));
  });
  const midpointIndex=new Map();
  for(const [key,edge] of edges){
    const v=mean([vertices[edge.a],vertices[edge.b]]);
    const p=edge.faces.length===2
      ?scale(add(add(vertices[edge.a],vertices[edge.b]),
          add(facePoints[edge.faces[0]],facePoints[edge.faces[1]])),.25)
      :v;
    midpointIndex.set(key,moved.length);
    moved.push(p.map(round));
  }
  const faceStart=moved.length;
  moved.push(...facePoints.map(p=>p.map(round)));
  const quads=[];
  for(let fi=0;fi<faces.length;fi++){
    const face=faces[fi];
    for(let j=0;j<face.length;j++){
      const before=face[(j-1+face.length)%face.length],at=face[j],next=face[(j+1)%face.length];
      quads.push([at,midpointIndex.get(edgeKey(at,next)),
        faceStart+fi,midpointIndex.get(edgeKey(before,at))]);
    }
  }
  return {vertices:moved,faces:quads};
}
function validateGeometry(mesh){
  // Source mesh has stricter import limits. Derived meshes may exceed those,
  // but must obey the separate evaluated budget.
  if(!mesh||!Array.isArray(mesh.vertices)||!Array.isArray(mesh.faces))throw Error('Invalid mesh.');
  assertBudget(mesh.vertices.length,mesh.faces.length);
  for(const v of mesh.vertices){
    if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>LIMIT))
      throw Error('Invalid mesh coordinate.');
  }
  for(const f of mesh.faces){
    if(!Array.isArray(f)||f.length<3||f.length>16||
      f.some(n=>!Number.isInteger(n)||n<0||n>=mesh.vertices.length))
      throw Error('Invalid mesh face.');
  }
  return mesh;
}
/** Retain the positive half of a mesh and reflect it across local X/Y/Z=0.
 * Plane-cut crossings share/weld vertices, preventing mirror seam cracks.
 * Results are ordinary indexed polygon geometry and are still non-destructive.
 */
export function mirrorHalf(raw,axis=0){
  const mesh=validateGeometry(raw);
  if(!Number.isInteger(axis)||axis<0||axis>2)throw Error('Invalid mirror axis.');
  const outVertices=[],outFaces=[],cache=new Map();
  const store=p=>{
    const normalized=p.map(n=>round(Math.abs(n)<EPS?0:n));
    const key=normalized.join(',');
    if(!cache.has(key)){cache.set(key,outVertices.length);outVertices.push(normalized);}
    return cache.get(key);
  };
  const clip=(face)=>{
    const result=[];
    for(let i=0;i<face.length;i++){
      const a=face[i],b=face[(i+1)%face.length];
      const insideA=a[axis]>=-EPS,insideB=b[axis]>=-EPS;
      if(insideA)result.push(a);
      if(insideA!==insideB){
        const t=-a[axis]/(b[axis]-a[axis]);
        const vertex=a.map((v,j)=>j===axis?0:v+(b[j]-v)*t);
        result.push(vertex);
      }
    }
    const cleaned=[];
    for(const p of result){
      if(!cleaned.length||Math.hypot(...p.map((n,k)=>n-cleaned.at(-1)[k]))>EPS)cleaned.push(p);
    }
    if(cleaned.length>2&&Math.hypot(...cleaned[0].map((n,i)=>n-cleaned.at(-1)[i]))<EPS)cleaned.pop();
    return cleaned;
  };
  const validFace=(face)=>face.length>=3&&new Set(face).size>=3;
  for(const indices of mesh.faces){
    const points=clip(indices.map(i=>mesh.vertices[i]));
    if(points.length<3)continue;
    // A face lying entirely on the mirror plane is internal, not a surface cap.
    if(points.every(p=>Math.abs(p[axis])<EPS))continue;
    const positive=points.map(store);
    if(validFace(positive))outFaces.push(positive);
    const reflected=points.map(p=>p.map((n,i)=>i===axis?-n:n)).reverse().map(store);
    if(validFace(reflected))outFaces.push(reflected);
    assertBudget(outVertices.length,outFaces.length);
  }
  if(!outFaces.length)throw Error('No faces remain on the positive side of mirror plane.');
  return validateGeometry({vertices:outVertices,faces:outFaces});
}
export function evaluateModifiers(object){
  const stack=sanitizeModifiers(object.modifiers);
  let mesh=object.geometry||primitiveMesh(object.type);
  if(!stack.some(m=>m.enabled))return mesh;
  for(const m of stack){
    if(!m.enabled)continue;
    if(m.type==='mirror')mesh=mirrorHalf(mesh,m.axis);
    else for(let i=0;i<m.levels;i++)mesh=subdivideOnce(mesh);
  }
  return mesh;
}
