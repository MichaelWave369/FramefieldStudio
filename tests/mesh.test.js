import test from 'node:test';
import assert from 'node:assert/strict';
import {primitiveMesh,cloneMesh,validateMesh,uniqueEdges,componentIndices,
  moveMeshComponent,transformVertex,toLocalDelta,dragToLocal,componentHandles,pickComponent}
 from '../src/mesh.js';
test('editable cube topology yields 8 vertices 6 faces 12 unique edges',()=>{
 const m=cloneMesh(primitiveMesh('box'));
 assert.equal(m.vertices.length,8);assert.equal(m.faces.length,6);
 assert.equal(uniqueEdges(m).length,12);
 assert.notStrictEqual(m.vertices[0],primitiveMesh('box').vertices[0]);
});
test('vertex/edge/face selections only change referenced geometry',()=>{
 const m=cloneMesh(primitiveMesh('box'));
 const v=moveMeshComponent(m,'vertex',0,[0,1,0]);
 assert.equal(v.vertices[0][1],m.vertices[0][1]+1);
 assert.deepEqual(v.vertices[1],m.vertices[1]);
 const edge=moveMeshComponent(m,'edge',0,[1,0,0]);
 assert.equal(componentIndices(m,'edge',0).length,2);
 const changed=edge.vertices.filter((vert,i)=>vert[0]!==m.vertices[i][0]).length;
 assert.equal(changed,2);
 const face=moveMeshComponent(m,'face',0,[0,0,1]);
 assert.equal(face.vertices.filter((vert,i)=>vert[2]!==m.vertices[i][2]).length,4);
 assert.deepEqual(m,primitiveMesh('box'));
});
test('safe import rejects invalid indices, nonfinite geometry, and oversized meshes',()=>{
 const m=cloneMesh(primitiveMesh('box'));
 assert.deepEqual(validateMesh(m),m);
 assert.throws(()=>validateMesh({...m,faces:[[0,1,999]]}),/face/);
 assert.throws(()=>validateMesh({...m,vertices:[[Infinity,0,0],...m.vertices]}),/vertex/);
 assert.throws(()=>validateMesh({...m,vertices:Array(801).fill([0,0,0])}),/limits/);
 assert.throws(()=>validateMesh({...m,faces:[[0,0,1]]}),/face/);
});
test('world-local conversion reverses object rotation and scale',()=>{
 const p={position:[1,2,3],rotation:[22,34,-15],scale:[1.5,2,-.8]};
 const local=[.2,-.35,.48],origin=transformVertex([0,0,0],p);
 const target=transformVertex(local,p),delta=target.map((n,i)=>n-origin[i]);
 const inverse=toLocalDelta(delta,p);
 inverse.forEach((v,i)=>assert.ok(Math.abs(v-local[i])<1e-9));
});
test('projected mesh handles allow picking and camera-space dragging',()=>{
 const m=cloneMesh(primitiveMesh('box'));
 const p={position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
 const h=componentHandles(m,p,w=>({x:200+50*w[0]+12*w[2],y:100-50*w[1]+9*w[2],depth:9}),'vertex');
 assert.equal(h.length,8);
 assert.equal(pickComponent(h,h[0].x,h[0].y),0);
 assert.equal(pickComponent(h,1000,1000),null);
 const camera={yaw:0,pitch:0,distance:10,target:[0,0,0]};
 const d=dragToLocal(camera,p,10,50,0,500,500);
 assert.ok(d[0]>0);
 assert.ok(Math.abs(d[1])<1e-10);
});
