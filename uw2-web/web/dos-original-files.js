// SHA-256 pinned user-owned DOS file boundary for original UW2 assets.
// Browser/Node preflight is async; the INT 21h filename resolver is sync.
// No copyrighted contents, permissive filename guesses, or invented bytes.
const nameKey=name=>{
  if(typeof name!=='string'||!/^[A-Za-z0-9_$~!-]{1,8}(?:\.[A-Za-z0-9_$~!-]{1,3})?$/.test(name))
    throw new Error('DOS original filename must be an explicit 8.3 basename');
  return name.toUpperCase(); // FAT DOS ASCII case-insensitive filenames
};
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
export async function preparePinnedOriginalDosFiles(entries){
  if(!Array.isArray(entries)||!entries.length)
    throw new Error('explicit user-owned original DOS file inventory required');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('original SHA-256 verification unavailable: fail closed');
  const stored=new Map(),metadata=[];
  for(const [i,entry] of entries.entries()){
    const key=nameKey(entry?.name);
    if(stored.has(key))throw new Error('duplicate DOS original filename '+key);
    if(!(entry?.bytes instanceof Uint8Array))
      throw new TypeError('original DOS file bytes must be Uint8Array');
    if(typeof entry.expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(entry.expectedSha256))
      throw new Error('DOS original file SHA-256 must be pinned');
    if(!Number.isSafeInteger(entry.expectedSize)||entry.expectedSize<0)
      throw new Error('DOS original file size must be pinned');
    if(entry.bytes.length!==entry.expectedSize)
      throw new Error('DOS original file size mismatch: '+key);
    const digest=hex(new Uint8Array(
      await globalThis.crypto.subtle.digest('SHA-256',entry.bytes)));
    if(digest!==entry.expectedSha256)
      throw new Error('DOS original file SHA-256 mismatch: '+key);
    // Verified content snapshots do not depend on callers retaining their buffers.
    stored.set(key,Uint8Array.from(entry.bytes));
    metadata.push(Object.freeze({name:key,size:entry.expectedSize,sha256:digest}));
  }
  const resolve=({raw})=>{
    if(!(raw instanceof Uint8Array)||raw.length===0||raw.length>12)return null;
    let name='';
    for(const b of raw){
      if(b<0x21||b>0x7e)return null; // no speculative Korean/codepage paths
      name+=String.fromCharCode(b);
    }
    // Do not translate DOS paths, directory prefixes or other filenames.
    if(!/^[A-Za-z0-9_$~!-]{1,8}(?:\.[A-Za-z0-9_$~!-]{1,3})?$/.test(name))
      return null;
    const bytes=stored.get(name.toUpperCase());
    // Never expose the verified backing snapshot for mutation by a caller.
    return bytes?{bytes:Uint8Array.from(bytes)}:null;
  };
  return Object.freeze({
    readOriginalFile:resolve,
    verified: Object.freeze(metadata),
    fidelity:'SHA256_PINNED_ASSETS_ONLY__ORIGINAL_DOS_RUNTIME_UNTESTED'
  });
}
