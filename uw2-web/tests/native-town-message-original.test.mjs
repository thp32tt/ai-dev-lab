import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';import {join} from 'node:path';
import {parseKoreanPortTable,parseOffsetTextTable} from '../web/binary.js';
import {townPersonMessageId} from '../web/town.js';
const root=process.env.UW2_GAME_DIR||'/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=(n,sha)=>{const b=fs.readFileSync(join(root,n));
 assert.equal(createHash('sha256').update(b).digest('hex'),sha,n+' source SHA');
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const save=original('KOUKAI2.DAT','ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9');
const msg=original('MESSAGE.DAT','7003f3224195b791ff226999bd55c01e5ee95398aaedfbf1fa8f2ac8edcb6a2d');
const ports=parseKoreanPortTable(save),messages=parseOffsetTextTable(msg);
assert.equal(ports.length,130);assert.equal(messages.length,1179);
for(let id=0;id<100;id++){
 const hit=townPersonMessageId({port:id,portCatalogId:id},{slot:0});
 assert.equal(hit,0x282+id);
 assert.ok(messages[hit]?.text?.trim(),'ordinary port message '+id);
}
for(let id=100;id<130;id++){
 assert.equal(ports[id].mapId,100);
 assert.equal(townPersonMessageId({port:100,portCatalogId:id},{slot:0}),null);
}
assert.equal(messages[681].text.includes('어육'),true);
assert.equal(messages[742].text.includes('헤클라'),false);
console.log(JSON.stringify({result:'ORIGINAL_KOREAN_NPC_PORT_LORE_BOUNDS',messageCount:messages.length,ordinary:100,supplyHOLD:30,source:'KOUKAI2.DAT + MESSAGE.DAT SHA256',boundary:'DOES_NOT_REVERSE_ENGINEER_SUPPLY_NPC_DIALOGUE'}));