import {canFleetStand,WORLD_CHIP_W,WORLD_CHIP_H} from './world-map.js';

// Source-shaped native sea motion: original wind + ship speed + current
// contributes at most 40+7 subunits per 20-minute tick. The existing
// 60-subunit integrator therefore stores a whole-number remainder 0..59.
// Persisted or live out-of-range remainders are not extra free movement.
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const NATIVE_SEA_SUBUNITS_PER_CHIP=60;
export function validNativeSeaMotion(state,worldAssets){
 if(!state||!worldAssets||
    !whole(state.x,0,WORLD_CHIP_W-1)||
    !whole(state.y,0,WORLD_CHIP_H-2)||
    !whole(state.accX,0,NATIVE_SEA_SUBUNITS_PER_CHIP-1)||
    !whole(state.accY,0,NATIVE_SEA_SUBUNITS_PER_CHIP-1))
  return false;
 try{return canFleetStand(worldAssets,state.x,state.y);}
 catch{return false;}
}
