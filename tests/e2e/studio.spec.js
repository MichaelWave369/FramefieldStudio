import {test, expect} from '@playwright/test';

test('published-path React studio boots, renders UI and allows editing', async ({page}) => {
  const browserErrors=[];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', msg => {
    if(msg.type()==='error') browserErrors.push(msg.text());
  });
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/',{waitUntil:'networkidle'});
  await expect(page.getByText('FRAMEFIELD', {exact:true})).toBeVisible();
  await expect(page.getByRole('option', {name:/Orbit Cube/})).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('DOPE SHEET',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'+ Add'}).click();
  await expect(page.getByText('3 objects')).toBeVisible();
  await expect(page.getByText('3 objects')).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('undo and redo from the editor toolbar restore objects',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await test.step('Add object',async()=>{
    await page.getByRole('button',{name:'+ Add'}).click({timeout:3000});
    await expect(page.getByText('3 objects')).toBeVisible({timeout:3000});
  });
  await test.step('Undo object add',async()=>{
    await page.getByRole('button',{name:/Undo/}).click({timeout:3000});
    await expect(page.getByText('2 objects')).toBeVisible({timeout:3000});
  });
  await test.step('Redo object add',async()=>{
    await page.getByRole('button',{name:/Redo/}).click({timeout:3000});
    await expect(page.getByText('3 objects')).toBeVisible({timeout:3000});
  });
  expect(errors).toEqual([]);
});

test('axis gizmo drag modifies the selected object in one undo step',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const node=page.locator('canvas');
  await expect(node).toBeVisible();
  const box=await node.boundingBox();
  // Shared camera math used by the renderer, in CSS pixel coordinates.
  const {makeProject}=await import('../../src/projection.js');
  const {makeMoveHandles}=await import('../../src/gizmo.js');
  const camera={yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]};
  const project=makeProject(camera,box.width,box.height);
  const handles=makeMoveHandles({position:[-1.2,0,0]},project);
  const x=handles.find(h=>h.name==='X');
  expect(x).toBeTruthy();
  const start={x:box.x+x.origin.x+x.dx*.80,y:box.y+x.origin.y+x.dy*.80};
  const original=Number(await page.getByRole('spinbutton',{name:'position X'}).inputValue());
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(start.x+x.dx*.42,start.y+x.dy*.42,{steps:8});
  await page.mouse.up();
  const moved=Number(await page.getByRole('spinbutton',{name:'position X'}).inputValue());
  expect(moved).toBeGreaterThan(original+.2);
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('spinbutton',{name:'position X'})).toHaveValue(String(original));
  expect(errors).toEqual([]);
});

test('rotation gizmo changes a keyframe and undo restores the original angle',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
 await page.getByRole('button',{name:/Rotate/}).click();
 await expect(page.getByRole('button',{name:/Rotate/})).toHaveAttribute('aria-pressed','true');
 const node=page.locator('canvas');
 const box=await node.boundingBox();
 const {makeProject}=await import('../../src/projection.js');
 const {makeRotateHandles,hitRotateHandle}=await import('../../src/gizmo.js');
 const projector=makeProject({yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]},box.width,box.height);
 const rings=makeRotateHandles({position:[-1.2,0,0]},projector);
 const z=rings.find(h=>h.name==='Z');
 const point=z.points.slice(0,-1).find(p=>hitRotateHandle(rings,p.x,p.y)?.name==='Z' &&
   Math.hypot(p.x-z.origin.x,p.y-z.origin.y)>25);
 expect(point).toBeTruthy();
 const start={x:box.x+point.x,y:box.y+point.y};
 const rad=.35,rx=point.x-z.origin.x,ry=point.y-z.origin.y;
 const end={x:box.x+z.origin.x+rx*Math.cos(rad)-ry*Math.sin(rad),
   y:box.y+z.origin.y+rx*Math.sin(rad)+ry*Math.cos(rad)};
 const before=Number(await page.getByRole('spinbutton',{name:'rotation Z'}).inputValue());
 await page.mouse.move(start.x,start.y);await page.mouse.down();
 await page.mouse.move(end.x,end.y,{steps:7});await page.mouse.up();
 const after=Number(await page.getByRole('spinbutton',{name:'rotation Z'}).inputValue());
 expect(after).toBeGreaterThan(before+10);
 await page.getByRole('button',{name:/Undo/}).click();
 await expect(page.getByRole('spinbutton',{name:'rotation Z'})).toHaveValue(String(before));
 expect(errors).toEqual([]);
});

