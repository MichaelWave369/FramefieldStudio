// Browser-agnostic production-preview acceptance on Firefox and WebKit.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const url='http://127.0.0.1:4173/FramefieldStudio/';

test('desktop app loads, paints a nonempty viewport, and navigates Quick Start',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button',{name:'Quick Start'})).toBeVisible();
  const initial=await page.locator('canvas').evaluate(canvas=>{
    const ctx=canvas.getContext('2d');
    if(!ctx)return null;
    const sample=ctx.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data;
    return [...sample];
  });
  expect(initial).not.toBeNull();
  expect(initial[3]).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Quick Start'}).click();
  const modal=page.getByRole('dialog',{name:'Quick Start guide'});
  await expect(modal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Scene Vault checkpoints survive project replacement and can restore edits',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const field=page.getByRole('textbox',{name:'Project name'});
  await field.fill('Compatibility Sketch');
  await page.getByRole('button',{name:'New',exact:true}).click();
  await expect(field).toHaveValue('Untitled Motion');
  await page.getByRole('button',{name:'Scene Vault'}).click();
  const vault=page.getByRole('dialog',{name:'Scene Vault'});
  await expect(vault).toContainText('Compatibility Sketch');
  await vault.getByRole('button',{name:'Restore',exact:true}).click();
  await expect(field).toHaveValue('Compatibility Sketch');
  expect(errors).toEqual([]);
});

test('starter project JSON can be downloaded, reimported, and rendered as PNG',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button',{name:'Starter Scenes'}).click();
  const gallery=page.getByRole('dialog',{name:'Starter scenes'});
  const fileEvent=page.waitForEvent('download');
  await gallery.getByRole('button',{name:'Download Turntable JSON'}).click();
  const sample=await fileEvent;
  const data=await readFile(await sample.path());
  expect(JSON.parse(data.toString()).name).toBe('Turntable Study');
  await gallery.getByRole('button',{name:'Close starter scenes'}).click();
  await page.getByLabel('Choose a Framefield JSON project').setInputFiles({
    name:sample.suggestedFilename(),mimeType:'application/json',buffer:data});
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Turntable Study');
  const pngEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Render PNG'}).click();
  const png=await pngEvent;
  const bytes=await readFile(await png.path());
  expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  expect(bytes.readUInt32BE(16)).toBe(960);
  expect(bytes.readUInt32BE(20)).toBe(540);
  expect(errors).toEqual([]);
});

test('mesh editing and subdivision preview work in non-Chromium engines',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const preview=page.getByTestId('modifier-mesh-counts');
  await expect(preview).toContainText('Source: 8V / 6F');
  await page.getByRole('button',{name:'+ Subdivision'}).click();
  await expect(preview).toContainText('Preview: 26V / 24F');
  await page.getByRole('button',{name:'Convert to Editable Mesh'}).click();
  await expect(page.getByText('8 vertices',{exact:true})).toBeVisible();
  await page.getByRole('group',{name:'Mesh selection mode'})
    .getByRole('button',{name:'Face'}).click();
  await page.getByRole('button',{name:'Extrude Face'}).click();
  await expect(page.getByText('12 vertices',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Undo/}).click();
  await expect(page.getByText('8 vertices',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
