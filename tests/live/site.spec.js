import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const live=process.env.FRAMEFIELD_LIVE_URL||
  'https://michaelwave369.github.io/FramefieldStudio/';
const expected=process.env.FRAMEFIELD_EXPECTED_SHA?.trim().toLowerCase();

test('deployed revision and Pages assets are real, not stale preview output',async({request})=>{
  const response=await request.get(new URL('release-info.json',live).toString(),{
    headers:{'Cache-Control':'no-cache'}});
  expect(response.status(),'release metadata must be deployed with dist').toBe(200);
  const info=await response.json();
  expect(info.app).toBe('framefield-studio');
  expect(info.phase,'stable release must not be implied').toBe('candidate');
  expect(info.base).toBe('/FramefieldStudio/');
  expect(info.commit).toMatch(/^[a-f0-9]{40}$/);
  if(expected)expect(info.commit,'deployed site has a different commit than the audit').toBe(expected);
  const page=await request.get(live,{headers:{'Cache-Control':'no-cache'}});
  expect(page.status()).toBe(200);
  const html=await page.text();
  const assets=[...html.matchAll(/(?:src|href)="(\/FramefieldStudio\/assets\/[^"<>]+)"/g)]
    .map(match=>match[1]);
  expect(assets.some(path=>path.endsWith('.js'))).toBe(true);
  for(const asset of assets){
    const fetched=await request.get(new URL(asset,live).toString());
    expect(fetched.status(),asset).toBe(200);
  }
});

test('published studio loads with no JS errors and real creator UI',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(live,{waitUntil:'networkidle'});
  await expect(page.getByText('FRAMEFIELD',{exact:true})).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button',{name:'Scene Vault'})).toBeVisible();
  await page.screenshot({path:'test-results/live-framefield-first-open.png'});
  await page.getByRole('button',{name:'Quick Start'}).click();
  await expect(page.getByRole('dialog',{name:'Quick Start guide'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Quick Start guide'})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('published creator can export example, import it and render an actual PNG',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(live);
  await page.getByRole('button',{name:'Starter Scenes'}).click();
  const dialog=page.getByRole('dialog',{name:'Starter scenes'});
  const downloading=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Download Bouncing Ball JSON'}).click();
  const sample=await downloading;
  const bytes=await readFile(await sample.path());
  const source=JSON.parse(bytes.toString('utf8'));
  expect(source.name).toBe('Bouncing Ball');
  await dialog.getByRole('button',{name:'Close starter scenes'}).click();
  // Select the JSON project picker explicitly; the studio also has a GLB picker.
  const projectPicker=page.getByLabel('Choose a Framefield JSON project');
  await expect(projectPicker).toHaveCount(1);
  await projectPicker.setInputFiles({
    name:sample.suggestedFilename(),mimeType:'application/json',buffer:bytes});
  await expect(page.getByRole('textbox',{name:'Project name'})).toHaveValue('Bouncing Ball');
  const pngDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Render PNG'}).click();
  const png=await pngDownload;
  const image=await readFile(await png.path());
  expect([...image.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  expect(image.readUInt32BE(16)).toBe(960);
  expect(image.readUInt32BE(20)).toBe(540);
  expect(errors).toEqual([]);
});

test('published Scene Vault safeguards edits across replacement and restore',async({page})=>{
  await page.goto(live);
  const name=page.getByRole('textbox',{name:'Project name'});
  await name.fill('Release Acceptance Sketch');
  await page.getByRole('button',{name:'New',exact:true}).click();
  await expect(name).toHaveValue('Untitled Motion');
  await page.getByRole('button',{name:'Scene Vault'}).click();
  const vault=page.getByRole('dialog',{name:'Scene Vault'});
  await expect(vault).toContainText('Release Acceptance Sketch');
  await vault.getByRole('button',{name:'Restore',exact:true}).click();
  await expect(name).toHaveValue('Release Acceptance Sketch');
  await page.reload();
  const recovery=page.getByRole('dialog',{name:'Restore local autosave'});
  if(await recovery.isVisible())await recovery.getByRole('button',{name:'Discard local draft'}).click();
  await expect(page.getByText('FRAMEFIELD',{exact:true})).toBeVisible();
});
