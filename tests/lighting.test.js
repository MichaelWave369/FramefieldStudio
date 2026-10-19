import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LIGHTING,DEFAULT_MATERIAL,MATERIAL_PRESETS,sanitizeLighting,
  sanitizeMaterial,shadeFace} from '../src/lighting.js';
import {demoScene,validateProject,makeObject} from '../src/scene.js';
const rgb=color=>color.match(/\d+/g).map(Number);
const brightness=color=>rgb(color).reduce((sum,n)=>sum+n,0);
test('sane defaults preserve old projects without material or lighting fields',()=>{
  const legacy={name:'Old Animation',fps:24,duration:120,objects:[
    {...makeObject('box',0,0),material:undefined}
  ]};
  delete legacy.objects[0].material;
  const next=validateProject(legacy);
  assert.deepEqual(next.lighting,sanitizeLighting(null));
  assert.deepEqual(next.objects[0].material,DEFAULT_MATERIAL);
  assert.deepEqual(next.objects[0].keyframes,legacy.objects[0].keyframes);
  assert.ok(demoScene().lighting.key.enabled);
});
test('import normalizes lighting and material inputs and drops unknown properties',()=>{
  const incoming=demoScene();
  incoming.lighting={ambient:200,key:{enabled:false,intensity:-200,color:'invalid',direction:[9,NaN,'wat']},fill:{color:'#abcdef'}};
  incoming.objects[0].material={metalness:8,roughness:-1,emission:'oops',unexpected:'bad'};
  const loaded=validateProject(incoming);
  assert.deepEqual(loaded.objects[0].material,{roughness:0,metalness:1,emission:0});
  assert.equal(loaded.lighting.ambient,1);
  assert.equal(loaded.lighting.key.enabled,false);
  assert.equal(loaded.lighting.key.intensity,0);
  assert.equal(loaded.lighting.key.color,DEFAULT_LIGHTING.key.color);
  assert.deepEqual(loaded.lighting.key.direction,[3,DEFAULT_LIGHTING.key.direction[1],DEFAULT_LIGHTING.key.direction[2]]);
  assert.equal(loaded.lighting.fill.color,'#abcdef');
});
test('illumination is visible, configurable and emission still works in darkness',()=>{
  const dark=sanitizeLighting({ambient:0,key:{enabled:false},fill:{enabled:false}});
  const bright=sanitizeLighting({ambient:1,key:{enabled:true,intensity:2,direction:[0,0,1]},fill:{enabled:false}});
  const normal=[0,0,1],center=[0,0,0],eye=[0,0,8];
  const flat=shadeFace('#a08060',DEFAULT_MATERIAL,dark,normal,center,eye);
  const light=shadeFace('#a08060',DEFAULT_MATERIAL,bright,normal,center,eye);
  assert.ok(brightness(light)>brightness(flat)+100);
  assert.ok(brightness(shadeFace('#a08060',{...DEFAULT_MATERIAL,emission:1},dark,normal,center,eye))>brightness(flat));
});
test('roughness and metalness alter the rendered highlight',()=>{
  const lighting=sanitizeLighting({ambient:.1,key:{intensity:1,direction:[0,0,1],color:'#ffffff'},fill:{enabled:false}});
  const args=['#7799bb',lighting,[0,0,1],[0,0,0],[0,0,10]];
  const matte=shadeFace(args[0],MATERIAL_PRESETS.Matte,args[1],args[2],args[3],args[4]);
  const gloss=shadeFace(args[0],MATERIAL_PRESETS.Gloss,args[1],args[2],args[3],args[4]);
  const metal=shadeFace(args[0],MATERIAL_PRESETS.Metal,args[1],args[2],args[3],args[4]);
  assert.notEqual(matte,gloss);
  assert.notEqual(gloss,metal);
});
test('materials and lighting survive a safe project JSON round trip',()=>{
  const project=demoScene();project.objects[0].material={roughness:.2,metalness:.7,emission:.05};
  project.lighting.ambient=.25;project.lighting.key.color='#ffbb88';
  const loaded=validateProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(loaded.objects[0].material,project.objects[0].material);
  assert.equal(loaded.lighting.key.color,'#ffbb88');
  assert.equal(loaded.lighting.ambient,.25);
});
