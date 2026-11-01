import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readVerifiedKoreanSaveSource} from '../web/native-korean-save-source.js';
import {decodePortAssets} from '../web/port-map.js';
import {parsePortDoors,PortWalkingRuntime} from '../web/town.js';
import {parseKoreanPortTable} from '../web/binary.js';
import {openNativeSaveSession,syncNativeTownSession}
 from '../web/native-save-session.js';
import {saveNativeTownCheckpoint,loadNativeTownCheckpoint}
 from '../web/native-town-checkpoint.js';
// User-owned Korean original assets stay outside GitHub. This validates
// original source bytes -> native walking -> browser-only checkpoint -> restore.
// It is NOT original DOS Save Data write or DOS VGA/CPU equivalence.
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const raw=n=>{const b=fs.readFileSync(join(dir,n));
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
const originalBuffer=raw('KOUKAI2.DAT');
const source=await readVerifiedKoreanSaveSource(new Uint8Array(originalBuffer));
const slot=source.slots[1];
const session=openNativeSaveSession(slot);
const assets=decodePortAssets(raw('PORTCHIP.LZW'),raw('PORTMAP.LZW'),raw('CHIP_NO.DAT'));
const doors=parsePortDoors(raw('ZA_DAT.DAT'));
const ports=parseKoreanPortTable(originalBuffer,slot.raw.page);
const walker=new PortWalkingRuntime(session,assets,doors);
assert.equal(walker.move('right').moved,true);
assert.equal(syncNativeTownSession(session,walker.snapshot(),assets).updated,true);
const storageMap=new Map(),storage={
 getItem:k=>storageMap.get(k)??null,
 setItem:(k,v)=>storageMap.set(k,v)
};
const deps={storage,sourceSha256:source.sourceSha256,
 sourceSlots:source.slots,portAssets:assets,portCatalog:ports};
const stored=await saveNativeTownCheckpoint({
 ...deps,session,town:walker.snapshot()
});
assert.ok(stored.stored);
const recovered=await loadNativeTownCheckpoint(deps);
assert.equal(recovered.session.index,1);
assert.deepEqual(recovered.session.portState,session.portState);
assert.equal(recovered.session.money,session.money);
const next=new PortWalkingRuntime(recovered.session,assets,doors);
assert.deepEqual([next.mapX,next.mapY],[23,52]);
assert.deepEqual([slot.portState.mapX,slot.portState.mapY],[22,52]);
assert.equal(source.copyBytes().length,333551);
assert.equal(createHash('sha256').update(new Uint8Array(originalBuffer)).digest('hex'),
 source.sourceSha256);
console.log(JSON.stringify({result:'ORIGINAL_DANZIG_NATIVE_WEB_CHECKPOINT_RESTORE',
 sourceSha256:source.sourceSha256,slot:slot.index,originalX:22,
 restoredX:next.mapX,storedBytes:stored.bytes,
 boundary:'BROWSER_ONLY__ORIGINAL_DOS_SAVE_WRITE_UNTESTED'}));