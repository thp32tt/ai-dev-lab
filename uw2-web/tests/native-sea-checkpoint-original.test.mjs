import assert from 'node:assert/strict';
import fs from 'node:fs';import {join} from 'node:path';
import {readVerifiedKoreanSaveSource} from '../web/native-korean-save-source.js';
import {decodeWorldAssets,findNearestSea,SeaRuntime} from '../web/world-map.js';
import {parseWindCur} from '../web/windcur.js';
import {parseKoreanPortTable} from '../web/binary.js';
import {openNativeSaveSession} from '../web/native-save-session.js';
import {saveNativeSeaCheckpoint,loadNativeSeaCheckpoint,restoreNativeSeaRuntime}
 from '../web/native-sea-checkpoint.js';
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const read=name=>{const b=fs.readFileSync(join(dir,name));
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const saveData=read('KOUKAI2.DAT');
const source=await readVerifiedKoreanSaveSource(new Uint8Array(saveData));
const original=source.slots[1],session=openNativeSaveSession(original);
const worldAssets=decodeWorldAssets(read('WORLDMAP.LZW'),read('DATA1.LZW'));
const windCur=parseWindCur(read('WINDCUR.DAT'));
const portCatalog=parseKoreanPortTable(saveData,original.raw.page);
const start=findNearestSea(worldAssets,original.portWorld.x,original.portWorld.y,40);
assert.deepEqual(start,{x:286,y:238});
const sea=new SeaRuntime(worldAssets,start,windCur,
 original.dateTime.month,session.fleet,original.dateTime);
sea.turn(1);
for(let i=0;i<7;i++)sea.tick();
session.dateTime={...sea.dateTime};
const before=sea.snapshot(),map=new Map();
const storage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)??null};
const deps={storage,sourceSha256:source.sourceSha256,
 sourceSlots:source.slots,worldAssets,portCatalog};
const result=await saveNativeSeaCheckpoint({...deps,session,sea:before});
assert.equal(result.stored,true);
const restored=await loadNativeSeaCheckpoint(deps);
const runtime=restoreNativeSeaRuntime({...restored,worldAssets,windCur});
const after=runtime.snapshot();
for(const key of ['x','y','heading','steps','ticks','accX','accY','month'])
 assert.equal(after[key],before[key],key);
assert.deepEqual(after.dateTime,before.dateTime);
assert.equal(source.slots[1].portState.mapX,22);
const originalTime={...source.slots[1].dateTime};
assert.notEqual(restored.session.dateTime,source.slots[1].dateTime);
assert.equal(source.slots[1].dateTime.timeTick,originalTime.timeTick);
console.log(JSON.stringify({result:'ORIGINAL_KOREAN_WEB_NATIVE_SEA_CHECKPOINT',
 sourceSha256:source.sourceSha256,sourcePort:original.port,
 start,restored:{x:after.x,y:after.y,heading:after.heading,steps:after.steps,
 ticks:after.ticks,accX:after.accX,accY:after.accY},
 savedBytes:result.bytes,
 boundary:'WEB_NATIVE_SEA_ONLY__NO_DOS_SEA_SAVE_OFFSET_OR_FRAME_PARITY'}));