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
  await page.getByRole('button',{name:'+ Add'}).click();
  await expect(page.getByText('3 objects')).toBeVisible();
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByText('2 objects')).toBeVisible();
  await page.getByRole('button',{name:/Redo/}).click();
  await expect(page.getByText('3 objects')).toBeVisible();
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