test('scale gizmo changes one axis and undo restores its scale',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
 await page.getByRole('button',{name:/Scale/}).click();
 const node=page.locator('canvas'),box=await node.boundingBox();
 const {makeProject}=await import('../../src/projection.js');
 const {makeMoveHandles}=await import('../../src/gizmo.js');
 const p=makeProject({yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]},box.width,box.height);
 const x=makeMoveHandles({position:[-1.2,0,0]},p).find(h=>h.name==='X');
 expect(x).toBeTruthy();
 const start={x:box.x+x.origin.x+x.dx*.8,y:box.y+x.origin.y+x.dy*.8};
 const original=Number(await page.getByRole('spinbutton',{name:'scale X'}).inputValue());
 await page.mouse.move(start.x,start.y);await page.mouse.down();
 await page.mouse.move(start.x+x.dx*.6,start.y+x.dy*.6,{steps:8});await page.mouse.up();
 const changed=Number(await page.getByRole('spinbutton',{name:'scale X'}).inputValue());
 expect(changed).toBeGreaterThan(original+.2);
 await page.getByRole('button',{name:/Undo/}).click();
 await expect(page.getByRole('spinbutton',{name:'scale X'})).toHaveValue(String(original));
 expect(errors).toEqual([]);
});

test('graph editor changes interpolation and Undo restores the linear value',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Graph Editor'}).click();
  await expect(page.getByRole('img',{name:'Editable animation curve'})).toBeVisible();
  await page.getByRole('combobox',{name:'Curve preset'}).selectOption('easeIn');
  await expect(page.getByRole('combobox',{name:'Curve preset'})).toHaveValue('easeIn');
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('combobox',{name:'Curve preset'})).toHaveValue('linear');
  expect(errors).toEqual([]);
});

test('graph key drag edits a selected channel value; Undo and Redo work',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Graph Editor'}).click();
  const node=page.getByTestId('curve-key-60');
  await expect(node).toBeVisible();
  await node.click(); // Select frame 60 before measuring the inspector's value.
  await expect(page.getByRole('spinbutton',{name:'position X'})).toHaveValue('1.2');
  const box=await node.boundingBox();
  const before=Number(await page.getByRole('spinbutton',{name:'position X'}).inputValue());
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2-35,{steps:8});
  await page.mouse.up();
  const after=Number(await page.getByRole('spinbutton',{name:'position X'}).inputValue());
  expect(after).toBeGreaterThan(before+.15);
  await page.getByRole('button',{name:/Undo/}).click();
  const old=Number(await page.getByRole('spinbutton',{name:'position X'}).inputValue());
  expect(old).toBeCloseTo(before,2);
  await page.getByRole('button',{name:/Redo/}).click();
  const again=Number(await page.getByRole('spinbutton',{name:'position X'}).inputValue());
  expect(again).toBeCloseTo(after,2);
  expect(errors).toEqual([]);
});

test('curve handles can be dragged into a custom easing shape',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Graph Editor'}).click();
  const preset=page.getByRole('combobox',{name:'Curve preset'});
  await preset.selectOption('smooth');
  const handle=page.getByTestId('curve-handle-0');
  await expect(handle).toBeVisible();
  const box=await handle.boundingBox();
  const center={x:box.x+box.width/2,y:box.y+box.height/2};
  await page.mouse.move(center.x,center.y);await page.mouse.down();
  await page.mouse.move(center.x+24,center.y-12,{steps:6});await page.mouse.up();
  await expect(preset).toHaveValue('custom');
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(preset).toHaveValue('smooth');
  expect(errors).toEqual([]);
});

