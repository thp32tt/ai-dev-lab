// Stage a complete original Korean save -> native browser town transition.
// No live selected session, port catalog, sea/town runtime, keyboard ownership,
// or original DOS save bytes are ever changed during this preflight.
import {openNativeSaveSession,syncNativeTownSession} from './native-save-session.js';
import {classifyNativeSaveEntry} from './native-save-entry.js';
import {parseKoreanPortTable} from './binary.js';
import {admitOriginalKoreanSaveSlot} from './native-original-source-admission.js';
import {PortWalkingRuntime} from './town.js';

const hold=reason=>Object.freeze({ready:false,reason});
export function stageNativeTownSave(slot,{saveBuffer,portAssets,portDoors}={}){
  if(slot?.unverified)return hold('ORIGINAL_HERO_OR_PORT_RECORD_UNVERIFIED');
  // Browser game load must use the already verified, immutable source-copy.
  if(!(saveBuffer instanceof ArrayBuffer)||
     saveBuffer.byteLength<333400)
    return hold('ORIGINAL_SAVE_SOURCE_UNAVAILABLE');
  try{
    const sourceAdmission=admitOriginalKoreanSaveSlot(slot,saveBuffer);
    if(!sourceAdmission.allowed)return hold(sourceAdmission.reason);
    const session=openNativeSaveSession(sourceAdmission.slot);
    const entry=classifyNativeSaveEntry(session,{portAssets,portDoors});
    if(entry.route!=='town')return hold(entry.reason);
    const page=session.raw?.page;
    if(!Number.isSafeInteger(page)||page<0||page>=saveBuffer.byteLength)
      return hold('ORIGINAL_SAVE_PAGE_UNVERIFIED');
    const portCatalog=parseKoreanPortTable(saveBuffer,page);
    if(portCatalog.length!==130)
      return hold('ORIGINAL_PORT_CATALOG_INCOMPLETE');
    // Construct the real source-backed town runtime before changing any
    // currently playable session. Constructor failure leaves it untouched.
    const town=new PortWalkingRuntime(session,portAssets,portDoors);
    // Running renderTownScreen immediately synchronizes the source town
    // coordinates/actors and applies real map collision. Enforce the exact
    // same invariant before replacing any live game session.
    const synced=syncNativeTownSession(session,town.snapshot(),portAssets);
    if(!synced.updated)return hold(synced.reason);
    return Object.freeze({
      ready:true,session,portCatalog,town,
      source:'VERIFIED_KOREAN_SAVE_TO_NATIVE_TOWN_STAGED'
    });
  }catch{
    // Do not expose guessed synthetic gameplay or half-loaded live state.
    return hold('ORIGINAL_SAVE_RUNTIME_PREFLIGHT_FAILED');
  }
}
