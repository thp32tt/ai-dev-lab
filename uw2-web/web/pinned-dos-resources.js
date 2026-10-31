// An opt-in, immutable, SHA-verified read-only DOS path -> owner-provided
// original-file byte resolver. The caller must spell each DOS path explicitly:
// C:OPGRAPH.LZW is *drive-relative* and is NOT normalized to C:\\OPGRAPH.LZW.
// No original game binaries/resources are bundled or fetched here.
const hex=bytes=>Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');

export async function preparePinnedDosReadOnlyResources(entries,{maxTotalBytes=64*1024*1024}={}){
  if(!Array.isArray(entries)||!entries.length||entries.length>256)
    throw new RangeError('nonempty bounded DOS resource entries required');
  if(!Number.isSafeInteger(maxTotalBytes)||maxTotalBytes<1||maxTotalBytes>512*1024*1024)
    throw new RangeError('bounded original DOS resource memory quota required');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('original DOS resource SHA-256 unavailable: fail closed');
  const verified=new Map();
  let bytesTotal=0;
  for(const entry of entries){
    if(!entry||typeof entry!=='object'||Array.isArray(entry))
      throw new TypeError('DOS resource entry object required');
    const {dosPath,bytes,expectedSha256}=entry;
    if(typeof dosPath!=='string'||!dosPath.length||dosPath.length>260||
       !/^[\x21-\x7e]+$/.test(dosPath)||dosPath.includes('/')||
       dosPath.includes('\\')||dosPath.includes('..'))
      throw new Error('DOS resource requires explicit safe ASCII path');
    if(verified.has(dosPath))
      throw new Error('duplicate exact DOS resource path: fail closed');
    if(!(bytes instanceof Uint8Array))
      throw new TypeError('DOS original resource data must be Uint8Array');
    if(!bytes.length)
      throw new Error('empty DOS original resource cannot be inferred: fail closed');
    if(typeof expectedSha256!=='string'||!/^[0-9a-f]{64}$/.test(expectedSha256))
      throw new Error('DOS original resource requires exact lowercase SHA-256');
    bytesTotal+=bytes.length;
    if(!Number.isSafeInteger(bytesTotal)||bytesTotal>maxTotalBytes)
      throw new RangeError('DOS original resource memory quota exceeded');
    const digest=hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
    if(digest!==expectedSha256)
      throw new Error('original DOS resource SHA-256 mismatch: fail closed');
    verified.set(dosPath,Uint8Array.from(bytes));
  }
  // Snapshot the input bytes. Every independent DOS open returns an isolated
  // copy via the existing DOS read-only 3D/3F/42 adapter.
  return Object.freeze({
    verifiedFileCount:verified.size,totalBytes:bytesTotal,
    fidelity:'CALLER_PINNED_ORIGINAL_RESOURCES__NO_DOS_DIRECTORY_REFERENCE',
    resolve(request){
      if(!request||!(request.raw instanceof Uint8Array))
        throw new TypeError('DOS pathname requires original raw bytes');
      if(request.raw.length>260)
        throw new RangeError('DOS raw pathname too long');
      const filename=String.fromCharCode(...request.raw);
      if(request.filename!==filename)
        throw new Error('DOS raw path/decoded name mismatch: fail closed');
      const found=verified.get(filename);
      return found===undefined?null:{bytes:Uint8Array.from(found)};
    }
  });
}
