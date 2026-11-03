// Browser-native, SHA-pinned original game-file reader.
// This module verifies exact original SHA-256 on secure and LAN HTTP browsers.
// No DOS pathname, virtual disk, guest CPU or emulation is used.
import {sha256Hex} from './native-sha256.js';
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
  // Copy BEFORE the await; digest and final pixel decode use one snapshot.
  const stable=Uint8Array.from(source);
  const actual=await sha256Hex(stable);
  if(actual!==expectedSha256)
    throw new Error('native original web asset SHA-256 mismatch: fail closed');
  return Object.freeze({
    sourceSha256:actual,byteLength:stable.length,
    copyBytes:()=>Uint8Array.from(stable),
    fidelity:'DIRECT_PINNED_SOURCE_TO_NATIVE_WEB_BYTES__NO_DOS_EMULATOR'
  });
}
