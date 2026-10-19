import test from 'node:test';
import assert from 'node:assert/strict';
import {AUTOSAVE_KEY,AUTOSAVE_LIMIT,parseRecovery,readRecovery,storeDraft,clearRecovery} from '../src/recovery.js';
import {STARTER_SCENES,createStarter} from '../src/starterScenes.js';
import {validateProject} from '../src/scene.js';
import {pointInPolygon,pickSurface} from '../src/picking.js';
const memory=()=>{const items=new Map();return {
 getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value),
 removeItem:key=>items.delete(key)
};};
test('draft saves complete project and asks for explicit recovery after reload',()=>{
 const storage=memory(),project=createStarter('turntable');
 const saved=storeDraft(storage,project,1730000000000);
 assert.ok(saved.bytes>100);
 const recover=readRecovery(storage);
 assert.equal(recover.savedAt,1730000000000);
 assert.equal(recover.project.name,'Turntable Study');
 assert.equal(recover.project.objects[0].modifiers[0].type,'subdivide');
 clearRecovery(storage);assert.equal(storage.getItem(AUTOSAVE_KEY),null);
});
test('autosave errors are explicit and do not discard raw invalid backup',()=>{
 const raw='this is not JSON',bad=parseRecovery(raw);
 assert.match(bad.error,/Unexpected token|not valid JSON/);
 assert.equal(bad.raw,raw);
 assert.equal(parseRecovery(null),null);
 assert.match(parseRecovery('a'.repeat(AUTOSAVE_LIMIT+1)).error,/too large/);
 assert.throws(()=>storeDraft({setItem(){throw Error('Quota');}},createStarter('first-motion')),/Quota/);
});
test('starter scene templates are independent and project-valid',()=>{
 assert.equal(STARTER_SCENES.length,4);
 for(const meta of STARTER_SCENES){
   const first=createStarter(meta.id),second=createStarter(meta.id);
   assert.ok(first.objects.length>=2);
   assert.equal(validateProject(JSON.parse(JSON.stringify(first))).objects.length,first.objects.length);
   assert.notEqual(first.objects[0].id,second.objects[0].id);
 }
 const bounce=createStarter('bounce');
 assert.equal(bounce.duration,96);
 assert.equal(bounce.objects[0].keyframes.length,9);
 assert.throws(()=>createStarter('nothing'),/Unknown/);
});
test('point-in-polygon handles convex and concave faces',()=>{
 const square=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
 assert.equal(pointInPolygon(square,30,40),true);
 assert.equal(pointInPolygon(square,130,40),false);
 const l=[{x:0,y:0},{x:80,y:0},{x:80,y:20},{x:20,y:20},
   {x:20,y:80},{x:0,y:80}];
 assert.equal(pointInPolygon(l,60,60),false);
 assert.equal(pointInPolygon(l,10,60),true);
});
test('surface picking favors nearest depth and ignores irrelevant faces',()=>{
 const points=[{x:0,y:0},{x:70,y:0},{x:70,y:70},{x:0,y:70}];
 const faces=[{id:'behind',depth:8,points},{id:'front',depth:3,points}];
 assert.equal(pickSurface(faces,20,20),'front');
 assert.equal(pickSurface(faces,200,200),null);
 assert.equal(pickSurface([{id:null,depth:0,points}],20,20),null);
});
