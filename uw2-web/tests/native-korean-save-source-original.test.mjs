import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {readVerifiedKoreanSaveSource,KOREAN_REFERENCE_SAVE}
 from '../web/native-korean-save-source.js';
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const b=fs.readFileSync(join(root,'KOUKAI2.DAT'));
const file=await readVerifiedKoreanSaveSource(b);
assert.equal(file.sourceSha256,KOREAN_REFERENCE_SAVE.sha256);
assert.equal(file.byteLength,333551);
assert.equal(file.slots.filter(x=>!x.empty).length,2);
assert.deepEqual(file.slots[1].portState,{
 viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52
});
assert.equal(file.portCatalog.length,130);
assert.equal(file.portCatalog[39].name,'단치히');
assert.equal(file.portCatalog[39].x,288);
assert.equal(file.portCatalog[39].y,240);
assert.ok(Object.isFrozen(file.slots[1].portState));
const originalMoney=file.slots[1].money;
const copy=structuredClone(file.slots[1]);
copy.money=0;copy.portState.viewX=12;
assert.equal(file.slots[1].money,originalMoney);
assert.equal(file.slots[1].portState.viewX,10);
console.log(JSON.stringify({
 result:'ORIGINAL_KOREAN_KOUKAI2_NATIVE_SOURCE_SLOTS_PINNED',
 sourceSha256:file.sourceSha256,sourceBytes:file.byteLength,
 slots:file.slots.length,nonempty:2,ports:file.portCatalog.length,
 boundary:'SOURCE_READ_ONLY__NO_DOS_SAVE_WRITE'
}));
