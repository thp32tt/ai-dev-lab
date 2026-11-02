// Native Korean source-save admission. The supplied UI slot must be the
// *entire* parsed record of the exact save bytes selected by the player.
// A matching hero ID/person pointer alone does NOT establish the money,
// date, ship, inventory, port or actor state. No DOS emulator is involved.
// The boot/source reader owns the SHA-256 check; this synchronous guard
// binds a candidate to that already verified copy, not a fresh file hash.
import {parseSaveSlots} from './binary.js';

const hold=reason=>Object.freeze({allowed:false,reason});
function samePlain(left,right,depth=0,budget={remaining:12000}){
 if(--budget.remaining<0||depth>18)return false;
 if(Object.is(left,right))return true;
 if(!left||!right||typeof left!=='object'||typeof right!=='object')
  return false;
 const aArray=Array.isArray(left),bArray=Array.isArray(right);
 if(aArray!==bArray)return false;
 if(Object.getPrototypeOf(left)!==(aArray?Array.prototype:Object.prototype)||
    Object.getPrototypeOf(right)!==(bArray?Array.prototype:Object.prototype))
  return false;
 if(aArray&&left.length!==right.length)return false;
 const keys=Object.keys(left),other=Object.keys(right);
 if(keys.length!==other.length)return false;
 for(const key of keys){
  if(!Object.prototype.hasOwnProperty.call(right,key)||
     !samePlain(left[key],right[key],depth+1,budget))return false;
 }
 return true;
}
export function admitOriginalKoreanSaveSlot(slot,saveBuffer){
 if(!(saveBuffer instanceof ArrayBuffer)||saveBuffer.byteLength<333400||
    saveBuffer.byteLength>4*1024*1024)
  return hold('ORIGINAL_SAVE_SOURCE_UNAVAILABLE');
 if(!slot||!Number.isSafeInteger(slot.index)||slot.index<0||slot.index>=10)
  return hold('ORIGINAL_SOURCE_SLOT_MISMATCH');
 try{
  const original=parseSaveSlots(saveBuffer)[slot.index];
  if(!original||original.empty||original.unverified)
   return hold('ORIGINAL_SOURCE_SLOT_UNVERIFIED');
  if(!samePlain(slot,original))
   return hold('ORIGINAL_SOURCE_SLOT_MISMATCH');
  // The commit path must use newly decoded canonical bytes, not even
  // a caller-supplied object that currently happens to compare equal.
  return Object.freeze({allowed:true,slot:original,
   source:'ORIGINAL_KOREAN_SAVE_BYTES_CANONICAL_SLOT'});
 }catch{
  return hold('ORIGINAL_SOURCE_SLOT_UNVERIFIED');
 }
}
