// The SHA-pinned Korean KOUKAI2.DAT contains six original 50-byte
// protagonist person records on every 33,340-byte save page, INCLUDING
// pages whose save-slot header is empty. Read only: no new-game seeding.
import {decodeCString,SAVE} from './binary.js';
import {ORIGINAL_KOREAN_HERO_COUNT,originalSavedHeroPersonOffset}
 from './native-original-hero-record.js';

function safeName(value){
 if(typeof value!=='string'||!value||value.length>28||
    value.includes('\uFFFD')||/[\u0000-\u001f\u007f]/u.test(value))return null;
 return value.trim()||null;
}
function readPersonName(bytes,page,heroId){
 const base=originalSavedHeroPersonOffset(page,heroId);
 if(base==null||base+SAVE.PERSON_SIZE>bytes.length)return null;
 const first=safeName(decodeCString(bytes,base,13));
 const last=safeName(decodeCString(bytes,base+13,13));
 return first&&last?first+' '+last:null;
}
// Consensus is intentional: never promote a name changed in one save page
// to the canonical selector label for an unrelated original protagonist.
// Custom save sources can still use the verified owner slot name as fallback.
export function originalKoreanHeroRoster(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<SAVE.PAGE_SIZE*10)
  throw new TypeError('verified Korean save bytes and ten pages required');
 return Object.freeze(Array.from({length:ORIGINAL_KOREAN_HERO_COUNT},(_,id)=>{
  const first=readPersonName(bytes,0,id);
  if(!first)return null;
  for(let page=1;page<10;page++)
   if(readPersonName(bytes,page,id)!==first)return null;
  return first;
 }));
}
