// Framefield -> ParaCut v1: unsigned, local, exact-byte WebM handoff.
// Never treat a hash match or project metadata as proof of source rights or release approval.
export const WEBM_HANDOFF_SCHEMA='framefield.webm-handoff/v1';
export const MAX_WEBM_BYTES=256*1024*1024;
const SHA=/^[0-9a-f]{64}$/;
const EBML=[0x1a,0x45,0xdf,0xa3];
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

export async function createWebmHandoff(blob,{fileName,project},cryptoImpl=globalThis.crypto){
  if(!blob||typeof blob.arrayBuffer!=='function'||typeof blob.slice!=='function'||
     !Number.isSafeInteger(blob.size)||blob.size<16||blob.size>MAX_WEBM_BYTES)
    throw Error('Recorded WebM must be 16 bytes to 256 MiB.');
  if(typeof fileName!=='string'||fileName.length>180||
     !/^[a-z0-9][a-z0-9._-]*\.webm$/.test(fileName))
    throw Error('Provide a safe local .webm filename.');
  if(!cryptoImpl?.subtle?.digest)
    throw Error('Secure WebCrypto SHA-256 is required to export verified media.');
  const header=new Uint8Array(await blob.slice(0,4).arrayBuffer());
  if(!EBML.every((value,index)=>header[index]===value))
    throw Error('Recorder bytes are not a WebM/EBML container. Refusing mislabeled output.');
  if(!project||typeof project.name!=='string'||project.name.length>120||
     !Number.isInteger(project.fps)||project.fps<1||project.fps>120||
     !Number.isInteger(project.duration)||project.duration<1||project.duration>600)
    throw Error('Project metadata must be bounded and valid.');
  const importedGlbHashes=[...new Set((Array.isArray(project.objects)?project.objects:[])
    .map(obj=>obj?.glbSource?.sha256)
    .filter(sha=>typeof sha==='string'&&SHA.test(sha)))].slice(0,100);
  const digest=await cryptoImpl.subtle.digest('SHA-256',await blob.arrayBuffer());
  return {
    schema:WEBM_HANDOFF_SCHEMA,
    media:{fileName,byteLength:blob.size,sha256:hex(new Uint8Array(digest)),container:'webm'},
    project:{name:project.name,fps:project.fps,durationFrames:project.duration,
      originalGlbSha256:importedGlbHashes},
    recording:{mode:'browser-realtime-canvas',mediaDecodedByReceiver:false},
    authority:{originAuthenticated:false,signaturePresent:false,
      sourceRightsVerified:false,publicReleaseAuthorized:false},
    notice:'Unsigned local file-byte receipt only. Rendering fidelity, rights, output codecs and publishing are not certified.',
  };
}
