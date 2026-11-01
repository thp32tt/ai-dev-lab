// Browser-native game/save entry admission: only decoded original save
// states with proven town geometry may enter the existing 2D town runtime.
// The Korean at-sea save's exact world coordinate/heading layout is still
// unverified. Never replace it with fake REA ticks or an invented seaway.
export function classifyNativeSaveEntry(slot,{portAssets,portDoors}={}){
  if(!slot||slot.empty)return Object.freeze({route:'hold',reason:'EMPTY_OR_UNVERIFIED_SAVE'});
  if(slot.port===0xff)return Object.freeze({
    route:'hold',reason:'AT_SEA_COORDINATE_LAYOUT_UNVERIFIED'
  });
  if(!Number.isInteger(slot.port)||slot.port<0||slot.port>100)
    return Object.freeze({route:'hold',reason:'PORT_ID_UNVERIFIED'});
  if(!portAssets||!Array.isArray(portAssets.maps)||
     !portAssets.maps[slot.port]||
     !Array.isArray(portDoors)||!Array.isArray(portDoors[slot.port]))
    return Object.freeze({route:'hold',reason:'ORIGINAL_TOWN_ASSETS_UNAVAILABLE'});
  const state=slot.portState,world=slot.portWorld;
  if(!state||!world||![state.viewX,state.viewY,
        state.playerX,state.playerY,state.mapX,state.mapY,
        world.x,world.y].every(Number.isSafeInteger)||
     state.viewX<0||state.viewX>72||state.viewY<0||state.viewY>72||
     state.playerX<0||state.playerX>22||
     state.playerY<0||state.playerY>22||
     state.mapX!==state.viewX+state.playerX||
     state.mapY!==state.viewY+state.playerY)
    return Object.freeze({route:'hold',reason:'ORIGINAL_TOWN_POSITION_UNVERIFIED'});
  return Object.freeze({route:'town',port:slot.port,
    source:'KOUKAI2_DAT_PARSED_TOWN_COORDINATES'});
}
