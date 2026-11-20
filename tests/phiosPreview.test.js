import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildReleaseInfo} from '../scripts/release-metadata.mjs';

async function fixture(run){
  const dir=await mkdtemp(path.join(tmpdir(),'framefield-phios-'));
  const repo=path.join(dir,'source'),out=path.join(dir,'preview');
  const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
  try{
    await mkdir(path.join(repo,'scripts'),{recursive:true});
    for(const name of ['stage-phios-preview.mjs','release-metadata.mjs'])
      await copyFile(new URL('../scripts/'+name,import.meta.url),path.join(repo,'scripts',name));
    await copyFile(new URL('../phios.app.json',import.meta.url),path.join(repo,'phios.app.json'));
    await copyFile(new URL('../LICENSE',import.meta.url),path.join(repo,'LICENSE'));
    await writeFile(path.join(repo,'.gitignore'),'dist/\n');
    git('init','-q');git('add','.');
    git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
    const commit=git('rev-parse','HEAD');
    await mkdir(path.join(repo,'dist/assets'),{recursive:true});
    await writeFile(path.join(repo,'dist/index.html'),
      '<script type="module" src="/FramefieldStudio/assets/test.js"></script>');
    await writeFile(path.join(repo,'dist/assets/test.js'),'console.log("synthetic fixture");');
    await writeFile(path.join(repo,'dist/release-info.json'),JSON.stringify(
      buildReleaseInfo('0.1.0',commit,'2026-11-20T20:00:00.000Z')));
    const stage=()=>spawnSync(process.execPath,[path.join(repo,'scripts/stage-phios-preview.mjs'),out],
      {encoding:'utf8'});
    await run({repo,out,commit,stage,git});
  }finally{await rm(dir,{recursive:true,force:true});}
}

test('stages exact compiled bytes and a zero-authority PhiOS preview receipt',async()=>{
  await fixture(async({out,commit,stage})=>{
    const result=stage();assert.equal(result.status,0,result.stderr);
    const receipt=JSON.parse(await readFile(path.join(out,'preview-receipt.json'),'utf8'));
    assert.equal(receipt.source_commit,commit);
    assert.equal(receipt.readiness,'STAGED_UNQUALIFIED');
    assert.equal(receipt.installed_in_phios,false);
    assert.equal(receipt.launch_authority,false);
    assert.deepEqual(receipt.acceptance_receipts,[]);
    assert.ok(receipt.files.some(f=>f.path==='FramefieldStudio/index.html'));
    assert.equal(await readFile(path.join(out,'FramefieldStudio/assets/test.js'),'utf8'),
      'console.log("synthetic fixture");');
    const second=stage();assert.notEqual(second.status,0);
    assert.match(second.stderr,/output already exists/);
  });
});
test('refuses changed source and a build stamped with a different commit',async()=>{
  await fixture(async({repo,stage})=>{
    await writeFile(path.join(repo,'uncommitted.txt'),'not source qualified');
    assert.match(stage().stderr,/commit source changes/);
    await rm(path.join(repo,'uncommitted.txt'));
    await writeFile(path.join(repo,'dist/release-info.json'),JSON.stringify(
      buildReleaseInfo('0.1.0','a'.repeat(40),'2026-11-20T20:00:00.000Z')));
    assert.match(stage().stderr,/build\/source commit mismatch/);
  });
});
test('refuses linked build assets before creating output',async()=>{
  await fixture(async({repo,stage})=>{
    await symlink(path.join(repo,'LICENSE'),path.join(repo,'dist/assets/linked.txt'));
    const result=stage();assert.notEqual(result.status,0);
    assert.match(result.stderr,/build contains a symlink/);
  });
});
