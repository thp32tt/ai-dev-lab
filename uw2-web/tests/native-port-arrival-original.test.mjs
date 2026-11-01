import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {decodePortAssets} from '../web/port-map.js';
import {parsePortDoors} from '../web/town.js';
import {parseSaveSlots,parseKoreanPortTable} from '../web/binary.js';
import {buildNativePortArrival} from '../web/native-port-arrival.js';
// OWNER-ONLY original source, not repository binary or DOS guest execution.
const root=process.env.UW2_GAME_DIR||
  '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const pins={
 'KOUKAI2.DAT':'ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9',
 'PORTCHIP.LZW':'e3c5253c12dc24d3e3d8fa8294d4160a116601ba67ebb4190e49c64cd37cc95b',
 'PORTMAP.LZW':'ed3161c45b038fbc715840e9798bc4a2d3c5615d036b27c8048e93c8c6b7c25d',
 'CHIP_NO.DAT':'0f76440952571894b10b07780a6a21426c2ebc0d1911dfb4ac823e22b0b1a516',
 'ZA_DAT.DAT':'b60f1549ce68f3853bdbfe0747a0338ccf6a411fa79eaee2f894caed22d56192'
};
const raw=name=>{
 const b=fs.readFileSync(join(root,name));
 assert.equal(createHash('sha256').update(b).digest('hex'),pins[name],
  'private original resource SHA mismatch '+name);
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
};
const save=raw('KOUKAI2.DAT');
const ports=parseKoreanPortTable(save),slots=parseSaveSlots(save);
const assets=decodePortAssets(raw('PORTCHIP.LZW'),raw('PORTMAP.LZW'),raw('CHIP_NO.DAT'));
const doors=parsePortDoors(raw('ZA_DAT.DAT'));
assert.equal(ports.length,130);
const date=slots[1].dateTime;
let normal=0,supply=0;
for(const port of ports){
 const target=buildNativePortArrival({
  port,seaState:{dateTime:date},
  previous:slots[1],portDoors:doors,portAssets:assets
 });
 assert.ok(target,'original source port '+port.id+' must be navigable');
 assert.equal(target.port,port.mapId);
 assert.equal(target.portCatalogId,port.id);
 assert.equal(target.portWorld.x,port.x);
 assert.equal(target.portWorld.y,port.y);
 assert.deepEqual(target.dateTime,date);
 assert.equal(target.portState.mapX,doors[port.mapId][3].x);
 assert.equal(target.portState.mapY,doors[port.mapId][3].y+1);
 assert.ok(target.portState.playerX>=0&&target.portState.playerX<=22);
 assert.ok(target.portState.playerY>=0&&target.portState.playerY<=22);
 if(port.supply){
  supply++;
  assert.equal(target.port,100);
  assert.equal(target.arrivalEvidence.actorStatus,'OTHER_PORT_ACTORS_NOT_VERIFIED');
 }else normal++;
 if(port.id===39){
  assert.deepEqual(target.portState,slots[1].portState);
 }
}
assert.equal(normal,100);assert.equal(supply,30);
console.log(JSON.stringify({
 result:'OWNER_ORIGINAL_130_SOURCE_PORTS_NATIVE_LANDING_COLLISION_PROVEN',
 ports:ports.length,normal,supply,
 danzigPortState:slots[1].portState,
 fidelity:'SOURCE_PORT_TABLE_ZA_DAT_PORTCHIP__NOT_DOS_REFERENCE_TRANSITION'
}));
