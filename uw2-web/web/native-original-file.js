// Browser-native, SHA-pinned original game-file reader.
// This module is a direct Uint8Array -> WebCrypto -> isolated bytes bridge.
// No DOS pathname, virtual disk, guest CPU or emulation is used.
const hex=b=>Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
export async function prepareVerifiedOriginalWebFile(source,{
  expectedSha256,maxBytes=64*1024*1024
}={}){
  if(!(source instanceof Uint8Array))
    throw new TypeError('native original web asset requires Uint8Array');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>512*1024*1024)
    throw new RangeError('native web original asset size cap required');
  if(!source.length||source.length>maxBytes)
    throw new RangeError('native web original asset exceeds declared size cap');
  if(typeof expectedSha256!=='string'||!/^[0-9a-f]{64}$/.test(expectedSha256))
    throw new Error('native web original asset requires exact SHA256 fingerprint');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('native web source fingerprint unavailable: fail closed');
  // Copy BEFORE the await; digest and final pixel decode use one snapshot.
  const stable=Uint8Array.from(source);
  const actual=hex(new Uint8Array(await globalThis.crypto.subtle.digest(
    'SHA-256',stable)));
  if(actual!==expectedSha256)
    throw new Error('native original web asset SHA-256 mismatch: fail closed');
  return Object.freeze({
    sourceSha256:actual,byteLength:stable.length,
    copyBytes:()=>Uint8Array.from(stable),
    fidelity:'DIRECT_PINNED_SOURCE_TO_NATIVE_WEB_BYTES__NO_DOS_EMULATOR'
  });
}
