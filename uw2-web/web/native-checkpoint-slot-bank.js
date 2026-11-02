// Browser-only, per-original-source-slot checkpoint routing.
// Each of the ten SHA-pinned Korean save slots owns a separate web progress
// record. This does NOT write DOS KOUKAI2.DAT or replace DOS Save Data.
import {NATIVE_TOWN_CHECKPOINT_KEY} from './native-town-checkpoint.js';
import {NATIVE_SEA_CHECKPOINT_KEY,
 NATIVE_CHECKPOINT_CHOICE_KEY} from './native-sea-checkpoint.js';

export const NATIVE_CHECKPOINT_LATEST_SLOT_KEY='uw2-web-native-checkpoint-latest-slot-v1';
const PREFIX='uw2-web-native-checkpoint-source-slot-v1';
const validSlot=n=>Number.isSafeInteger(n)&&n>=0&&n<10;
const validKind=kind=>kind==='town'||kind==='sea';
const dataKey=kind=>kind==='town'?NATIVE_TOWN_CHECKPOINT_KEY:NATIVE_SEA_CHECKPOINT_KEY;
export function nativeCheckpointSlotKeys(slot,kind){
 if(!validSlot(slot)||!validKind(kind))
  throw new RangeError('original source checkpoint slot/kind must be 0..9, town or sea');
 return Object.freeze({
  data:`${PREFIX}-${slot}-${kind}`,
  mode:`${PREFIX}-${slot}-mode`
 });
}
const storageValid=storage=>storage&&
 typeof storage.getItem==='function'&&typeof storage.setItem==='function';

// The existing town/sea checkpoint modules retain all original checksum,
// source-SHA and game-state validation. An exact-key adapter changes ONLY
// which browser-local record those modules read or write.
export function nativeCheckpointSlotStorage(storage,slot,kind,{mirrorLatest=false}={}){
 if(!storageValid(storage)||typeof mirrorLatest!=='boolean')
  throw new TypeError('browser checkpoint storage and explicit mirror flag required');
 const keys=nativeCheckpointSlotKeys(slot,kind);
 const originalKey=dataKey(kind);
 return Object.freeze({
  getItem:key=>{
   if(key!==originalKey)throw new Error('scoped browser checkpoint key mismatch');
   return storage.getItem(keys.data);
  },
  setItem:(key,value)=>{
   if(key!==originalKey||typeof value!=='string')
    throw new Error('scoped browser checkpoint write key/value invalid');
   // Write the owned slot first; only then mirror the newest record to
   // the historical global key for MAIN-screen continue compatibility.
   storage.setItem(keys.data,value);
   if(mirrorLatest)storage.setItem(originalKey,value);
  }
 });
}
export function recordNativeCheckpointSlot(storage,slot,kind){
 if(!storageValid(storage))throw new TypeError('checkpoint storage unavailable');
 const keys=nativeCheckpointSlotKeys(slot,kind);
 // Must be called ONLY after successful SHA-validated save to the scoped
 // record. The per-owner mode chooses its latest town/sea snapshot.
 storage.setItem(keys.mode,kind);
 storage.setItem(NATIVE_CHECKPOINT_LATEST_SLOT_KEY,String(slot));
 return Object.freeze({slot,kind});
}
export function resolveNativeCheckpointLoad(storage,activeSlot=null){
 if(!storageValid(storage))throw new TypeError('checkpoint storage unavailable');
 if(activeSlot!==null&&!validSlot(activeSlot))
  throw new RangeError('active original source slot invalid');
 const lastSlot=storage.getItem(NATIVE_CHECKPOINT_LATEST_SLOT_KEY);
 const legacyKind=storage.getItem(NATIVE_CHECKPOINT_CHOICE_KEY);
 if(legacyKind!==null&&!validKind(legacyKind))
  throw new Error('browser checkpoint mode marker corrupted');
 if(lastSlot!==null&&!validSlot(Number(lastSlot)) )
  throw new Error('browser checkpoint source slot marker corrupted');
 if(lastSlot!==null&&String(Number(lastSlot))!==lastSlot)
  throw new Error('browser checkpoint source slot marker corrupted');
 if(activeSlot!==null){
  const keys=nativeCheckpointSlotKeys(activeSlot,'town');
  const kind=storage.getItem(keys.mode);
  if(kind!==null){
   if(!validKind(kind))throw new Error('per-slot checkpoint mode corrupted');
   return Object.freeze({slot:activeSlot,kind,
    storage:nativeCheckpointSlotStorage(storage,activeSlot,kind),
    source:'SCOPED_ORIGINAL_SOURCE_SLOT'});
  }
  // A pre-upgrade single global checkpoint has no slot marker. Continue
  // loading that legacy record as before, with all original SHA checks.
  if(lastSlot===null&&legacyKind!==null)
   return Object.freeze({slot:null,kind:legacyKind,storage,source:'LEGACY_GLOBAL'});
  // Never load the latest OTHER hero when one original slot is active.
  return null;
 }
 if(legacyKind===null)return null;
 return Object.freeze({slot:lastSlot===null?null:Number(lastSlot),
  kind:legacyKind,storage,source:'LATEST_BROWSER_CHECKPOINT'});
}
