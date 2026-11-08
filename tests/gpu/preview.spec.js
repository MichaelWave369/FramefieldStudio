// An actual WebGL render check, not just a software fallback or DOM smoke test.
import {test,expect} from '@playwright/test';

const url='http://127.0.0.1:4173/FramefieldStudio/';
const preview=page=>page.getByTestId('gpu-preview-canvas');

test('GPU renders two distinct animation frames and restores editable software tools',
  async({page},testInfo)=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);
    await expect(page.locator('canvas[aria-label="Interactive 3D viewport"]')).toBeVisible();
    await page.getByRole('button',{name:'GPU Preview'}).click();
    await expect(preview(page)).toBeVisible();
    await expect(preview(page)).toHaveAttribute('data-rendered-frame','0');
    await expect(page.getByRole('status')).toContainText('GPU preview rendered');
    const isWebGL=await preview(page).evaluate(canvas=>{
      const gl=canvas.getContext('webgl2');
      return Boolean(gl&&!gl.isContextLost()&&canvas.width>0&&canvas.height>0);
    });
    expect(isWebGL).toBe(true);
    const first=await preview(page).screenshot();
    expect(first.length).toBeGreaterThan(2500);
    await testInfo.attach('gpu-frame-0000',{body:first,contentType:'image/png'});

    await page.locator('.time-settings label').first().locator('input').fill('60');
    await expect(preview(page)).toHaveAttribute('data-rendered-frame','60');
    const second=await preview(page).screenshot();
    await testInfo.attach('gpu-frame-0060',{body:second,contentType:'image/png'});
    expect(second.equals(first)).toBe(false); // real image output must follow the timeline

    await page.getByRole('button',{name:'GPU Preview'}).click();
    await expect(page.locator('canvas[aria-label="Interactive 3D viewport"]')).toBeVisible();
    const zoomBefore=await page.locator('.view-bottom').innerText();
    await page.locator('canvas[aria-label="Interactive 3D viewport"]').hover();
    await page.mouse.wheel(0,270);
    await expect.poll(()=>page.locator('.view-bottom').innerText()).not.toBe(zoomBefore);
    await page.getByRole('button',{name:'+ Add'}).click();
    await expect(page.getByText('3 objects')).toBeVisible();
    await page.getByRole('button',{name:/Undo/}).click();
    await expect(page.getByText('2 objects')).toBeVisible();
    expect(errors).toEqual([]);
});

test('GPU context loss returns to Canvas2D and a repeated preview can be opened',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const toggle=page.getByRole('button',{name:'GPU Preview'});
  await toggle.click();
  await expect(preview(page)).toHaveAttribute('data-rendered-frame','0');
  // Synthetic event validates UI fallback; real hardware loss needs device testing.
  await preview(page).evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.getByRole('status')).toContainText('WebGL context lost');
  await expect(page.locator('canvas[aria-label="Interactive 3D viewport"]')).toBeVisible();
  await toggle.click();
  await expect(preview(page)).toHaveAttribute('data-rendered-frame','0');
  await toggle.click();
  await expect(page.locator('canvas[aria-label="Interactive 3D viewport"]')).toBeVisible();
  expect(errors).toEqual([]);
});
