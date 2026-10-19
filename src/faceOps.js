// Original face topology operators for Framefield Studio. SPDX-License-Identifier: MIT
// Each operation replaces the chosen face with a new cap, bridging its
// original boundary with shared-index quads. No original vertices are moved.
import {validateMesh} from './mesh.js';

const MAX_VERTICES=800,MAX_FACES=1200;
const round=n=>Math.round(n*1e6)/1e6;
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const len=v=>Math.hypot(...v);
const center=points=>[0,1,2].map(i=>points.reduce((sum,p)=>sum+p[i],0)/points.length);

/** Generate a new ring for one convex face, then connect it to the original rim.
 * @param {object} raw validated mesh (vertices/faces)
 * @param {number} faceIndex zero-based face
 * @param {'extrude'|'inset'|'bevel'} operation
 * @param {number} amount extrusion distance, inset fraction, or bevel distance
 * @returns {object} immutable mesh with the face index retained as its new cap
 */
export function operateFace(raw,faceIndex,operation,amount){
  const mesh=validateMesh(raw);
  if(!Number.isInteger(faceIndex)||faceIndex<0||faceIndex>=mesh.faces.length)
    throw Error('Select a valid face first.');
  if(!['extrude','inset','bevel'].includes(operation))
    throw Error('Unknown face operation.');
  if(typeof amount!=='number'||!Number.isFinite(amount))
    throw Error('Face amount must be finite.');
  if(operation==='inset'?amount<.05||amount>.8:amount<=0||amount>5)
    throw Error(operation==='inset'?'Inset ratio must be 0.05–0.8.':
      'Face distance must be greater than zero and at most 5.');
  const face=mesh.faces[faceIndex],n=face.length;
  if(mesh.vertices.length+n>MAX_VERTICES||mesh.faces.length+n>MAX_FACES)
    throw Error('Mesh geometry limit reached. Use a smaller mesh or fewer operations.');
  const rim=face.map(index=>mesh.vertices[index]);
  const centroid=center(rim);
  // Newell's method supports triangles, quads, and convex n-gons.
  const normal=[0,0,0];
  for(let i=0;i<n;i++){
    const a=rim[i],b=rim[(i+1)%n];
    normal[0]+=(a[1]-b[1])*(a[2]+b[2]);
    normal[1]+=(a[2]-b[2])*(a[0]+b[0]);
    normal[2]+=(a[0]-b[0])*(a[1]+b[1]);
  }
  const normSize=len(normal);
  if(normSize<1e-9)throw Error('Face is degenerate; cannot build new topology.');
  const unit=normal.map(v=>v/normSize);
  // Only inset or bevel convex faces: centroid scaling of concave faces may overlap.
  if(operation!=='extrude'){
    let sign=0;
    for(let i=0;i<n;i++){
      const a=sub(rim[(i+1)%n],rim[i]),b=sub(rim[(i+2)%n],rim[(i+1)%n]);
      const turn=dot(cross(a,b),unit);
      if(Math.abs(turn)<1e-8)continue;
      const s=Math.sign(turn);
      if(sign && sign!==s)throw Error('Inset and face bevel require a convex face.');
      sign=s;
    }
    if(!sign)throw Error('Face boundary is degenerate.');
  }
  // Many early primitive faces have mixed winding. Prefer the normal facing
  // away from the mesh's vertex-average center for a closed primitive shape.
  const meshCenter=center(mesh.vertices);
  const facing=dot(unit,sub(centroid,meshCenter))<0?-1:1;
  const height=operation==='inset'?0:amount;
  const shrink=operation==='inset'?amount:operation==='bevel'
    ?Math.min(.65,Math.max(.07,amount*.45)):0;
  const first=mesh.vertices.length;
  const cap=rim.map(vertex=>vertex.map((coord,k)=>{
    const value=centroid[k]+(coord-centroid[k])*(1-shrink)+unit[k]*facing*height;
    if(!Number.isFinite(value)||Math.abs(value)>10000)
      throw Error('Face result exceeds allowed coordinates.');
    return round(value);
  }));
  const vertices=[...mesh.vertices.map(v=>[...v]),...cap];
  const top=Array.from({length:n},(_,i)=>first+i);
  const faces=mesh.faces.map((f,i)=>i===faceIndex?top:[...f]);
  for(let i=0;i<n;i++){
    const next=(i+1)%n;
    faces.push([face[i],face[next],top[next],top[i]]);
  }
  return {vertices,faces};
}
