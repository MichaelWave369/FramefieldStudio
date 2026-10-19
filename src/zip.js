// Minimal, independently implemented, uncompressed ZIP writer for PNG sequences.
// ZIP32 "store" format; browsers can produce PNG compression themselves.
// SPDX-License-Identifier: MIT
const encoder=new TextEncoder();
const signature=(target,offset,v)=>target.setUint32(offset,v,true);
const short=(target,offset,v)=>target.setUint16(offset,v,true);
const TABLE=Uint32Array.from({length:256},(_,n)=>{
  let c=n;
  for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
  return c>>>0;
});
export function crc32(data){
  let value=0xffffffff;
  for(const byte of data)value=TABLE[(value^byte)&255]^(value>>>8);
  return (value^0xffffffff)>>>0;
}
export function makeZip(files){
  if(!Array.isArray(files)||files.length<1||files.length>120)
    throw Error('ZIP requires 1–120 frames.');
  const parts=[],directory=[];
  let position=0,centralSize=0;
  for(const file of files){
    if(!(file.data instanceof Uint8Array))throw Error('ZIP entry must be binary.');
    if(!/^[A-Za-z0-9_-]+\.png$/.test(file.name))
      throw Error('Invalid frame filename.');
    const name=encoder.encode(file.name),length=file.data.byteLength;
    if(length>150_000_000||position+length>150_000_000)
      throw Error('PNG sequence exceeds 150 MB. Use fewer frames.');
    const checksum=crc32(file.data),local=new Uint8Array(30+name.length);
    const h=new DataView(local.buffer);
    signature(h,0,0x04034b50);short(h,4,20);short(h,6,0x0800);
    short(h,8,0);short(h,10,0);short(h,12,0);
    signature(h,14,checksum);signature(h,18,length);signature(h,22,length);
    short(h,26,name.length);short(h,28,0);local.set(name,30);
    parts.push(local,file.data);
    const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
    signature(c,0,0x02014b50);short(c,4,20);short(c,6,20);short(c,8,0x0800);
    short(c,10,0);short(c,12,0);short(c,14,0);
    signature(c,16,checksum);signature(c,20,length);signature(c,24,length);
    short(c,28,name.length);short(c,30,0);short(c,32,0);
    short(c,34,0);short(c,36,0);signature(c,38,0);
    signature(c,42,position);central.set(name,46);
    directory.push(central);
    position+=local.length+length;centralSize+=central.length;
  }
  const footer=new Uint8Array(22),f=new DataView(footer.buffer);
  signature(f,0,0x06054b50);
  short(f,4,0);short(f,6,0);
  short(f,8,files.length);short(f,10,files.length);
  signature(f,12,centralSize);signature(f,16,position);
  short(f,20,0);
  return new Blob([...parts,...directory,footer],{type:'application/zip'});
}