test('materials and lighting controls change the rendered viewport and support Undo',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const viewport=page.locator('canvas');
  const before=await viewport.evaluate(c=>c.toDataURL('image/png'));
  await page.getByRole('button',{name:'Gloss',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Roughness'})).toHaveValue('0.12');
  const shiny=await viewport.evaluate(c=>c.toDataURL('image/png'));
  expect(shiny).not.toEqual(before);
  await page.getByRole('button',{name:'Lighting',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Ambient strength'})).toBeVisible();
  await page.getByRole('checkbox',{name:'Key light enabled'}).uncheck();
  await page.getByRole('checkbox',{name:'Fill light enabled'}).uncheck();
  await page.getByRole('spinbutton',{name:'Ambient strength'}).fill('0');
  const dark=await viewport.evaluate(c=>c.toDataURL('image/png'));
  expect(dark).not.toEqual(shiny);
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('spinbutton',{name:'Ambient strength'})).toHaveValue('0.48');
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('checkbox',{name:'Fill light enabled'})).toBeChecked();
  expect(errors).toEqual([]);
});

test('material and scene-light settings survive a downloaded project and reload',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Metal',exact:true}).click();
  await page.getByRole('button',{name:'Lighting',exact:true}).click();
  await page.getByRole('spinbutton',{name:'Ambient strength'}).fill('0.26');
  await page.getByRole('spinbutton',{name:'Key light intensity'}).fill('1.4');
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const download=await event;
  const fs=await import('node:fs/promises');
  const original=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(original.lighting.ambient).toBe(.26);
  expect(original.lighting.key.intensity).toBe(1.4);
  expect(original.objects[0].material.metalness).toBe(.92);
  await page.getByRole('button',{name:'New',exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({
    name:'studio-round-trip.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(original))
  });
  await expect(page.getByRole('spinbutton',{name:'Ambient strength'})).toHaveValue('0.26');
  await page.getByRole('button',{name:'Object',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Metalness'})).toHaveValue('0.92');
  expect(errors).toEqual([]);
});

test('saved shot preview keeps editor view separate and Render PNG has chosen dimensions',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Camera/Render'}).click();
  await expect(page.getByRole('spinbutton',{name:'Shot distance'})).toHaveValue('9.3');
  await page.getByRole('spinbutton',{name:'Shot distance'}).fill('14');
  await page.getByRole('combobox',{name:'Render resolution'}).selectOption('640x360');
  await page.locator('input[aria-label="Render background"]').fill('#222a44');
  await page.getByRole('button',{name:'Preview Shot'}).click();
  await expect(page.getByText('SHOT CAMERA',{exact:true})).toBeVisible();
  await expect(page.getByText(/camera locked/)).toBeVisible();
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:/Render Frame 0/}).click();
  const file=await event;
  expect(file.suggestedFilename()).toMatch(/shot-f0000\.png$/);
  const bytes=await (await import('node:fs/promises')).readFile(await file.path());
  expect(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))).toBe(true);
  expect(bytes.readUInt32BE(16)).toBe(640);
  expect(bytes.readUInt32BE(20)).toBe(360);
  await page.getByRole('button',{name:'Save JSON'}).click();
  // A regular JSON export still works with the new camera and render settings.
  const unsaved=page.getByRole('spinbutton',{name:'Shot distance'});
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(unsaved).toHaveValue('14'); // undo the background edit, not the camera edit
  expect(errors).toEqual([]);
});

test('PNG frame sequence ZIP contains the requested numbered frames',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Camera/Render'}).click();
  await page.getByRole('combobox',{name:'Render resolution'}).selectOption('640x360');
  await page.getByRole('spinbutton',{name:'Sequence start'}).fill('2');
  await page.getByRole('spinbutton',{name:'Sequence end'}).fill('6');
  await page.getByRole('spinbutton',{name:'Sequence step'}).fill('2');
  await expect(page.getByText(/3 PNG frames/)).toBeVisible();
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export PNG Sequence ZIP'}).click();
  const file=await event;
  expect(file.suggestedFilename()).toMatch(/frames-2-6\.zip$/);
  const bytes=await (await import('node:fs/promises')).readFile(await file.path());
  expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
  const text=bytes.toString('latin1');
  expect(text).toContain('frame_0002.png');
  expect(text).toContain('frame_0004.png');
  expect(text).toContain('frame_0006.png');
  expect(bytes.readUInt16LE(bytes.length-22+10)).toBe(3);
  expect(errors).toEqual([]);
});

