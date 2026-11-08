// GPU acceptance: expression cues interpolate across source GLB frames and
// dialogue markers roundtrip without changing the editable Framefield project.
import {test,expect} from '@playwright/test';
import {makeCharacterGlb} from '../fixtures/characterGlb.js';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const url='http://127.0.0.1:4173/FramefieldStudio/';
const setRange=async(slider,value)=>slider.evaluate((input,next)=>{
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  setter.call(input,String(next));
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
},value);

test('facial acting keys interpolate and source-locked dialogue sheet roundtrips',async({page},testInfo)=>{
  const errors=[],outside=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{
    if(request.url().includes('example.invalid'))outside.push(request.url());
  });
  await page.goto(url);
  await page.getByRole('button',{name:'Character Lab'}).click();
  const lab=page.getByRole('dialog',{name:'Character Asset Lab'});
  await lab.getByLabel('Choose character GLB for preview').setInputFiles({
    name:'original-acting-test.glb',mimeType:'model/gltf-binary',
    buffer:makeCharacterGlb({morph:true})
  });
  const slider=lab.getByRole('slider',{name:'Character frame scrubber'});
  const smile=lab.getByRole('slider',{name:'Expression Smile'});
  const canvas=lab.getByTestId('character-lab-canvas');
  await expect(smile).toBeVisible();
  await setRange(slider,0);
  await setRange(smile,0);
  await lab.getByRole('button',{name:'Save expression keyframe'}).click();
  await expect(lab.getByRole('button',{name:'Jump to expression key 0'})).toBeVisible();

  await setRange(slider,12);
  await setRange(smile,1);
  await lab.getByRole('button',{name:'Save expression keyframe'}).click();
  await expect(lab.getByRole('button',{name:'Jump to expression key 500'})).toBeVisible();
  await expect(smile).toHaveValue('1');
  await page.waitForTimeout(60);
  const full=await canvas.screenshot();

  await setRange(slider,6);
  await expect(slider).toHaveValue('6');
  await expect(smile).toHaveValue('0.5');
  await page.waitForTimeout(70);
  const half=await canvas.screenshot();
  expect(half.equals(full)).toBe(false);
  await mkdir('gpu-evidence',{recursive:true});
  await writeFile('gpu-evidence/character-acting-interpolated.png',half);
  await testInfo.attach('character-acting-half-smile',{body:half,contentType:'image/png'});

  await lab.getByRole('textbox',{name:'Dialogue line'}).fill('Hello there!');
  await lab.getByRole('button',{name:'Add dialogue marker'}).click();
  await expect(lab.getByText('0.250 s · Hello there!')).toBeVisible();

  const downloadEvent=page.waitForEvent('download');
  await lab.getByRole('button',{name:'Export acting sheet JSON'}).click();
  const download=await downloadEvent;
  const json=await readFile(await download.path(),'utf8');
  const sheet=JSON.parse(json);
  expect(sheet.format).toBe('framefield-character-acting-sheet');
  expect(sheet.version).toBe(1);
  expect(sheet.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(sheet.keys).toHaveLength(2);
  expect(sheet.dialogue).toEqual([{clipIndex:0,timeMs:250,text:'Hello there!'}]);
  expect(sheet.keys[1].morphs['0:0']).toBe(1);

  await lab.getByRole('button',{name:'Delete expression key 500'}).click();
  await expect(lab.getByRole('button',{name:'Jump to expression key 500'})).toHaveCount(0);
  await lab.getByLabel('Load acting sheet JSON').setInputFiles({
    name:'acting.json',mimeType:'application/json',buffer:Buffer.from(json)
  });
  await expect(lab.getByRole('button',{name:'Jump to expression key 500'})).toBeVisible();
  await lab.getByLabel('Load acting sheet JSON').setInputFiles({
    name:'other-character.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({...sheet,sourceSha256:'d'.repeat(64)}))
  });
  await expect(lab.getByRole('alert')).toContainText('another GLB');
  await expect(lab.getByRole('button',{name:'Jump to expression key 500'})).toBeVisible();
  expect(outside).toEqual([]);

  await lab.getByRole('button',{name:'Close lab · return to editor'}).click();
  await expect(page.getByText('2 objects')).toBeVisible();
  const save=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const project=JSON.parse(await readFile(await (await save).path(),'utf8'));
  expect(project.version).toBe(1);
  expect(project.objects).toHaveLength(2);
  expect(errors).toEqual([]);
});
