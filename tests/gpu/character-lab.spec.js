// GPU acceptance for one original local textured, skinned and animated GLB.
import {test,expect} from '@playwright/test';
import {makeCharacterGlb} from '../fixtures/characterGlb.js';
import {mkdir,writeFile} from 'node:fs/promises';

const url='http://127.0.0.1:4173/FramefieldStudio/';
test('Character Asset Lab previews a textured skinned GLB and plays its animation',
  async({page},testInfo)=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);
    await page.getByRole('button',{name:'Character Lab'}).click();
    const lab=page.getByRole('dialog',{name:'Character Asset Lab'});
    await lab.getByLabel('Choose character GLB for preview').setInputFiles({
      name:'local-skinned-cartoon-test.glb',mimeType:'model/gltf-binary',
      buffer:makeCharacterGlb()
    });
    await expect(lab).toContainText('1 skins · 1 animation clips');
    await expect(lab).toContainText('1 bone nodes');
    await expect(lab.getByRole('combobox',{name:'Character animation clip'})).toBeVisible();
    await expect(lab.getByRole('button',{name:'Play character animation'})).toBeVisible();
    await expect(lab.getByRole('alert')).toHaveCount(0);
    const canvas=lab.getByTestId('character-lab-canvas');
    await expect(canvas).toBeVisible();
    const data=await canvas.evaluate(c=>({width:c.width,height:c.height,
      hasGL:Boolean(c.getContext('webgl2'))}));
    expect(data.width).toBeGreaterThan(100);
    expect(data.height).toBeGreaterThan(100);
    expect(data.hasGL).toBe(true);
    const first=await canvas.screenshot();
    await mkdir('gpu-evidence',{recursive:true});
    await writeFile('gpu-evidence/character-lab-idle.png',first);
    await testInfo.attach('character-lab-idle',{body:first,contentType:'image/png'});
    await lab.getByRole('button',{name:'Play character animation'}).click();
    await expect(lab.getByRole('button',{name:'Pause character animation'})).toBeVisible();
    await page.waitForTimeout(400);
    const second=await canvas.screenshot();
    await writeFile('gpu-evidence/character-lab-animated.png',second);
    await testInfo.attach('character-lab-animated',{body:second,contentType:'image/png'});
    expect(second.equals(first)).toBe(false);
    await lab.getByRole('button',{name:'Close lab · return to editor'}).click();
    await expect(page.locator('canvas[aria-label="Interactive 3D viewport"]')).toBeVisible();
    await expect(page.getByText('2 objects')).toBeVisible();
    expect(errors).toEqual([]);
  });
