import {test,expect} from '@playwright/test';
import {makeCharacterGlb} from '../fixtures/characterGlb.js';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

const url='http://127.0.0.1:4173/FramefieldStudio/';

test('character animation can be sampled exactly at 24/30fps and exported as PNG',
  async({page},testInfo)=>{
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.goto(url);
    await page.getByRole('button',{name:'Character Lab'}).click();
    const lab=page.getByRole('dialog',{name:'Character Asset Lab'});
    await lab.getByLabel('Choose character GLB for preview').setInputFiles({
      name:'pose-test.glb',mimeType:'model/gltf-binary',buffer:makeCharacterGlb()
    });
    const scrub=lab.getByRole('slider',{name:'Character frame scrubber'});
    await expect(scrub).toBeVisible();
    await expect(scrub).toHaveAttribute('max','24');
    const canvas=lab.getByTestId('character-lab-canvas');
    // Sampling is paused, so screenshots are not subject to animation timing.
    const setScrub=async value=>scrub.evaluate((input,next)=>{
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      setter.call(input,String(next));
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    },value);
    await setScrub(0);
    await page.waitForTimeout(75);
    const start=await canvas.screenshot();
    await setScrub(12);
    await expect(scrub).toHaveValue('12');
    await expect(lab).toContainText('0.500 s');
    await page.waitForTimeout(75);
    const middle=await canvas.screenshot();
    expect(start.equals(middle)).toBe(false);
    await mkdir('gpu-evidence',{recursive:true});
    await writeFile('gpu-evidence/character-pose-24fps-frame12.png',middle);
    await testInfo.attach('24fps-frame12',{body:middle,contentType:'image/png'});

    await lab.getByRole('combobox',{name:'Character preview frame rate'}).selectOption('30');
    await expect(scrub).toHaveAttribute('max','30');
    await expect(scrub).toHaveValue('15');
    await lab.getByRole('button',{name:'Last frame'}).click();
    await expect(scrub).toHaveValue('30');
    await lab.getByRole('button',{name:'Previous frame'}).click();
    await expect(scrub).toHaveValue('29');
    await expect(lab.getByRole('button',{name:'Play character animation'})).toBeVisible();

    const dl=page.waitForEvent('download');
    await lab.getByRole('button',{name:'Export pose PNG'}).click();
    const png=await dl;
    const bytes=await readFile(await png.path());
    expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect(bytes.length).toBeGreaterThan(2000);
    expect(png.suggestedFilename()).toMatch(/-f00029-30fps\.png$/);
    await expect(lab.getByRole('status')).toContainText('Local PNG pose saved');
    await lab.getByRole('button',{name:'Close lab · return to editor'}).click();
    await expect(page.locator('canvas[aria-label="Interactive 3D viewport"]')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
