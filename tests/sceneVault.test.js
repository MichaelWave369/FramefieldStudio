import test from 'node:test';
import assert from 'node:assert/strict';
import {addCheckpoint,readCheckpoints,deleteCheckpoint,restoreCheckpoint,exportCheckpoint,
 VAULT_KEY,VAULT_CAP,VAULT_COUNT} from '../src/sceneVault.js';
import {createStarter} from '../src/starterScenes.js';
const store=()=>{
 const data=new Map();
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),
  removeItem:k=>data.delete(k),getRaw:()=>data.get(VAULT_KEY)};
};
test('checkpoints preserve independent copies of scene projects',()=>{
 const mem=store(),scene=createStarter('turntable');
 addCheckpoint(mem,scene,'Manual backup',1,'a');
 scene.name='Changed After Snapshot';scene.objects[0].color='#ff0000';
 const loaded=restoreCheckpoint(mem,'a');
 assert.equal(loaded.name,'Turntable Study');
 assert.equal(loaded.objects[0].color,'#f3ac81');
 assert.equal(readCheckpoints(mem)[0].reason,'Manual backup');
 assert.equal(JSON.parse(exportCheckpoint(mem,'a')).name,'Turntable Study');
});
test('scene vault retains only five newest checkpoints, in order',()=>{
 const mem=store();
 for(let i=0;i<8;i++){
  const scene=createStarter('first-motion');scene.name='Scene '+i;
  addCheckpoint(mem,scene,'Before new project',i,'v'+i);
 }
 const list=readCheckpoints(mem);
 assert.equal(list.length,VAULT_COUNT);
 assert.deepEqual(list.map(x=>x.id),['v7','v6','v5','v4','v3']);
 deleteCheckpoint(mem,'v6');
 assert.equal(readCheckpoints(mem).length,4);
 assert.throws(()=>restoreCheckpoint(mem,'v6'),/no longer exists/);
});
test('one atomic write refuses quota failures without destroying previous backup',()=>{
 const mem=store();
 addCheckpoint(mem,createStarter('first-motion'),'Manual backup',1,'old');
 const existing=mem.getRaw();
 const full={getItem:key=>mem.getItem(key),setItem(){throw Error('Quota exceeded');}};
 assert.throws(()=>addCheckpoint(full,createStarter('bounce'),'Before opening JSON',2,'new'),/Quota exceeded/);
 assert.equal(mem.getRaw(),existing);
});
test('malformed scene vault cannot be overwritten silently',()=>{
 const mem=store();
 mem.setItem(VAULT_KEY,'{corrupt');
 assert.throws(()=>readCheckpoints(mem),/invalid JSON/);
 assert.throws(()=>addCheckpoint(mem,createStarter('bounce'),'Manual backup'),/invalid JSON/);
 assert.equal(mem.getRaw(),'{corrupt');
});
test('invalid project geometry fails validation before storing',()=>{
 const mem=store();
 const scene=createStarter('bounce');scene.objects[0].geometry={
  vertices:[[0,0,0]],faces:[[0,2,4]]
 };
 assert.throws(()=>addCheckpoint(mem,scene),/Mesh/);
 assert.equal(mem.getRaw(),undefined);
});
test('checkpoint JSON and browser storage remain bounded',()=>{
 const mem=store();
 assert.equal(VAULT_CAP,2700000);
 const scene=createStarter('first-motion');
 for(let i=0;i<VAULT_COUNT+2;i++)addCheckpoint(mem,scene,'Manual backup',i,'id'+i);
 assert.ok(mem.getRaw().length<VAULT_CAP);
 assert.ok(readCheckpoints(mem).length<=VAULT_COUNT);
});
