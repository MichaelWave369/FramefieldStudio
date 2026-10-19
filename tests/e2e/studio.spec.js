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
  await expect(page.getByText('DOPE SHEET')).toBeVisible();
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
