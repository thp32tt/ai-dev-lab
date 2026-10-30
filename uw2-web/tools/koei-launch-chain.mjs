#!/usr/bin/env node
// P1 static chain for Korean KOEI.COM's own DOS EXEC launch sequence.
// All offsets are COM *file raw* positions; runtime addresses add PSP+0x100.
// No memory-state/runtime claim is inferred from this structure alone.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const ORIGINAL_KOEI_LAUNCH_SITES=Object.freeze([
  {name:'FMDRV.COM',stringRaw:0x13,movDxRaw:0x254,nearCallRaw:0x257},
  {name:'OPEN.EXE', stringRaw:0x1d,movDxRaw:0x25f,nearCallRaw:0x262},
  {name:'MAIN.EXE', stringRaw:0x26,movDxRaw:0x269,nearCallRaw:0x26c},
  {name:'END.EXE',  stringRaw:0x2f,movDxRaw:0x277,nearCallRaw:0x27a},
]);

function u16(bytes,at) {if(at<0||at+2>bytes.length)throw Error('KOEI instruction out of range');return bytes.readUInt16LE(at);}
function signed16(n) {return n&0x8000?n-0x10000:n;}
function expectByte(bytes,at,value,label) {
  if(bytes[at]!==value)throw Error(`KOEI ${label} at raw 0x${at.toString(16)} fails exact opcode/flow check`);
}
export function verifyKoeiLaunchChain(bytes,{expectedSha256=null}={}) {
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  if(expectedSha256&&sha256!==expectedSha256)throw Error('KOEI.COM SHA-256 mismatch');
  if(bytes.length!==776)throw Error('KOEI.COM original length is not 776 bytes');
  // Shared DOS EXEC wrapper performs AX=4B00h then INT 21h, then AH=4Dh exit-status query.
  expectByte(bytes,0x115,0x52,'EXEC wrapper push DX');
  expectByte(bytes,0x11d,0xb8,'MOV AX,4B00');
  if(u16(bytes,0x11e)!==0x4b00)throw Error('KOEI DOS EXEC 4B00h missing');
  expectByte(bytes,0x120,0xcd,'EXEC INT');expectByte(bytes,0x121,0x21,'EXEC INT21');
  expectByte(bytes,0x125,0xb4,'MOV AH,4D');expectByte(bytes,0x126,0x4d,'DOS exit status');
  expectByte(bytes,0x127,0xcd,'EXIT INT');expectByte(bytes,0x128,0x21,'EXIT INT21');
  expectByte(bytes,0,0xe9,'COM entry JMP rel16');
  const entryRaw=3+signed16(u16(bytes,1));
  if(entryRaw!==0x292)throw Error('KOEI original entry offset mismatch');
  const launches=ORIGINAL_KOEI_LAUNCH_SITES.map(site=>{
    const text=bytes.subarray(site.stringRaw,site.stringRaw+site.name.length).toString('ascii');
    if(text!==site.name||bytes[site.stringRaw+site.name.length]!==0)throw Error(`KOEI filename mismatch: ${site.name}`);
    expectByte(bytes,site.movDxRaw,0xba,`${site.name} MOV DX,imm16`);
    const dx=u16(bytes,site.movDxRaw+1);
    if(dx!==site.stringRaw+0x100)throw Error(`KOEI bad PSP pointer to ${site.name}`);
    expectByte(bytes,site.nearCallRaw,0xe8,`${site.name} near EXEC wrapper call`);
    const displacement=signed16(u16(bytes,site.nearCallRaw+1));
    const targetRaw=site.nearCallRaw+3+displacement;
    if(targetRaw!==0x115)throw Error(`KOEI ${site.name} does not call proven EXEC wrapper`);
    return {file:site.name,stringRaw:site.stringRaw,pspFilenameOffset:dx,
      movDxRaw:site.movDxRaw,callRaw:site.nearCallRaw,wrapperRaw:targetRaw};
  });
  // Explicit post-OPEN and post-MAIN return-status guards in the original code.
  const exactGuards=[
    [0x265,0x0a],[0x266,0xe4],[0x267,0x75],[0x268,0x16],
    [0x26f,0x0a],[0x270,0xe4],[0x271,0x75],[0x272,0x0c],
    [0x273,0x0a],[0x274,0xc0],[0x275,0x74],[0x276,0x0b],
  ];
  for(const [offset,opcode] of exactGuards)expectByte(bytes,offset,opcode,'post-execution condition');
  return {
    sha256,format:'DOS-COM',size:bytes.length,
    entryRaw,entryPsp:entryRaw+0x100,
    execWrapper:{raw:0x115,pspOffset:0x215,dosService:'INT 21h AX=4B00h',returnStatus:'INT 21h AH=4Dh'},
    orderedStaticLaunchSites:launches,
    conditions:[
      {source:'after OPEN.EXE',raw:0x265,bytesSemantic:'OR AH,AH / JNZ +16h',meaning:'if returned AH is nonzero skip MAIN path'},
      {source:'after MAIN.EXE',raw:0x26f,bytesSemantic:'OR AH,AH / JNZ +0Ch',meaning:'if returned AH is nonzero skip END launch'},
      {source:'after MAIN.EXE',raw:0x273,bytesSemantic:'OR AL,AL / JZ +0Bh',meaning:'if returned AL is zero skip END launch'}
    ],
    caveat:'Static original-byte proof of callsites and guards, not a captured DOS runtime trace or proof that every branch executes'
  };
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const file=process.argv[2];
  if(!file){process.stderr.write('Usage: node tools/koei-launch-chain.mjs <original KOEI.COM>\n');process.exitCode=2;}
  else try{
    const baseline=JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../docs/original-baseline-20261031.json'),'utf8'));
    const pin=baseline.coreExecutables.find(x=>x.name==='KOEI.COM');
    const result=verifyKoeiLaunchChain(fs.readFileSync(file),{expectedSha256:pin.sha256});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
