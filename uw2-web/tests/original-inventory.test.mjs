import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseMzHeader,classifyInstalledFile,analyzeInstalledFile,inventoryDirectory} from '../tools/original-inventory.mjs';

function fixtureMz({relocs=[{segment:0,offset:2}],imageLength=64,trailingLength=0,entryCS=0,entryIP=3}={}){
  const headerBytes=64,declared=headerBytes+imageLength;
  const pages=Math.ceil(declared/512),lastPage=declared%512;
  const bytes=Buffer.alloc(declared+trailingLength);
  bytes.writeUInt16LE(0x5a4d,0);
  bytes.writeUInt16LE(lastPage,2);
  bytes.writeUInt16LE(pages,4);
  bytes.writeUInt16LE(relocs.length,6);
  bytes.writeUInt16LE(headerBytes/16,8);
  bytes.writeUInt16LE(0x20,10);
  bytes.writeUInt16LE(0xffff,12);
  bytes.writeUInt16LE(0x12,14);
  bytes.writeUInt16LE(0x200,16);
  bytes.writeUInt16LE(entryIP,20);
  bytes.writeUInt16LE(entryCS,22);
  bytes.writeUInt16LE(0x1c,24);
  for(let i=0;i<relocs.length;i++){
    bytes.writeUInt16LE(relocs[i].offset,28+4*i);
    bytes.writeUInt16LE(relocs[i].segment,30+4*i);
  }
  return bytes;
}
const sample=fixtureMz({trailingLength:9});
const mz=parseMzHeader(sample);
assert.equal(mz.headerBytes,64);
assert.equal(mz.imageBytes,64);
assert.equal(mz.declaredBytes,128);
assert.equal(mz.trailingBytes,9);
assert.deepEqual(mz.entry,{cs:0,ip:3,imageOffset:3,insideImage:true});
assert.deepEqual(mz.stack,{ss:0x12,sp:0x200});
assert.deepEqual(mz.relocationTargets,[{segment:0,offset:2,imageOffset:2}]);
assert.equal(parseMzHeader(fixtureMz({imageLength:448})).declaredBytes,512);
assert.equal(parseMzHeader(fixtureMz({entryCS:4,entryIP:0})).entry.insideImage,false);
assert.throws(()=>parseMzHeader(Buffer.alloc(20)),/absent or truncated/);
assert.throws(()=>parseMzHeader(fixtureMz({relocs:[{segment:0x100,offset:0}]})),/outside declared image/);
const badHeader=Buffer.from(sample);badHeader.writeUInt16LE(0x40,8);
assert.throws(()=>parseMzHeader(badHeader),/overflows actual file/);
const badRelocTable=Buffer.from(sample);badRelocTable.writeUInt16LE(0x3f,24);
assert.throws(()=>parseMzHeader(badRelocTable),/escapes header/);
const badPages=Buffer.from(sample);badPages.writeUInt16LE(0,4);
assert.throws(()=>parseMzHeader(badPages),/page count/);
const badDeclared=Buffer.from(sample);badDeclared.writeUInt16LE(511,2);badDeclared.writeUInt16LE(9,4);
assert.throws(()=>parseMzHeader(badDeclared),/overflows actual file/);
assert.equal(classifyInstalledFile('MAIN.EXE'),'core-executable');
assert.equal(classifyInstalledFile('HORIEDIT.EXE'),'auxiliary-tool');
assert.equal(classifyInstalledFile('SNR6.MES'),'game-data-or-resource');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'uw2-mz-'));
try{
  fs.writeFileSync(path.join(dir,'DUMMY.EXE'),fixtureMz());
  fs.writeFileSync(path.join(dir,'DUMMY.COM'),Buffer.from([0xb8,0,0,0xcd,0x20]));
  const exe=analyzeInstalledFile(path.join(dir,'DUMMY.EXE'));
  assert.equal(exe.verification,'UNPINNED');
  assert.equal(exe.mz.entry.ip,3);
  assert.equal(exe.sha256,crypto.createHash('sha256').update(fixtureMz()).digest('hex'));
  assert.equal(analyzeInstalledFile(path.join(dir,'DUMMY.COM')).com.entryOffset,0x100);
  assert.equal(analyzeInstalledFile(path.join(dir,'DUMMY.COM'),{size:5,sha256:'0'.repeat(64)}).verification,'MISMATCH');
  const report=inventoryDirectory(dir);
  assert.equal(report.summary.fileCount,2);
  assert.equal(report.summary.gate,'FAIL');
  assert.ok(report.summary.missingCore.includes('MAIN.EXE'));
  assert.ok(report.summary.missingPinned.includes('OPEN.EXE'));
  assert.equal(report.files.find(f=>f.name==='DUMMY.EXE').mz.imageBytes,64);
}finally{fs.rmSync(dir,{force:true,recursive:true});}
console.log('UW2 P0 original DOS MZ/COM inventory fixture and fail-closed gates: PASS');
