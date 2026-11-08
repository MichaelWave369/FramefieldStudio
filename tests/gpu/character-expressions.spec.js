// Real Chromium WebGL acceptance: authored facial morphs and reusable pose cards.
import {test,expect} from '@playwright/test';
import {makeCharacterGlb} from '../fixtures/characterGlb.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

const url='http://127.0.0.1:4173/FramefieldStudio/';
const setRange=async(slider,value)=>slider.evaluate((input,next)=>{
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  setter.call(input,String(next));
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
},value);

test('original Smile morph changes actual pixels and is restored by a named pose',async({page},testInfo)=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.getByRole('button',{name:'Character Lab'}).click();
  const lab=page.getByRole('dialog',{name:'Character Asset Lab'});
  await lab.getByLabel('Choose character GLB for preview').setInputFiles({
    name:'original-morph.glb',mimeType:'model/gltf-binary',
    buffer:makeCharacterGlb({morph:true})
  });
  const morph=lab.getByRole('slider',{name:'Expression Smile'});
  await expect(morph).toBeVisible();
  const canvas=lab.getByTestId('character-lab-canvas');
  await page.waitForTimeout(100);
  const neutral=await canvas.screenshot();
  await setRange(morph,1);
  await expect(morph).toHaveValue('1');
  await page.waitForTimeout(100);
  const smile=await canvas.screenshot();
  expect(smile.equals(neutral)).toBe(false);
  await mkdir('gpu-evidence',{recursive:true});
  await writeFile('gpu-evidence/character-morph-smile.png',smile);
  await testInfo.attach('character-morph-smile',{body:smile,contentType:'image/png'});

  await lab.getByRole('textbox',{name:'Pose name'}).fill('Friendly Smile');
  await lab.getByRole('button',{name:'Save named pose'}).click();
  await expect(lab.getByRole('button',{name:'Recall pose Friendly Smile'})).toBeVisible();
  const download=page.waitForEvent('download');
  await lab.getByRole('button',{name:'Download pose pack JSON'}).click();
  const file=await download;
  const exported=await readFile(await file.path(),'utf8');
  const pack=JSON.parse(exported);
  expect(pack.version).toBe(1);
  expect(pack.format).toBe('framefield-character-pose-pack');
  expect(pack.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(pack.poses[0].morphs['0:0']).toBe(1);

  await lab.getByRole('button',{name:'Reset expressions'}).click();
  await expect(morph).toHaveValue('0');
  await lab.getByRole('button',{name:'Recall pose Friendly Smile'}).click();
  await expect(morph).toHaveValue('1');
  const restored=await canvas.screenshot();
  expect(restored.equals(smile)).toBe(true);

  // Reload a pose pack from JSON, then confirm the original editable editor
  // and its project data remain independent of this local acting session.
  await lab.getByRole('button',{name:'Delete pose Friendly Smile'}).click();
  await lab.getByLabel('Load pose pack JSON').setInputFiles({
    name:'my-poses.json',mimeType:'application/json',buffer:Buffer.from(exported)
  });
  await expect(lab.getByRole('button',{name:'Recall pose Friendly Smile'})).toBeVisible();
  await lab.getByRole('button',{name:'Close lab · return to editor'}).click();
  await expect(page.getByText('2 objects')).toBeVisible();
  const save=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const saved=JSON.parse(await readFile(await (await save).path(),'utf8'));
  expect(saved.version).toBe(1);
  expect(saved.objects).toHaveLength(2);
  expect(errors).toEqual([]);
});
