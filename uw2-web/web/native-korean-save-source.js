import {parseSaveSlots,parseKoreanPortTable} from './binary.js';
import {prepareVerifiedOriginalWebFile} from './native-original-file.js';
import {originalKoreanHeroRoster} from './native-original-hero-roster.js';
// Exact original Korean reference save used by this port. Different user
// save versions must provide their OWN verified source evidence, not silently
// masquerade as the reference. Browser-native, no DOS filesystem emulator.
export const KOREAN_REFERENCE_SAVE=Object.freeze({
 sha256:'ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9',
 byteLength:333551,pageSize:33340,slotCount:10,portCount:130
});
function deepFreezePlain(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  if(ArrayBuffer.isView(value)||value instanceof ArrayBuffer)
   return value; // readonly copyBytes remains private; no typed arrays here.
  for(const v of Object.values(value))deepFreezePlain(v);
  Object.freeze(value);
 }
 return value;
}
export async function readVerifiedKoreanSaveSource(bytes,{
 expectedSha256=KOREAN_REFERENCE_SAVE.sha256,
 expectedByteLength=KOREAN_REFERENCE_SAVE.byteLength
}={}){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==expectedByteLength||
    !Number.isSafeInteger(expectedByteLength)||expectedByteLength<333400||
    expectedByteLength>4*1024*1024)
   throw new Error('Korean original native save source byte count mismatch');
 const asset=await prepareVerifiedOriginalWebFile(bytes,{
  expectedSha256,maxBytes:expectedByteLength
 });
 if(asset.byteLength!==expectedByteLength)
   throw new Error('Korean original native save source size changed during SHA');
 const verifiedBytes=asset.copyBytes();
 const original=verifiedBytes.buffer;
 const slots=parseSaveSlots(original);
 const ports=parseKoreanPortTable(original);
 const heroNames=originalKoreanHeroRoster(verifiedBytes);
 if(slots.length!==10||ports.length!==130||
    slots.some((slot,i)=>slot.index!==i))
   throw new Error('Korean native original save record inventory mismatch');
 deepFreezePlain(slots);
 deepFreezePlain(ports);
 return Object.freeze({
  sourceSha256:asset.sourceSha256,byteLength:asset.byteLength,
  slots,portCatalog:ports,heroNames,
  copyBytes:asset.copyBytes,
  fidelity:'SHA_PINNED_ORIGINAL_SAVE_PARSED_TO_NATIVE_WEB_STATE__DOS_WRITE_UNTESTED'
 });
}
