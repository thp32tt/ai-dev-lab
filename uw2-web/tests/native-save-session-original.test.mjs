import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readVerifiedKoreanSaveSource} from '../web/native-korean-save-source.js';
import {openNativeSaveSession,syncNativeTownSession} from '../web/native-save-session.js';
import {decodePortAssets} from '../web/port-map.js';
import {parsePortDoors,PortWalkingRuntime} from '../web/town.js';
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const raw=name=>{const b=fs.readFileSync(join(root,name));
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const rawSave=fs.readFileSync(join(root,'KOUKAI2.DAT'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline=hash(rawSave);
const verified=await readVerifiedKoreanSaveSource(rawSave);
const original=verified.slots[1];
const session=openNativeSaveSession(original);
const assets=decodePortAssets(raw('PORTCHIP.LZW'),
 raw('PORTMAP.LZW'),raw('CHIP_NO.DAT'));
const doors=parsePortDoors(raw('ZA_DAT.DAT'));
const walker=new PortWalkingRuntime(session,assets,doors);
const result=walker.move('right');
assert.equal(result.moved,true);
const state=walker.snapshot();
assert.deepEqual([state.mapX,state.mapY],[23,52]);
assert.equal(syncNativeTownSession(session,state,assets).updated,true);
assert.deepEqual([session.portState.mapX,session.portState.mapY],[23,52]);
assert.deepEqual([original.portState.mapX,original.portState.mapY],[22,52]);
assert.ok(Object.isFrozen(original));
assert.equal(hash(rawSave),baseline);
console.log(JSON.stringify({result:'ORIGINAL_DANZIG_NATIVE_WALK_SOURCE_SAVE_UNCHANGED',
 sourceSha256:baseline,original:[22,52],native:[23,52],
 boundary:'NATIVE_SESSION_ONLY__NO_DOS_SAVE_WRITE'}));
