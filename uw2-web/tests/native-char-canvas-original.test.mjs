import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {decodeKoreanChar,drawHeroSprite,drawFolkSprite} from '../web/char.js';
// Actual owner Korean original pixels; only source SHA/metrics are public.
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const bytes=fs.readFileSync(join(root,'CHAR.LZW'));
const hash=createHash('sha256').update(bytes).digest('hex');
assert.equal(hash,'f1d606475e653e87d5a3ddaf05523a1f59a1c70d16e5a4a3d6c6d513c6c4a537');
const chars=decodeKoreanChar(bytes.buffer.slice(
 bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
assert.equal(chars.heroes.length,6);
assert.equal(chars.folk.length,24);
const oldDoc=globalThis.document,oldImg=globalThis.ImageData,canvas=[];
globalThis.document={createElement:()=>{
 const c={width:0,height:0};
 c.getContext=()=>({putImageData:img=>{c.pixelData=Uint8ClampedArray.from(img.data);}});
 canvas.push(c);return c;
}};
globalThis.ImageData=class{constructor(data){this.data=data;}};
try{
 const draws=[];
 const ctx={drawImage:c=>draws.push(Uint8ClampedArray.from(c.pixelData))};
 const state={playerX:12,playerY:14,facing:'right',stepParity:0};
 for(let i=0;i<30;i++)drawHeroSprite(ctx,chars,0,state,16,16);
 assert.equal(canvas.length,1);
 assert.deepEqual(draws[0],chars.heroes[0][2]);
 drawFolkSprite(ctx,chars,16,0,0,16,16);
 assert.equal(canvas.length,2);
 assert.deepEqual(draws[30],chars.folk[16]);
 console.log(JSON.stringify({result:'ORIGINAL_KOREAN_CHAR_BROWSER_NATIVE_CANVAS_PIXEL_MATCH',
 sourceSha256:hash,heroFrames:chars.heroes.reduce((n,h)=>n+h.length,0),
 folkFrames:chars.folk.length,canvasCreated:canvas.length,drawCalls:draws.length,
 boundary:'SAME_SOURCE_JS_RGBA__NOT_REFERENCE_DOS_SPRITE_TIMING'}));
}finally{
 if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 if(oldImg===undefined)delete globalThis.ImageData;else globalThis.ImageData=oldImg;
}
