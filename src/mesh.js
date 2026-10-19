// Original Framefield editable mesh geometry utilities. SPDX-License-Identifier: MIT
// The same primitive topology is used in object and edit modes.
const TAU=Math.PI*2;
const meshes=new Map();
const deg=n=>n*Math.PI/180;
export function primitiveMesh(kind) {
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

export function cloneMesh(mesh) {
  return {vertices:mesh.vertices.map(v=>[...v]),faces:mesh.faces.map(face=>[...face])};
}
export function validateMesh(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     !Array.isArray(raw.vertices)||!Array.isArray(raw.faces))
    throw Error('Invalid editable mesh.');
  if(raw.vertices.length<3||raw.vertices.length>800||raw.faces.length<1||raw.faces.length>1200)
    throw Error('Mesh exceeds geometry limits.');
  const vertices=raw.vertices.map(v=>{
    if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>10000))
      throw Error('Invalid mesh vertex.');
    return [...v];
  });
  const faces=raw.faces.map(face=>{
    if(!Array.isArray(face)||face.length<3||face.length>16||
       face.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length)||
       new Set(face).size!==face.length)
      throw Error('Invalid mesh face.');
    return [...face];
  });
  return {vertices,faces};
}
export function uniqueEdges(mesh){
  const edges=new Map();
  for(const face of mesh.faces){
    for(let i=0;i<face.length;i++){
      const a=face[i],b=face[(i+1)%face.length];
      const e=a<b?[a,b]:[b,a],name=e.join(':');
      if(!edges.has(name))edges.set(name,e);
    }
  }
  return [...edges.values()];
}
export function componentIndices(mesh,kind,index){
  if(kind==='vertex')return Number.isInteger(index)&&mesh.vertices[index]?[index]:[];
  if(kind==='face')return mesh.faces[index]?[...mesh.faces[index]]:[];
  if(kind==='edge')return uniqueEdges(mesh)[index]||[];
  return [];
}
export function moveMeshComponent(mesh,kind,index,delta){
  const indices=new Set(componentIndices(mesh,kind,index));
  if(!indices.size)return mesh;
  if(!Array.isArray(delta)||delta.length!==3||delta.some(n=>!Number.isFinite(n)))return mesh;
  return {...mesh,vertices:mesh.vertices.map((v,i)=>indices.has(i)
    ?v.map((n,k)=>Math.max(-10000,Math.min(10000,n+delta[k]))):[...v])};
}
export function transformVertex(v,p){
  let [x,y,z]=[v[0]*p.scale[0],v[1]*p.scale[1],v[2]*p.scale[2]];
  let a=deg(p.rotation[0]),c=Math.cos(a),s=Math.sin(a);[y,z]=[y*c-z*s,y*s+z*c];
  a=deg(p.rotation[1]);c=Math.cos(a);s=Math.sin(a);[x,z]=[x*c+z*s,-x*s+z*c];
  a=deg(p.rotation[2]);c=Math.cos(a);s=Math.sin(a);[x,y]=[x*c-y*s,x*s+y*c];
  return [x+p.position[0],y+p.position[1],z+p.position[2]];
}
export function toLocalDelta(world,p){
  let [x,y,z]=world;
  let a=-deg(p.rotation[2]),c=Math.cos(a),s=Math.sin(a);[x,y]=[x*c-y*s,x*s+y*c];
  a=-deg(p.rotation[1]);c=Math.cos(a);s=Math.sin(a);[x,z]=[x*c+z*s,-x*s+z*c];
  a=-deg(p.rotation[0]);c=Math.cos(a);s=Math.sin(a);[y,z]=[y*c-z*s,y*s+z*c];
  return [x,y,z].map((v,i)=>v/(Math.abs(p.scale[i])<.0001?(p.scale[i]<0?-.0001:.0001):p.scale[i]));
}
export function dragToLocal(camera,p,depth,dx,dy,width,height,snap=false){
  const yaw=camera.yaw,pitch=camera.pitch;
  const right=[Math.cos(yaw),0,-Math.sin(yaw)];
  const up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)];
  const factor=Math.max(depth,.1)/(Math.min(width,height)*1.12);
  const world=right.map((v,i)=>factor*(v*dx-up[i]*dy));
  const local=toLocalDelta(world,p).map(v=>Math.max(-100,Math.min(100,v)));
  return snap?local.map(v=>Math.round(v*4)/4):local;
}
export function componentHandles(mesh,p,project,kind) {
  if(!mesh)return [];
  const world=mesh.vertices.map(v=>transformVertex(v,p));
  let components=[];
  if(kind==='vertex')components=mesh.vertices.map((_,i)=>[i]);
  if(kind==='edge')components=uniqueEdges(mesh);
  if(kind==='face')components=mesh.faces;
  return components.flatMap((indices,index)=>{
    const centroid=indices[0]===undefined?null:indices[0]===null?null:
      indices.reduce((acc,i)=>acc.map((n,j)=>n+world[i][j]/indices.length),[0,0,0]);
    const xy=centroid?project(centroid):null;
    return xy?[{...xy,index,indices}]:[];
  });
}
export function pickComponent(handles,x,y,limit=13){
  let best=null;
  for(const c of handles){
    const distance=Math.hypot(x-c.x,y-c.y);
    if(distance>limit)continue;
    if(!best||distance<best.distance-1||Math.abs(distance-best.distance)<1&&c.depth<best.depth)
      best={index:c.index,distance,depth:c.depth};
  }
  return best?.index??null;
}