test('shot camera and render settings survive JSON project round-trip',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Camera/Render'}).click();
  await page.getByRole('spinbutton',{name:'Shot distance'}).fill('17');
  await page.getByRole('combobox',{name:'Render resolution'}).selectOption('1280x720');
  const save=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const download=await save;
  const data=JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(),'utf8'));
  expect(data.shotCamera.distance).toBe(17);
  expect(data.renderSettings.width).toBe(1280);
  await page.getByRole('button',{name:'New',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Shot distance'})).toHaveValue('9.3');
  await page.locator('input[type="file"]').setInputFiles({
    name:'framefield-render-round-trip.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(data))
  });
  await expect(page.getByRole('spinbutton',{name:'Shot distance'})).toHaveValue('17');
  await expect(page.getByRole('combobox',{name:'Render resolution'})).toHaveValue('1280x720');
  expect(errors).toEqual([]);
});

test('Mesh Workshop converts a primitive, moves its vertex, and Undo restores it',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
 await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
 await expect(page.getByRole('group',{name:'Mesh selection mode'})).toBeVisible();
 await expect(page.getByText('8 vertices',{exact:true})).toBeVisible();
 await expect(page.getByText('12 edges')).toBeVisible();
 await expect(page.getByText('6 faces',{exact:true})).toBeVisible();
 const field=page.getByRole('spinbutton',{name:'Mesh vertex Y'});
 const old=Number(await field.inputValue());
 await field.fill(String(old+0.75));
 await expect(field).toHaveValue(String(Number((old+0.75).toFixed(3))));
 await page.getByRole('button',{name:/Undo/}).click();
 await expect(field).toHaveValue(String(old));
 expect(errors).toEqual([]);
});

