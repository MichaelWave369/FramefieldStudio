// Character Lab must remain local-first even when WebGL is unavailable.
import {test,expect} from '@playwright/test';
import {makeCharacterGlb} from '../fixtures/characterGlb.js';
import {readFile} from 'node:fs/promises';
const url='http://127.0.0.1:4173/FramefieldStudio/';

test('Character Lab rejects external textures and leaves existing project untouched',async({page})=>{
  const pageErrors=[];
  const outsideRequests=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('request',request=>{
    if(request.url().includes('example.invalid'))outsideRequests.push(request.url());
  });
  await page.goto(url);
  await page.getByRole('button',{name:'Character Lab'}).click();
  const lab=page.getByRole('dialog',{name:'Character Asset Lab'});
  await expect(lab).toBeVisible();
  await lab.getByLabel('Choose character GLB for preview').setInputFiles({
    name:'external-texture.glb',mimeType:'model/gltf-binary',
    buffer:makeCharacterGlb({externalImage:true})
  });
  await expect(lab.getByRole('alert')).toContainText('never external URIs');
  expect(outsideRequests).toEqual([]);
  await lab.getByRole('button',{name:'Close lab · return to editor'}).click();
  await expect(lab).toHaveCount(0);
  await expect(page.getByText('2 objects')).toBeVisible();
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const file=await downloadEvent;
  const scene=JSON.parse(await readFile(await file.path(),'utf8'));
  expect(scene.version).toBe(1);
  expect(scene.objects).toHaveLength(2);
  expect(pageErrors).toEqual([]);
});
