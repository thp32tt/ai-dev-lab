import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {sha256Software,sha256Hex} from '../web/native-sha256.js';
import {prepareVerifiedOriginalWebFile} from '../web/native-original-file.js';

const expected=bytes=>createHash('sha256').update(bytes).digest('hex');
const enc=new TextEncoder();
for(const [value,known] of [
 ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
 ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
 ['한국어판 대항해시대 II 🌊', null]
]) {
 const bytes=enc.encode(value),reference=known??expected(bytes);
 assert.equal(sha256Software(bytes),reference);
 assert.equal(await sha256Hex(bytes,{cryptoApi:null}),reference);
 assert.equal(await sha256Hex(bytes),reference);
}
for(const n of [0,1,3,55,56,63,64,65,119,120,127,128,129,1024,333551,1048576]) {
 const data=randomBytes(n),want=expected(data);
 assert.equal(sha256Software(data),want,'software length '+n);
 assert.equal(await sha256Hex(data,{cryptoApi:null}),want,'LAN HTTP length '+n);
 assert.equal(await sha256Hex(data),want,'WebCrypto length '+n);
}
assert.equal(sha256Software(enc.encode('a'.repeat(1_000_000))),
 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
try {
 // Reproduce an ordinary http://192.168.x.x mobile browser: no crypto.subtle.
 Object.defineProperty(globalThis,'crypto',{value:{},configurable:true});
 const source=Uint8Array.of(0x4c,0x53,0x31,0x31,0x18,0x64);
 const verified=await prepareVerifiedOriginalWebFile(source,{
  expectedSha256:expected(source),maxBytes:64
 });
 assert.deepEqual(verified.copyBytes(),source);
 await assert.rejects(prepareVerifiedOriginalWebFile(source,{
  expectedSha256:'0'.repeat(64),maxBytes:64
 }),/SHA-256 mismatch/);
}finally{
 if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);
 else delete globalThis.crypto;
}
console.log('UW2 native SHA-256 secure WebCrypto + LAN HTTP fallback + fail-closed original source: PASS');
