// No WebGL hardware required: missing-context recovery must preserve the editor.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const url='http://127.0.0.1:4173/FramefieldStudio/';

test('GPU disabled by the browser returns to Canvas2D without project data loss',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...args){
      if(['webgl','webgl2','experimental-webgl'].includes(kind))return null;
      return original.call(this,kind,...args);
    };
  });
  await page.goto(url);
  await expect(page.getByRole('button',{name:'GPU Preview'})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'GPU Preview'}).click();
  await expect(page.getByRole('status')).toContainText('GPU preview unavailable');
  await expect(page.getByRole('button',{name:'GPU Preview'})).toHaveAttribute('aria-pressed','false');
  const editor=page.getByRole('img',{name:'Not an expected label'});
  // The real editor canvas must be restored and still draw opaque pixels.
  const canvas=page.locator('canvas[aria-label="Interactive 3D viewport"]');
  await expect(canvas).toBeVisible();
  const alpha=await canvas.evaluate(c=>c.getContext('2d').getImageData(
    Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3]);
  expect(alpha).toBe(255);

  // The wheel listener is rebound to the newly mounted Canvas2D node.
  const before=await page.locator('.view-bottom').innerText();
  await canvas.hover();
  await page.mouse.wheel(0,310);
  await expect.poll(()=>page.locator('.view-bottom').innerText()).not.toBe(before);

  await page.getByRole('button',{name:'+ Add'}).click();
  await expect(page.getByText('3 objects')).toBeVisible();
  const saved=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save JSON'}).click();
  const json=JSON.parse(await readFile(await (await saved).path(),'utf8'));
  expect(json.objects).toHaveLength(3);
  expect(json.version).toBe(1);
  expect(errors).toEqual([]);
});
