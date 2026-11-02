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
  backup:`${PREFIX}-${slot}-${kind}-previous`,
  mode:`${PREFIX}-${slot}-mode`
 });
}
const storageValid=storage=>storage&&
 typeof storage.getItem==='function'&&typeof storage.setItem==='function';

// The existing town/sea checkpoint modules retain all original checksum,
// source-SHA and game-state validation. An exact-key adapter changes ONLY
// which browser-local record those modules read or write.
export function nativeCheckpointSlotStorage(storage,slot,kind,{mirrorLatest=false,generation='current'}={}){
 if(!storageValid(storage)||typeof mirrorLatest!=='boolean'||
    !['current','previous'].includes(generation)||
    (generation==='previous'&&mirrorLatest))
  throw new TypeError('browser checkpoint storage, valid generation and mirror flag required');
 const keys=nativeCheckpointSlotKeys(slot,kind);
 const originalKey=dataKey(kind);
 return Object.freeze({
  getItem:key=>{
   if(key!==originalKey)throw new Error('scoped browser checkpoint key mismatch');
   return storage.getItem(generation==='previous'?keys.backup:keys.data);
  },
  setItem:(key,value)=>{
   if(key!==originalKey||typeof value!=='string'||generation!=='current')
    throw new Error('scoped browser checkpoint write key/value invalid');
   // Preserve the previously committed generation BEFORE replacing it.
   // Save modules have already validated the new original-source snapshot,
   // and still check size, SHA and source identity on every load. Keep
   // the old record intact when a browser quota exception interrupts this.
   const previous=storage.getItem(keys.data);
   if(typeof previous==='string'&&previous.length&&previous!==value)
    storage.setItem(keys.backup,previous);
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

export function availableNativeCheckpointSlots(storage,sourceSlots){
 if(!storageValid(storage)||!Array.isArray(sourceSlots))
  return Object.freeze([]);
 const result=[];
 for(let slot=0;slot<10;slot++){
  if(!sourceSlots[slot]||sourceSlots[slot].empty||
     sourceSlots[slot].unverified)continue;
  const keys=nativeCheckpointSlotKeys(slot,'town');
  let mode,record;
  try{
   mode=storage.getItem(keys.mode);
   if(validKind(mode)){
    const owned=nativeCheckpointSlotKeys(slot,mode);
    record=storage.getItem(owned.data)??storage.getItem(owned.backup);
   }else record=null;
  }catch{return Object.freeze([]);}
  // Existence only; the real SHA, save identity and world geometry remain
  // mandatory at restore time. Never claim a record is verified here.
  if(validKind(mode)&&typeof record==='string'&&record.length>0)
   result.push(Object.freeze({slot,kind:mode}));
 }
 return Object.freeze(result);
}

/**
 * Restore a browser checkpoint only after the existing SHA-256, source
 * identity, economy, world-geometry and clock verification in its original
 * loader succeeds. Never treat a JSON-valid/length-valid backup as verified.
 *
 * A MAIN-screen global Continue record may be stale or interrupted; its
 * pinned latest original-slot record is checked before the older generation.
 * Legacy single-record saves retain their original behavior.
 */
export async function loadNativeCheckpointWithRecovery({storage,choice,load}={}){
 if(!storageValid(storage)||!choice||!validKind(choice.kind)||
    !(choice.slot===null||validSlot(choice.slot))||
    typeof load!=='function'||!choice.storage)
  throw new TypeError('original-source checkpoint loader and choice required');
 let primaryError=null;
 const verified=async(value,source)=>{
  if(value===null)return null;
  if(!value||!value.session||
     (choice.slot!==null&&value.session.index!==choice.slot))
   throw new Error('browser checkpoint source slot identity invalid');
  return {...value,checkpointRecovery:source};
 };
 try{
  const current=await verified(await load(choice.storage),null);
  if(current)return current;
 }catch(error){primaryError=error;}
 if(choice.slot!==null){
  const generations=choice.source==='LATEST_BROWSER_CHECKPOINT'
   ?['current','previous']:choice.source==='SCOPED_ORIGINAL_SOURCE_SLOT'
   ?['previous']:[];
  for(const generation of generations){
   try{
    const candidate=nativeCheckpointSlotStorage(
     storage,choice.slot,choice.kind,{generation});
    const recovered=await verified(await load(candidate),
     generation==='current'?'SCOPED_SOURCE_VERIFIED':'PREVIOUS_SOURCE_VERIFIED');
    if(recovered)return recovered;
   }catch{/* Never bypass source checks or overwrite a corrupted record. */}
  }
 }
 if(primaryError)throw primaryError;
 return null;
}
