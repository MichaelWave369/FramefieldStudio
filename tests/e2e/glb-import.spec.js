import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const url='http://127.0.0.1:4173/FramefieldStudio/';

function triangleGlb(){
  const positions=Buffer.alloc(9*4);
  [0,0,0,1,0,0,0,1,0].forEach((v,i)=>positions.writeFloatLE(v,i*4));
  const doc={
    asset:{version:'2.0'},
    buffers:[{byteLength:positions.length}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:positions.length}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],
    meshes:[{primitives:[{attributes:{POSITION:0}}]}]
  };
  const text=Buffer.from(JSON.stringify(doc));
  const json=Buffer.alloc(Math.ceil(text.length/4)*4,32);
  text.copy(json);
  const bytes=Buffer.alloc(12+8+json.length+8+positions.length);
  bytes.writeUInt32LE(0x46546c67,0);
  bytes.writeUInt32LE(2,4);
  bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(json.length,12);
  bytes.writeUInt32LE(0x4e4f534a,16);
  json.copy(bytes,20);
  const binStart=20+json.length;
  bytes.writeUInt32LE(positions.length,binStart);
  bytes.writeUInt32LE(0x004e4942,binStart+4);
  positions.copy(bytes,binStart+8);
  return bytes;
}

test('GLB import reviews original bytes, cancels safely, adds undoably and persists source digest',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const bytes=triangleGlb();
  const digest=createHash('sha256').update(bytes).digest('hex');
  const choose=()=>page.getByLabel('Choose a local GLB mesh').setInputFiles({
    name:'review-triangle.glb',mimeType:'model/gltf-binary',buffer:bytes
  });
  await choose();
  const dialog=page.getByRole('dialog',{name:'Review local GLB mesh import'});
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(digest);
  await expect(dialog).toContainText('3 vertices');
  await dialog.getByRole('button',{name:/Cancel/}).click();
  await expect(page.getByText('2 objects')).toBeVisible();

  await choose();
  await page.getByRole('dialog',{name:'Review local GLB mesh import'})
    .getByRole('button',{name:'Add mesh to scene'}).click();
  await expect(page.getByText('3 objects')).toBeVisible();
  await expect(page.getByRole('option',{name:/review-triangle/})).toBeVisible();

  const save=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const exported=await save;
  const project=JSON.parse(await readFile(await exported.path(),'utf8'));
  const imported=project.objects.find(o=>o.name==='review-triangle');
  expect(imported.geometry.faces).toEqual([[0,1,2]]);
  expect(imported.glbSource.sha256).toBe(digest);

  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByText('2 objects')).toBeVisible();
  await page.getByRole('button',{name:/Redo/}).click();
  await expect(page.getByText('3 objects')).toBeVisible();
  expect(errors).toEqual([]);
});

test('bad GLB is rejected with current scene intact',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.getByLabel('Choose a local GLB mesh').setInputFiles({
    name:'corrupt.glb',mimeType:'model/gltf-binary',buffer:Buffer.alloc(32)
  });
  await expect(page.getByRole('status')).toContainText('GLB import rejected');
  await expect(page.getByRole('dialog',{name:'Review local GLB mesh import'})).toHaveCount(0);
  await expect(page.getByText('2 objects')).toBeVisible();
  expect(errors).toEqual([]);
});
