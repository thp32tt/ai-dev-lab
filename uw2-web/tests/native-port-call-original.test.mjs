import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseKoreanPortTable} from '../web/binary.js';
import {decodeWorldAssets,findNearestSea,findPortCallTarget,canFleetStand}
 from '../web/world-map.js';
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const input=(name,sha)=>{
 const b=fs.readFileSync(join(dir,name));
 assert.equal(createHash('sha256').update(b).digest('hex'),sha,name+' SHA');
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
};
const ports=parseKoreanPortTable(input('KOUKAI2.DAT',
 'ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9'));
const assets=decodeWorldAssets(input('WORLDMAP.LZW',
 '135e89cb1c894a8a70c67168898b816fab00a6a7d13a61f5965bacfaec6986fa'),
 input('DATA1.LZW',
 'b2c6f3430cb5b66c09bf77d7454b1346883f6c3eb62003848bf25ee0010907dc'));
let ring=0,recovered=0;
const mismatches=[];
for(const port of ports){
 const first=findNearestSea(assets,port.x,port.y,40);
 assert.ok(first,'no original sea exit for port '+port.id);
 assert.equal(canFleetStand(assets,first.x,first.y),true);
 const target=findPortCallTarget(first,ports);
 if(!target||target.id!==port.id)mismatches.push({
  port:port.id,name:port.name,exit:first,target:target?.id
 });
 else if(target.approach==='SOURCE_RING_4X4')ring++;
 else if(target.approach==='NATIVE_SOURCE_NEAREST_SEA_2CHIP_RECOVERY')recovered++;
 else assert.fail('unexpected native approach '+target.approach);
}
assert.deepEqual(mismatches,[]);
assert.equal(ports.length,130);
assert.equal(ring,71);assert.equal(recovered,59);
assert.equal(findPortCallTarget({x:1000,y:1000},ports),null);
console.log(JSON.stringify({
 result:'ORIGINAL_130_PORT_NATIVE_WEB_DEPARTURE_TO_SAME_SOURCE_PORT_CALL',
 ports:130,tracedRing:ring,boundedRecovery:recovered,wrongDestination:0,
 boundary:'SOURCE_GEOMETRY_RECOVERY__NOT_ORIGINAL_DOS_PORT_CALL_TIMING_PARITY'
}));
