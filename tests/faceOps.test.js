import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneMesh,primitiveMesh,validateMesh} from '../src/mesh.js';
import {operateFace} from '../src/faceOps.js';

const cube=()=>cloneMesh(primitiveMesh('box'));
test('extrude creates shared boundary walls and a moved cap without mutating source',()=>{
  const original=cube();
  const result=operateFace(original,1,'extrude',.5); // +Z top face
  assert.equal(result.vertices.length,12);
  assert.equal(result.faces.length,10);
  assert.deepEqual(result.faces[1],[8,9,10,11]);
  assert.deepEqual(result.faces[6],[4,5,9,8]);
  assert.equal(result.vertices[8][2],1.1);
  assert.deepEqual(original,cube());
  assert.deepEqual(validateMesh(result),result);
});
test('inset retains original rim and creates four coplanar border faces',()=>{
  const m=cube(),result=operateFace(m,1,'inset',.25);
  assert.equal(result.vertices.length,12);
  assert.equal(result.faces.length,10);
  assert.ok(Math.abs(result.vertices[8][0])<Math.abs(m.vertices[4][0]));
  assert.equal(result.vertices[8][2],m.vertices[4][2]);
});
test('bevel face creates a smaller elevated cap and four sloped chamfer panels',()=>{
  const m=cube(),result=operateFace(m,1,'bevel',.3);
  assert.equal(result.vertices.length,12);
  assert.equal(result.faces.length,10);
  assert.ok(Math.abs(result.vertices[8][0])<Math.abs(m.vertices[4][0]));
  assert.ok(result.vertices[8][2]>m.vertices[4][2]);
  assert.deepEqual(validateMesh(result),result);
});
test('operations compose and retain cap as the same face selection',()=>{
  const m1=operateFace(cube(),1,'extrude',.2);
  const m2=operateFace(m1,1,'inset',.3);
  const m3=operateFace(m2,1,'bevel',.2);
  assert.equal(m3.vertices.length,20);
  assert.equal(m3.faces.length,18);
  assert.deepEqual(m3.faces[1],[16,17,18,19]);
  assert.deepEqual(validateMesh(m3),m3);
});
test('safe guards reject invalid face, nonfinite value, zero height and excess geometry',()=>{
  assert.throws(()=>operateFace(cube(),-1,'extrude',1),/Select a valid face/);
  assert.throws(()=>operateFace(cube(),1,'extrude',NaN),/finite/);
  assert.throws(()=>operateFace(cube(),1,'extrude',0),/greater than zero/);
  assert.throws(()=>operateFace(cube(),1,'inset',1.1),/Inset ratio/);
  assert.throws(()=>operateFace(cube(),1,'magic',.1),/Unknown/);
  const tooLarge={vertices:Array.from({length:799},(_,i)=>[i,0,0]),
    faces:[[0,1,2,3]]};
  assert.throws(()=>operateFace(tooLarge,0,'extrude',.3),/geometry limit/);
});
test('does not corrupt a closed mesh when operating on a triangular pyramid face',()=>{
  const pyramid=cloneMesh(primitiveMesh('pyramid'));
  const chosen=1,after=operateFace(pyramid,chosen,'extrude',.22);
  assert.equal(after.vertices.length,pyramid.vertices.length+3);
  assert.equal(after.faces.length,pyramid.faces.length+3);
  assert.deepEqual(validateMesh(after),after);
});
