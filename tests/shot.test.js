import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SHOT_CAMERA,DEFAULT_RENDER,frameRange,sanitizeRender,sanitizeShotCamera} from '../src/shot.js';
import {crc32,makeZip} from '../src/zip.js';
import {demoScene,validateProject} from '../src/scene.js';
test('legacy scenes obtain a safe camera and render settings on import',()=>{
 const original=demoScene();
 delete original.shotCamera;delete original.renderSettings;
 const loaded=validateProject(JSON.parse(JSON.stringify(original)));
 assert.deepEqual(loaded.shotCamera,sanitizeShotCamera(null));
 assert.deepEqual(loaded.renderSettings,sanitizeRender(null));
});
test('shot camera and render output sanitize malformed project input',()=>{
 const malformed=sanitizeShotCamera({yaw:Infinity,pitch:2,distance:-1,target:[1,NaN,999]});
 assert.equal(malformed.yaw,DEFAULT_SHOT_CAMERA.yaw);
 assert.equal(malformed.pitch,1.42);
 assert.equal(malformed.distance,2);
 assert.deepEqual(malformed.target,[1,0,100]);
 const render=sanitizeRender({width:999999,height:999999,background:'url(javascript:bad)'});
 assert.deepEqual(render,DEFAULT_RENDER);
});
test('camera and render settings survive JSON round-trip with animations and materials',()=>{
 const original=demoScene();
 original.shotCamera={yaw:1.1,pitch:-.1,distance:15,target:[2,3,-1]};
 original.renderSettings={width:1280,height:720,background:'#123456'};
 const copy=validateProject(JSON.parse(JSON.stringify(original)));
 assert.deepEqual(copy.shotCamera,original.shotCamera);
 assert.deepEqual(copy.renderSettings,original.renderSettings);
 assert.deepEqual(copy.objects[0].keyframes,original.objects[0].keyframes);
});
test('frame range excludes duplicate/out of bounds frame indices',()=>{
 assert.deepEqual(frameRange(2,10,3,30),[2,5,8]);
 assert.deepEqual(frameRange(0,4,1,10),[0,1,2,3,4]);
 assert.throws(()=>frameRange(0,600,1,600),/120/);
 assert.throws(()=>frameRange(12,5,1,20));
 assert.throws(()=>frameRange(0,40,0,60));
});
test('standards-compliant ZIP32 headers and CRC32 for PNG frame entry',async()=>{
 const bytes=new TextEncoder().encode('123456789');
 assert.equal(crc32(bytes),0xcbf43926);
 const binary=new Uint8Array([137,80,78,71,0,1,2,3]);
 const blob=makeZip([{name:'frame_0002.png',data:binary}]);
 const raw=new Uint8Array(await blob.arrayBuffer()),dv=new DataView(raw.buffer);
 assert.equal(dv.getUint32(0,true),0x04034b50);
 assert.equal(dv.getUint16(8,true),0); // store method
 assert.equal(dv.getUint32(14,true),crc32(binary));
 const nameLen=dv.getUint16(26,true);
 assert.equal(new TextDecoder().decode(raw.subarray(30,30+nameLen)),'frame_0002.png');
 const centralOffset=30+nameLen+binary.length;
 assert.equal(dv.getUint32(centralOffset,true),0x02014b50);
 assert.equal(dv.getUint32(raw.length-22,true),0x06054b50);
 assert.equal(dv.getUint32(raw.length-6,true),centralOffset);
 assert.throws(()=>makeZip([{name:'../../bad.png',data:binary}]));
});