test('mesh viewport vertex drag changes geometry, and edge/face modes stay interactive',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
 await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
 const canvas=page.locator('canvas'),rect=await canvas.boundingBox();
 const {makeProject}=await import('../../src/projection.js');
 const {componentHandles,primitiveMesh}=await import('../../src/mesh.js');
 const projection=makeProject({yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]},rect.width,rect.height);
 const mesh=primitiveMesh('box');
 const pose={position:[-1.2,0,0],rotation:[0,0,0],scale:[1,1,1]};
 const components=componentHandles(mesh,pose,projection,'vertex');
 const pick=components[0];expect(pick).toBeTruthy();
 const field=page.getByRole('spinbutton',{name:'Mesh vertex X'});
 const old=Number(await field.inputValue());
 await page.mouse.move(rect.x+pick.x,rect.y+pick.y);await page.mouse.down();
 await page.mouse.move(rect.x+pick.x+45,rect.y+pick.y,{steps:8});await page.mouse.up();
 const value=Number(await field.inputValue());expect(value).not.toBe(old);
 await page.getByRole('button',{name:/Undo/}).click();
 await expect(field).toHaveValue(String(old));
 await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Edge'}).click();
 await expect(page.getByRole('spinbutton',{name:'Mesh edge X'})).toBeVisible();
 await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Face'}).click();
 await expect(page.getByRole('spinbutton',{name:'Mesh face Z'})).toBeVisible();
 await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Done'}).click();
 await expect(page.getByRole('spinbutton',{name:'position X'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('editable mesh saves, loads, and renders without losing animation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
 await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
 await page.getByRole('spinbutton',{name:'Mesh vertex Y'}).fill('1.55');
 const event=page.waitForEvent('download');
 await page.getByRole('button',{name:'Save JSON'}).click();
 const file=await event;
 const fs=await import('node:fs/promises');
 const json=JSON.parse(await fs.readFile(await file.path(),'utf8'));
 expect(json.objects[0].geometry.vertices[0][1]).toBe(1.55);
 expect(json.objects[0].keyframes.length).toBe(3);
 await page.getByRole('button',{name:'New',exact:true}).click();
 await page.locator('input[type="file"]').setInputFiles({
   name:'mesh-round-trip.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(json))
 });
 await page.getByRole('button',{name:'Vertex'}).click();
 await expect(page.getByRole('spinbutton',{name:'Mesh vertex Y'})).toHaveValue('1.55');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Render PNG'}).click();
 const png=await download;
 const bytes=await fs.readFile(await png.path());
 expect(bytes.readUInt32BE(16)).toBe(960);
 expect(errors).toEqual([]);
});

test('face extrusion and inset build real geometry, each undoable in one step',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
  await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Face'}).click();
  await expect(page.getByRole('group',{name:'Face topology tools'})).toBeVisible();
  const selected=page.getByRole('combobox',{name:'Selected mesh element'});
  await selected.selectOption('1');
  await page.getByRole('spinbutton',{name:'Extrude Face amount'}).fill('0.6');
  await page.getByRole('button',{name:'Extrude Face'}).click();
  await expect(page.getByText('12 vertices',{exact:true})).toBeVisible();
  await expect(page.getByText('10 faces',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByText('8 vertices',{exact:true})).toBeVisible();
  await expect(page.getByText('6 faces',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Redo/}).click();
  await expect(page.getByText('12 vertices',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Inset Face'}).click();
  await expect(page.getByText('16 vertices',{exact:true})).toBeVisible();
  await expect(page.getByText('14 faces',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('face bevel creates chamfer panels and JSON preserves the edited topology for rendering',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
  await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Face'}).click();
  await page.getByRole('combobox',{name:'Selected mesh element'}).selectOption('1');
  await page.getByRole('button',{name:'Bevel Face'}).click();
  await expect(page.getByText('12 vertices',{exact:true})).toBeVisible();
  await expect(page.getByText('10 faces',{exact:true})).toBeVisible();
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const download=await event;
  const fs=await import('node:fs/promises');
  const data=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(data.objects[0].geometry.vertices).toHaveLength(12);
  expect(data.objects[0].geometry.faces).toHaveLength(10);
  expect(data.objects[0].keyframes).toHaveLength(3);
  await page.getByRole('button',{name:'New',exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({
    name:'face-bevel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))
  });
  await expect(page.getByRole('option',{name:/Orbit Cube/})).toBeVisible();
  await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Face'}).click();
  await expect(page.getByText('12 vertices',{exact:true})).toBeVisible();
  const pngEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Render PNG'}).click();
  const image=await pngEvent,bytes=await fs.readFile(await image.path());
  expect(bytes.readUInt32BE(16)).toBe(960);
  expect(bytes.readUInt32BE(20)).toBe(540);
  expect(errors).toEqual([]);
});

test('invalid face-operation input is caught without crashing or modifying geometry',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
  await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Face'}).click();
  await page.getByRole('spinbutton',{name:'Extrude Face amount'}).fill('0');
  await page.getByRole('button',{name:'Extrude Face'}).click();
  await expect(page.getByText('8 vertices',{exact:true})).toBeVisible();
  await expect(page.getByText('6 faces',{exact:true})).toBeVisible();
  await expect(page.getByText(/Mesh operation unavailable/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('subdivision modifier updates rendered geometry without touching original mesh',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const before=await page.locator('canvas').evaluate(node=>node.toDataURL());
  const counts=page.getByTestId('modifier-mesh-counts');
  await expect(counts).toContainText('Source: 8V / 6F');
  await page.getByRole('button',{name:'+ Subdivision'}).click();
  await expect(counts).toContainText('Preview: 26V / 24F');
  await expect(counts).toContainText('Source: 8V / 6F');
  const after=await page.locator('canvas').evaluate(node=>node.toDataURL());
  expect(after).not.toBe(before);
  await page.getByRole('checkbox',{name:'Modifier 1 enabled'}).uncheck();
  await expect(counts).toContainText('Preview: 8V / 6F');
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('checkbox',{name:'Modifier 1 enabled'})).toBeChecked();
  await expect(counts).toContainText('Preview: 26V / 24F');
  await page.getByRole('button',{name:/Redo/}).click();
  await expect(counts).toContainText('Preview: 8V / 6F');
  expect(errors).toEqual([]);
});

test('mirror modifier welds the center seam; stack order and toggle persist in JSON',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const counts=page.getByTestId('modifier-mesh-counts');
  await page.getByRole('button',{name:'+ Mirror'}).click();
  await expect(counts).toContainText('Preview: 12V / 10F');
  await page.getByRole('combobox',{name:'Mirror 1 axis'}).selectOption('2');
  await page.getByRole('button',{name:'+ Subdivision'}).click();
  await expect(counts).toContainText('Preview: 42V / 40F');
  await page.getByRole('button',{name:'Move modifier 2 up'}).click();
  await expect(page.getByRole('combobox',{name:'Subdivision 1 levels'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Mirror 2 axis'})).toHaveValue('2');
  await page.getByRole('checkbox',{name:'Modifier 2 enabled'}).uncheck();
  await expect(counts).toContainText('Preview: 26V / 24F');
  const save=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const download=await save;
  const fs=await import('node:fs/promises');
  const original=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(original.objects[0].geometry).toBeUndefined();
  expect(original.objects[0].modifiers).toEqual([
    {type:'subdivide',enabled:true,levels:1},{type:'mirror',enabled:false,axis:2}
  ]);
  await page.getByRole('button',{name:'New',exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({
    name:'modifier-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(original))
  });
  await expect(page.getByRole('combobox',{name:'Mirror 2 axis'})).toHaveValue('2');
  await expect(page.getByRole('checkbox',{name:'Modifier 2 enabled'})).not.toBeChecked();
  await expect(counts).toContainText('Preview: 26V / 24F');
  expect(errors).toEqual([]);
});

test('modifiers are included in clean camera PNG while the source remains editable',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const snapshot=async()=>{
    const event=page.waitForEvent('download');
    await page.getByRole('button',{name:'Render PNG'}).click();
    const item=await event;
    return (await import('node:fs/promises')).readFile(await item.path());
  };
  const plain=await snapshot();
  await page.getByRole('button',{name:'+ Subdivision'}).click();
  const smooth=await snapshot();
  expect(smooth.equals(plain)).toBe(false);
  await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
  await expect(page.getByText('8 vertices',{exact:true})).toBeVisible();
  await expect(page.getByTestId('modifier-mesh-counts')).toContainText('Preview: 26V / 24F');
  await page.getByRole('group',{name:'Mesh selection mode'}).getByRole('button',{name:'Face'}).click();
  await expect(page.getByRole('button',{name:'Extrude Face'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('starter gallery builds a ready-to-edit scene with Undo back to the previous project',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Starter Scenes'}).click();
  const dialog=page.getByRole('dialog',{name:'Starter scenes'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Create Turntable'}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Turntable Study');
  await expect(page.getByTestId('modifier-mesh-counts')).toContainText('Preview: 26V / 24F');
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('First Motion');
  expect(errors).toEqual([]);
});

test('autosave offers explicit recovery after refresh, preserving creator edits',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('textbox',{name:'Project name'}).fill('Creator Recovery Study');
  await expect(page.locator('.local-save-state')).toHaveText('Saved locally');
  await page.reload();
  const prompt=page.getByRole('dialog',{name:'Restore local autosave'});
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('Creator Recovery Study');
  await prompt.getByRole('button',{name:'Restore saved scene'}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Creator Recovery Study');
  await expect(prompt).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('discarding recovery does not silently rewrite a draft or change the starter scene',async({page})=>{
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('textbox',{name:'Project name'}).fill('Throwaway Draft');
  await expect(page.locator('.local-save-state')).toHaveText('Saved locally');
  await page.reload();
  const recovery=page.getByRole('dialog',{name:'Restore local autosave'});
  await recovery.getByRole('button',{name:'Discard local draft'}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('First Motion');
  await page.reload();
  await expect(page.getByRole('dialog',{name:'Restore local autosave'})).toHaveCount(0);
});

test('corrupt local draft is surfaced without executing or silently replacing it',async({page})=>{
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.evaluate(()=>localStorage.setItem('framefield-studio:local-draft:v1','{incomplete'));
  await page.reload();
  const prompt=page.getByRole('dialog',{name:'Restore local autosave'});
  await expect(prompt).toContainText('unreadable draft');
  const event=page.waitForEvent('download');
  await prompt.getByRole('button',{name:'Download draft backup'}).click();
  const file=await event;
  expect(file.suggestedFilename()).toBe('framefield-local-draft-backup.json');
  await prompt.getByRole('button',{name:'Discard local draft'}).click();
  await expect(prompt).toHaveCount(0);
});

test('surface picking selects a visible object while retaining keyboard orbit and gizmos',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const canvas=page.getByRole('img',{name:'Interactive 3D viewport'}).or(page.locator('canvas'));
  const box=await page.locator('canvas').boundingBox();
  const {makeProject}=await import('../../src/projection.js');
  const projector=makeProject({yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]},box.width,box.height);
  const sphereCenter=projector([1.5,-.35,0]);
  await page.mouse.click(box.x+sphereCenter.x,box.y+sphereCenter.y);
  await expect(page.getByRole('option',{name:/Floating Sphere/})).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('g');
  await expect(page.getByRole('button',{name:/Move/})).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});

test('Quick Start tour opens, navigates and jumps into the actual Graph Editor',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Quick Start'}).click();
  const guide=page.getByRole('dialog',{name:'Quick Start guide'});
  await expect(guide).toBeVisible();
  await expect(guide.getByText('Start with something alive')).toBeVisible();
  await guide.getByRole('button',{name:'Next →'}).click();
  await expect(guide.getByText('Shape the scene')).toBeVisible();
  await guide.getByRole('button',{name:'Go to step 3: Make motion feel intentional'}).click();
  await expect(guide.getByText('Make motion feel intentional')).toBeVisible();
  await guide.getByRole('button',{name:'Open Graph Editor'}).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('group',{name:'Animation editors'})
    .getByRole('button',{name:'Graph Editor'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Quick Start'}).click();
  await expect(guide.getByRole('link',{name:/Full User Manual/}))
    .toHaveAttribute('href',/docs\/USER_MANUAL\.md$/);
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('downloading a starter JSON keeps current project and Undo history unchanged',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const project=page.getByRole('textbox',{name:'Project name'});
  await expect(project).toHaveValue('First Motion');
  const undo=page.getByRole('button',{name:/Undo/});
  await expect(undo).toBeDisabled();
  await page.getByRole('button',{name:'Starter Scenes'}).click();
  const gallery=page.getByRole('dialog',{name:'Starter scenes'});
  const downloading=page.waitForEvent('download');
  await gallery.getByRole('button',{name:'Download Bouncing Ball JSON'}).click();
  const download=await downloading;
  expect(download.suggestedFilename()).toBe('framefield-example-bounce.framefield.json');
  const fs=await import('node:fs/promises');
  const json=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(json.name).toBe('Bouncing Ball');
  expect(json.objects[0].keyframes).toHaveLength(9);
  await expect(gallery).toBeVisible();
  await gallery.getByRole('button',{name:'Close starter scenes'}).click();
  await expect(project).toHaveValue('First Motion');
  await expect(undo).toBeDisabled();
  expect(errors).toEqual([]);
});

test('downloaded example JSON can be opened and rendered in a new project',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('button',{name:'Starter Scenes'}).click();
  const gallery=page.getByRole('dialog',{name:'Starter scenes'});
  const downloading=page.waitForEvent('download');
  await gallery.getByRole('button',{name:'Download Product Showcase JSON'}).click();
  const download=await downloading;
  const fs=await import('node:fs/promises');
  const json=await fs.readFile(await download.path());
  await gallery.getByRole('button',{name:'Close starter scenes'}).click();
  await page.getByRole('button',{name:'New',exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({
    name:download.suggestedFilename(),mimeType:'application/json',buffer:json
  });
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Product Showcase');
  await page.getByRole('button',{name:'Camera/Render'}).click();
  const render=page.waitForEvent('download');
  await page.getByRole('button',{name:/Render Frame 0/}).click();
  const png=await render;
  const bytes=await fs.readFile(await png.path());
  expect(bytes.readUInt32BE(16)).toBe(960);
  expect(bytes.readUInt32BE(20)).toBe(540);
  expect(errors).toEqual([]);
});

test('Scene Vault automatically protects a project before New, and restores it with Undo',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('textbox',{name:'Project name'}).fill('My Scene Vault Sculpture');
  await page.getByRole('button',{name:'New',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Untitled Motion');
  await page.getByRole('button',{name:'Scene Vault'}).click();
  const vault=page.getByRole('dialog',{name:'Scene Vault'});
  await expect(vault).toContainText('My Scene Vault Sculpture');
  await expect(vault).toContainText('Before new project');
  await vault.getByRole('button',{name:'Restore',exact:true}).click();
  await expect(vault).toHaveCount(0);
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('My Scene Vault Sculpture');
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Untitled Motion');
  expect(errors).toEqual([]);
});

test('Scene Vault protects current scene on starter switch, and checkpoint export does not alter scene',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('textbox',{name:'Project name'}).fill('Before the Turntable');
  await page.getByRole('button',{name:'Starter Scenes'}).click();
  await page.getByRole('dialog',{name:'Starter scenes'}).getByRole('button',{name:'Create Turntable'}).click();
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Turntable Study');
  await page.getByRole('button',{name:'Scene Vault'}).click();
  const vault=page.getByRole('dialog',{name:'Scene Vault'});
  await expect(vault).toContainText('Before starter scene');
  const event=page.waitForEvent('download');
  await vault.getByRole('button',{name:'Download JSON'}).click();
  const file=await event;
  const data=JSON.parse(await (await import('node:fs/promises')).readFile(await file.path(),'utf8'));
  expect(data.name).toBe('Before the Turntable');
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Turntable Study');
  await vault.getByRole('button',{name:'Delete Before the Turntable'}).click();
  await expect(vault.getByRole('button',{name:'Confirm delete Before the Turntable'})).toBeVisible();
  await vault.getByRole('button',{name:'Confirm delete Before the Turntable'}).click();
  await expect(vault).not.toContainText('Before the Turntable');
  expect(errors).toEqual([]);
});

test('storage quota failure pauses destructive replacement and permits JSON backup or cancellation',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  const project=page.getByRole('textbox',{name:'Project name'});
  await project.fill('Keep Me Safe');
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(String(key).includes('scene-vault'))throw Error('Simulated quota');
      return original.call(this,key,value);
    };
  });
  await page.getByRole('button',{name:'New',exact:true}).click();
  const warning=page.getByRole('dialog',{name:'Project replacement warning'});
  await expect(warning).toContainText('Simulated quota');
  await expect(project).toHaveValue('Keep Me Safe');
  await warning.getByRole('button',{name:'Cancel replacement'}).click();
  await expect(project).toHaveValue('Keep Me Safe');
  await page.getByRole('button',{name:'New',exact:true}).click();
  const event=page.waitForEvent('download');
  await warning.getByRole('button',{name:'Download current JSON'}).click();
  const backup=await event;
  const json=JSON.parse(await (await import('node:fs/promises')).readFile(await backup.path(),'utf8'));
  expect(json.name).toBe('Keep Me Safe');
  await warning.getByRole('button',{name:'Replace anyway'}).click();
  await expect(project).toHaveValue('Untitled Motion');
  expect(errors).toEqual([]);
});

test('opening imported JSON creates a Scene Vault checkpoint of the preceding project',async({page})=>{
  await page.goto('http://127.0.0.1:4173/FramefieldStudio/');
  await page.getByRole('textbox',{name:'Project name'}).fill('Before Import');
  const data={version:1,name:'Imported Work',fps:24,duration:120,
    objects:[]};
  await page.locator('input[type="file"]').setInputFiles({
    name:'from-another-machine.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(data))
  });
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Imported Work');
  await page.getByRole('button',{name:'Scene Vault'}).click();
  await expect(page.getByRole('dialog',{name:'Scene Vault'})).toContainText('Before opening JSON');
  await expect(page.getByRole('dialog',{name:'Scene Vault'})).toContainText('Before Import');
});
