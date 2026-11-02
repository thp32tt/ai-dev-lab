// Read-only Korean MAIN.EXE Start New Game source-path witness.
// Not a DOS emulator, not a new-game initializer and NEVER shipping app JS.
import fs from 'node:fs';
import {createHash} from 'node:crypto';

export const MAIN_NEW_GAME_SOURCE_SHA256=
 '1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747';
export const MAIN_NEW_GAME_SOURCE_SIZE=288823;
const FLOW=Object.freeze([
 Object.freeze({at:0x1b62f,to:0x1af96,role:'original-hero-person-pointer'}),
 Object.freeze({at:0x1b65f,to:0x1b533,role:'unclassified-initializer-1'}),
 Object.freeze({at:0x1b663,to:0x1b5c9,role:'unclassified-initializer-2'}),
 Object.freeze({at:0x1b667,to:0x1b4f9,role:'unclassified-initializer-3'}),
 Object.freeze({at:0x1b66b,to:0x1b49b,role:'unclassified-initializer-4'})
]);
const BOUND=Object.freeze([
 // At raw 1B62x: near source accesses and 16-bit branch destinations.
 Object.freeze({at:0x1b632,hex:'8b1edac6804f2901',meaning:'source-person-dependent flag'}),
 Object.freeze({at:0x1b642,hex:'8b1e7ac6884723',meaning:'returned-original-value-write'}),
 Object.freeze({at:0x1b649,hex:'8b1edac68a4726a23a0c',meaning:'source-port-context-from-memory'}),
 Object.freeze({at:0x1b658,hex:'8bd8804f1350',meaning:'source-status-bit-update'}),
 Object.freeze({at:0x1b679,hex:'c746fc00002bf68e46fe',meaning:'zero-init-offset-then-load-ES'}),
 Object.freeze({at:0x1b683,hex:'8b5efc26c607ffff46fc4681fe00037cef',
   meaning:'exact-ES-zero-to-767-fill-FF-loop'})
]);
function exact(bytes,at,hex){
 const expected=Buffer.from(hex,'hex');
 return at>=0&&at+expected.length<=bytes.length&&
  Buffer.compare(bytes.subarray(at,at+expected.length),expected)===0;
}
export function inspectOriginalNewGameInit(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==MAIN_NEW_GAME_SOURCE_SIZE)
  throw new Error('original Korean MAIN.EXE size mismatch');
 for(const b of BOUND)if(!exact(bytes,b.at,b.hex))
  throw new Error('original Korean MAIN.EXE new game state witness mismatch at '+b.at.toString(16));
 for(const c of FLOW){
  if(bytes[c.at]!==0xe8)throw new Error('original near-call opcode mismatch');
  const displacement=bytes.readInt16LE
   ?bytes.readInt16LE(c.at+1)
   :((bytes[c.at+1]|bytes[c.at+2]<<8)<<16)>>16;
  const target=c.at+3+displacement;
  if(target!==c.to)throw new Error('original new-game target mismatch at '+c.at.toString(16));
 }
 // 0x0300 * 0xFF loop is proven, but its SEGMENT is returned by a
 // source callback. Without its live DS/ES state it cannot be used as a
 // fabricated starting fleet, port or historical game clock.
 return Object.freeze({
  entryRaw:0x1b627,
  calls:Object.freeze(FLOW.map(c=>({...c}))),
  initializationFill:Object.freeze({length:0x300,value:0xff,
    destination:'runtime-segment-from-original-call__unresolved'}),
  originalPortSource:Object.freeze({dsOffset:0x0c3a,
    from:'pointer-at-DS:C6DA + 0x26',
    classification:'source-pointer-runtime-dependent'}),
  freshHeroStateReady:false,
  unresolved:Object.freeze(['original-initial-DSES-state',
   'callee-side-effects','starting-port','starting-fleet','starting-game-clock',
   'initial-story-state']),
  status:'ORIGINAL_MAIN_NEW_GAME_CALLS_PROVEN__FRESH_GAME_UNTESTED'
 });
}
export function verifyOriginalNewGameInit(bytes){
 const checksum=createHash('sha256').update(bytes).digest('hex');
 if(checksum!==MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('original Korean MAIN.EXE SHA-256 mismatch');
 return Object.freeze({sha256:checksum,...inspectOriginalNewGameInit(bytes)});
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];
 if(!file){console.error('Usage: node original-new-game-init-proof.mjs /path/to/MAIN.EXE');process.exitCode=2;}
 else try{
  const result=verifyOriginalNewGameInit(fs.readFileSync(file));
  console.log(JSON.stringify(result,null,2));
 }catch(error){console.error(String(error));process.exitCode=1;}
}
