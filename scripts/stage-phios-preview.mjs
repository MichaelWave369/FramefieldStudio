// Stage an existing production build; never install, serve, publish or grant authority.
// Uses PhiOS's existing phios.app_manifest.v0.1, not a replacement app registry.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,lstat,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyReleaseInfo,assetReferences} from './release-metadata.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const digest=data=>createHash('sha256').update(data).digest('hex');
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const within=(parent,child)=>{const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
const exists=async p=>{try{return await lstat(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const demand=(ok,message)=>{if(!ok)throw Error('PhiOS preview: '+message);};

async function stage(output){
  const dest=path.resolve(output);
  demand(!within(root,dest)&&!within(dest,root),'output must be separate from the source checkout');
  demand(!(await exists(dest)),'output already exists');
  for(let p=path.dirname(dest);;p=path.dirname(p)){
    demand(!(await exists(p))?.isSymbolicLink(),'output parent is a symlink');
    if(p===path.dirname(p))break;
  }
  const commit=git('rev-parse','HEAD');
  demand(/^[a-f0-9]{40}$/.test(commit),'invalid source commit');
  demand(!git('status','--porcelain','--untracked-files=normal'),'commit source changes before staging');
  const [manifestBytes,metadataBytes,license,html]=await Promise.all([
    readFile(path.join(root,'phios.app.json')),readFile(path.join(root,'dist/release-info.json')),
    readFile(path.join(root,'LICENSE')),readFile(path.join(root,'dist/index.html'),'utf8')
  ]);
  const manifest=JSON.parse(manifestBytes),metadata=verifyReleaseInfo(JSON.parse(metadataBytes));
  demand(metadata.commit===commit,'build/source commit mismatch; rebuild this clean commit');
  demand(manifest.schema_version==='phios.app_manifest.v0.1'&&
    manifest.app_id==='phios.framefield-studio'&&manifest.version===metadata.version&&
    manifest.entrypoint.runtime==='static_web'&&
    manifest.entrypoint.target==='FramefieldStudio/index.html'&&
    Array.isArray(manifest.permissions)&&manifest.permissions.length===0&&
    manifest.source.redistribution==='unknown','manifest identity or authority drift');
  demand(license.toString('utf8').startsWith('MIT License'),'missing project license');
  const refs=assetReferences(html);
  const files=[];let total=0;
  async function collect(dir,rel=''){
    const st=await lstat(dir);
    demand(st.isDirectory()&&!st.isSymbolicLink(),'build root must be a regular directory');
    for(const entry of await readdir(dir)){
      const src=path.join(dir,entry),relative=path.posix.join(rel,entry),s=await lstat(src);
      demand(!s.isSymbolicLink(),'build contains a symlink');
      if(s.isDirectory())await collect(src,relative);
      else{
        demand(s.isFile()&&s.nlink===1,'build contains a nonregular or hardlinked file');
        total+=s.size;files.push({src,path:'FramefieldStudio/'+relative});
        demand(total<=64*1024*1024&&files.length<=2048,'static build exceeds staging budget');
      }
    }
  }
  await collect(path.join(root,'dist'));
  for(const ref of refs)demand(files.some(f=>f.path===decodeURIComponent(ref.slice(1))),'missing compiled entry asset');
  // Exclusive creation means an interrupted or existing output is never overwritten.
  await mkdir(path.dirname(dest),{recursive:true});
  await mkdir(dest);
  try{
    for(const f of files){
      const target=path.join(dest,...f.path.split('/'));
      await mkdir(path.dirname(target),{recursive:true});await copyFile(f.src,target);
    }
    await writeFile(path.join(dest,'phios.app.json'),manifestBytes);
    await writeFile(path.join(dest,'LICENSE'),license);
    const all=[...files.map(f=>f.path),'LICENSE','phios.app.json'].sort();
    const entries=[];
    for(const name of all){
      const bytes=await readFile(path.join(dest,...name.split('/')));
      entries.push({path:name,byte_count:bytes.length,sha256:digest(bytes)});
    }
    // Reuse PhiOS PackageArtifact canonical lines for the artifact-set digest.
    const artifactSet=digest(entries.map(f=>f.path+'\0'+f.byte_count+'\0'+f.sha256+'\n').join(''));
    const receipt={schema:'framefield.phios-preview.v1',source_commit:commit,
      source_repository:manifest.source.repository_url,manifest_file:'phios.app.json',
      manifest_file_sha256:digest(manifestBytes),artifact_set_sha256:artifactSet,files:entries,
      readiness:'STAGED_UNQUALIFIED',runtime:'static_web',launch_path:'/FramefieldStudio/',
      dependencies:{server:'Static HTTP server bound to loopback',browser:'Modern desktop browser'},
      rollback:'Stop the preview server; delete this staging directory.',
      uninstall:'No PhiOS installation exists; browser-local drafts require separate user-controlled cleanup.',
      acceptance_receipts:[],signature_present:false,redistribution_reviewed:false,
      installed_in_phios:false,launch_authority:false,release_authority:false};
    await writeFile(path.join(dest,'preview-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
    await writeFile(path.join(dest,'START_HERE.txt'),
      'Framefield Studio local preview\n\nFrom this directory, run:\n'+
      'python -m http.server 8787 --bind 127.0.0.1\n\n'+
      'Open http://127.0.0.1:8787/FramefieldStudio/\n'+
      'Stop with Ctrl+C. Do not expose this server to the internet.\n'+
      'This is an unsigned browser preview, not an installed PhiOS application.\n');
    return receipt;
  }catch(e){await rm(dest,{recursive:true,force:true});throw e;}
}

try{
  demand(process.argv.length===3,'usage: node scripts/stage-phios-preview.mjs /absolute/output-directory');
  const receipt=await stage(process.argv[2]);
  console.log(JSON.stringify({status:receipt.readiness,source_commit:receipt.source_commit,
    artifact_set_sha256:receipt.artifact_set_sha256,files:receipt.files.length,
    installed_in_phios:false,launch_authority:false},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
