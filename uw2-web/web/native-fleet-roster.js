// One coherent browser-native fleet manifest for Korean KOUKAI2 source
// sessions. The original source exposes both the ship list and its summary
// (count/totalCrew). This is an integrity check, NOT a recovered DOS rule.
const u16=value=>Number.isSafeInteger(value)&&value>=0&&value<=65535;
export function validNativeFleetRoster(fleet){
 const ships=fleet?.ships;
 if(!Array.isArray(ships)||ships.length<1||ships.length>10)return false;
 if(Object.hasOwn(fleet,'count')&&fleet.count!==ships.length)return false;
 let sum=0;
 for(const ship of ships){
   if(!ship||typeof ship!=='object'||Array.isArray(ship))return false;
   if(Object.hasOwn(ship,'maxCrew')&&
      (!u16(ship.maxCrew)||!u16(ship.currentCrew)||
        ship.currentCrew>ship.maxCrew))return false;
   if(Object.hasOwn(fleet,'totalCrew')){
     if(!u16(ship.currentCrew))return false;
     sum+=ship.currentCrew;
   }
 }
 return !Object.hasOwn(fleet,'totalCrew')||
   (Number.isSafeInteger(fleet.totalCrew)&&
    fleet.totalCrew===sum&&sum<=655350);
}
