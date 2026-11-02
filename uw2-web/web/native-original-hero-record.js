// Korean MAIN.EXE SHA256 1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747
// raw 0x1AF96 calls far 0000:5AEE; its MZ raw 0xAEEE body calculates
// DS:1242 + (0x32 * AL). The Korean DOS save has a *different* person
// table address, page+0x06A9, with the same 50-byte record stride.
// These are address proofs, NOT reconstructed new-game contents.
export const ORIGINAL_KOREAN_HERO_COUNT=6;
export const ORIGINAL_KOREAN_PERSON_BYTES=0x32;
export const ORIGINAL_MAIN_HERO_BASE=0x1242;
export const ORIGINAL_SAVE_PERSON_BASE=0x06a9;
export const ORIGINAL_SAVE_PAGE_BYTES=33340;
const validId=id=>Number.isSafeInteger(id)&&id>=0&&id<ORIGINAL_KOREAN_HERO_COUNT;
export function originalMainHeroPersonAddress(id){
 return validId(id)?ORIGINAL_MAIN_HERO_BASE+id*ORIGINAL_KOREAN_PERSON_BYTES:null;
}
export function originalSavedHeroPersonOffset(index,id){
 return Number.isSafeInteger(index)&&index>=0&&index<10&&validId(id)
  ?index*ORIGINAL_SAVE_PAGE_BYTES+ORIGINAL_SAVE_PERSON_BASE+id*ORIGINAL_KOREAN_PERSON_BYTES:null;
}
export function isOriginalSavedHeroOwner(slot){
 if(!slot||slot.empty||slot.unverified||!Number.isSafeInteger(slot.index))return false;
 const offset=originalSavedHeroPersonOffset(slot.index,slot.heroId);
 return offset!==null&&slot.raw?.page===slot.index*ORIGINAL_SAVE_PAGE_BYTES&&
   slot.raw?.personBase===offset;
}
