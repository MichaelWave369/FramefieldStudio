import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_STEPS,getGuideStep} from '../src/creatorGuide.js';
import {STARTER_SCENES,createStarter} from '../src/starterScenes.js';
import {validateProject} from '../src/scene.js';

test('every guide step is navigable and has a distinct action',()=>{
  assert.equal(GUIDE_STEPS.length,6);
  assert.equal(new Set(GUIDE_STEPS.map(step=>step.id)).size,GUIDE_STEPS.length);
  assert.equal(new Set(GUIDE_STEPS.map(step=>step.action)).size,GUIDE_STEPS.length);
  assert.deepEqual(GUIDE_STEPS.map(s=>s.action),['starter','object','graph','lighting','render','save']);
  assert.equal(getGuideStep(-2),GUIDE_STEPS[0]);
  assert.equal(getGuideStep(999),GUIDE_STEPS.at(-1));
  assert.equal(getGuideStep(NaN),GUIDE_STEPS[0]);
});

test('all downloadable examples pass the same project validation as file import',()=>{
  for(const starter of STARTER_SCENES){
    const original=createStarter(starter.id);
    const clean=validateProject(JSON.parse(JSON.stringify(original)));
    assert.equal(clean.name,original.name);
    assert.equal(clean.objects.length,original.objects.length);
    assert.ok(clean.objects.every(object=>object.keyframes.length));
    assert.ok(original.objects.every(object=>object.visible));
    const next=createStarter(starter.id);
    assert.notEqual(next.objects[0].id,original.objects[0].id);
  }
});

test('release examples are portable and contain no external asset references',()=>{
  for(const starter of STARTER_SCENES){
    const project=createStarter(starter.id),json=JSON.stringify(project);
    assert.ok(json.length<100000);
    assert.equal(json.includes('http://'),false);
    assert.equal(json.includes('https://'),false);
    assert.ok(/^[a-z0-9-]+$/.test(starter.id));
  }
});
