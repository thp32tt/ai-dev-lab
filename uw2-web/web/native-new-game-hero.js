// Original Korean KAO.LZW supplies protagonist portrait records 0..5.
// This module does not invent MAIN.EXE's six new-game initialization states:
// there is no verified start-date, fleet, inventory, story or starting port yet.
import {isOriginalSavedHeroOwner} from './native-original-hero-record.js';
export const NATIVE_NEW_GAME_HERO_COUNT=6;
export function nativeNewGameHeroChoices(slots=[]){
 if(!Array.isArray(slots))throw new TypeError('original save slots required');
 return Array.from({length:NATIVE_NEW_GAME_HERO_COUNT},(_,id)=>{
  const sources=slots.filter(s=>s&&!s.empty&&!s.unverified&&s.heroId===id&&
   isOriginalSavedHeroOwner(s));
  const saved=sources[0]??null;
  return Object.freeze({
   id,portraitRecord:id,
   label:saved?.heroName?.trim()||`원본 주인공 ${id+1}`,
   sourceSlot:saved?.index??null,
   originalNewGameReady:false,
   originalStartReason:'MAIN_EXE_NEW_GAME_INITIAL_STATE_UNVERIFIED'
  });
 });
}
export function nativeNewGameSourceDemo(choices,id,slots){
 if(!Array.isArray(choices)||!Array.isArray(slots)||
    !Number.isSafeInteger(id)||id<0||id>=NATIVE_NEW_GAME_HERO_COUNT)
  return Object.freeze({allowed:false,reason:'HERO_SELECTION_INVALID'});
 const hero=choices[id];
 const snapshot=hero?.sourceSlot==null?null:slots[hero.sourceSlot];
 if(!hero||hero.id!==id||!snapshot||snapshot.empty||
    snapshot.index!==hero.sourceSlot||snapshot.heroId!==id||
    !isOriginalSavedHeroOwner(snapshot))
  return Object.freeze({allowed:false,reason:'ORIGINAL_HERO_SNAPSHOT_UNAVAILABLE'});
 return Object.freeze({allowed:true,slotIndex:hero.sourceSlot,
  source:'EXISTING_KOREAN_SAVE_SNAPSHOT__NOT_NEW_GAME'});
}
