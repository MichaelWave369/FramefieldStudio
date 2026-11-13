import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createWebmHandoff,MAX_WEBM_BYTES,WEBM_HANDOFF_SCHEMA} from '../src/webmHandoff.js';
const bytes=new Uint8Array([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0x86,0x81,
  0x01,0x42,0xf7,0x81,0x01,0x42,0xf2,0x81,0x04]);
const project={name:'Turntable',fps:24,duration:48,objects:[
  {glbSource:{sha256:'a'.repeat(64)}},{glbSource:{sha256:'a'.repeat(64)}},
  {glbSource:{sha256:'not-a-hash'}},
]};
test('records exact WebM identity and bounded unsigned provenance',async()=>{
  const blob=new Blob([bytes],{type:'video/webm'});
  const result=await createWebmHandoff(blob,{fileName:'turntable.webm',project},webcrypto);
  const expected=Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes)).toString('hex');
  assert.equal(result.schema,WEBM_HANDOFF_SCHEMA);
  assert.deepEqual(result.media,{fileName:'turntable.webm',byteLength:blob.size,
    sha256:expected,container:'webm'});
  assert.deepEqual(result.project.originalGlbSha256,['a'.repeat(64)]);
  assert.equal(result.authority.publicReleaseAuthorized,false);
  assert.equal(result.authority.sourceRightsVerified,false);
  assert.equal(result.authority.originAuthenticated,false);
});
test('denies non-WebM and modified source evidence',async()=>{
  const f={fileName:'turntable.webm',project};
  await assert.rejects(createWebmHandoff(new Blob([new Uint8Array(16)]),f,webcrypto),/WebM\/EBML/);
  const original=await createWebmHandoff(new Blob([bytes]),f,webcrypto);
  const changed=bytes.slice();changed[15]^=1;
  const modified=await createWebmHandoff(new Blob([changed]),f,webcrypto);
  assert.notEqual(original.media.sha256,modified.media.sha256);
});
test('rejects oversize, invalid filenames, malformed metadata and unavailable crypto',async()=>{
  const b=new Blob([bytes]);
  await assert.rejects(createWebmHandoff(b,{fileName:'../bad.webm',project},webcrypto),/filename/);
  await assert.rejects(createWebmHandoff(b,{fileName:'turntable.webm',
    project:{...project,fps:0}},webcrypto),/metadata/);
  await assert.rejects(createWebmHandoff(b,{fileName:'turntable.webm',project},{}),/WebCrypto/);
  const huge={size:MAX_WEBM_BYTES+1,slice:()=>b,arrayBuffer:()=>b.arrayBuffer()};
  await assert.rejects(createWebmHandoff(huge,{fileName:'turntable.webm',project},webcrypto),/256 MiB/);
});
