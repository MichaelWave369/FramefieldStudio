import test from 'node:test';
import assert from 'node:assert/strict';
import {atFrame,CURVE_PRESETS,easeAt,makeObject,pose,putKey,
  setChannelCurve,setChannelKeyValue,validateProject} from '../src/scene.js';
const animated=()=>{
  let o=putKey(makeObject('box',0,0),0,pose([0,0,0]));
  o=putKey(o,20,pose([10,0,0]));
  return o;
};
test('legacy keyframes without curves still interpolate linearly',()=>{
 const o=animated();assert.equal(atFrame(o,5).position[0],2.5);
 assert.equal(atFrame(o,10).position[0],5);
});
test('easing affects only the selected channel while preserving endpoints',()=>{
 const o=setChannelCurve(animated(),0,'position.0',CURVE_PRESETS.easeIn);
 assert.ok(atFrame(o,5).position[0]<2.5);
 assert.equal(atFrame(o,5).position[1],0);
 assert.equal(atFrame(o,0).position[0],0);
 assert.equal(atFrame(o,20).position[0],10);
});
test('hold applies until the next key, then reveals its exact value',()=>{
 const o=setChannelCurve(animated(),0,'position.0','hold');
 assert.equal(atFrame(o,19.999).position[0],0);
 assert.equal(atFrame(o,20).position[0],10);
});
test('key pose replacements preserve existing outgoing curves',()=>{
 let o=setChannelCurve(animated(),0,'position.0',CURVE_PRESETS.smooth);
 o=putKey(o,0,pose([2,3,0]));
 assert.deepEqual(o.keyframes[0].curves['position.0'],CURVE_PRESETS.smooth);
});
test('per-channel key value mutation leaves other channels untouched',()=>{
 const o=animated(),edit=setChannelKeyValue(o,20,'position.0',7);
 assert.equal(atFrame(edit,20).position[0],7);
 assert.equal(atFrame(edit,20).position[1],0);
 assert.equal(atFrame(o,20).position[0],10);
});
test('sanitized round-trip accepts curves and drops malformed or unknown ones',()=>{
 const obj=setChannelCurve(animated(),0,'position.0',[.3,.1,.7,.9]);
 const raw={name:'Test',fps:24,duration:60,objects:[obj]};
 raw.objects[0].keyframes[0].curves['malicious.channel']=[.5,.5,.5,.5];
 raw.objects[0].keyframes[0].curves['scale.1']=['oops',0,1,1];
 const loaded=validateProject(JSON.parse(JSON.stringify(raw)));
 const saved=loaded.objects[0].keyframes[0].curves;
 assert.deepEqual(saved,{'position.0':[.3,.1,.7,.9]});
 assert.equal(atFrame(loaded.objects[0],20).position[0],10);
});
test('smoothing is monotone and midpoint stable',()=>{
 const smooth=CURVE_PRESETS.smooth;
 assert.ok(Math.abs(easeAt(.5,smooth)-.5)<.000001);
 let prior=0;
 for(let i=1;i<=20;i++){const next=easeAt(i/20,smooth);assert.ok(next>=prior);prior=next;}
});
