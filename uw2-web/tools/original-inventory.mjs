#!/usr/bin/env node
// Read-only structural inventory for the user's original Korean DOS game.
// No original bytes, derived audio or graphics are written to GitHub.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { UW2_EVIDENCE_FILES } from '../web/reverse-evidence.js';

const REQUIRED_CORE = Object.freeze(['KOEI.COM', 'OPEN.EXE', 'MAIN.EXE', 'END.EXE', 'GRPDRV.EXE', 'FMDRV.COM']);
const PINNED = Object.freeze(Object.fromEntries(
  Object.values(UW2_EVIDENCE_FILES).map(x => [x.name.toUpperCase(), { size:x.size, sha256:x.sha256 }])
));

export function parseMzHeader(bytes, filename = '<memory>') {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length < 28 || bytes.readUInt16LE(0) !== 0x5a4d) {
    throw new Error(`${filename}: DOS MZ header absent or truncated`);
  }
  const lastPage = bytes.readUInt16LE(2);
  const pages = bytes.readUInt16LE(4);
  const relocCount = bytes.readUInt16LE(6);
  const headerParagraphs = bytes.readUInt16LE(8);
  const ss = bytes.readUInt16LE(14);
  const sp = bytes.readUInt16LE(16);
  const ip = bytes.readUInt16LE(20);
  const cs = bytes.readUInt16LE(22);
  const relocationTableOffset = bytes.readUInt16LE(24);
  if (!pages || lastPage > 511) throw new Error(`${filename}: invalid MZ page count/last-page bytes`);
  const declaredBytes = (pages-1)*512+(lastPage || 512);
  const headerBytes = headerParagraphs * 16;
  if (headerBytes < 28 || headerBytes > declaredBytes || declaredBytes > bytes.length) {
    throw new Error(`${filename}: MZ header/declared image overflows actual file`);
  }
  if (relocationTableOffset < 28 || relocationTableOffset + 4*relocCount > headerBytes) {
    throw new Error(`${filename}: MZ relocation table escapes header`);
  }
  const imageBytes = declaredBytes - headerBytes;
  const relocationTargets = [];
  for (let i=0; i<relocCount; i++) {
    const at = relocationTableOffset + i*4;
    const offset = bytes.readUInt16LE(at);
    const segment = bytes.readUInt16LE(at+2);
    const imageOffset = segment*16 + offset;
    if (imageOffset + 2 > imageBytes) {
      throw new Error(`${filename}: relocation ${i} points outside declared image`);
    }
    relocationTargets.push({segment,offset,imageOffset});
  }
  const entryImageOffset = cs*16 + ip;
  return {
    format:'MZ', headerBytes, declaredBytes, imageBytes,
    trailingBytes: bytes.length-declaredBytes,
    entry: {cs,ip,imageOffset:entryImageOffset,insideImage:entryImageOffset<imageBytes},
    stack: {ss,sp},
    memory: {minExtraParagraphs:bytes.readUInt16LE(10),maxExtraParagraphs:bytes.readUInt16LE(12)},
    relocationTableOffset,relocationCount:relocCount,relocationTargets,
    overlayNumber:bytes.readUInt16LE(26)
  };
}

export function classifyInstalledFile(name) {
  const upper=name.toUpperCase();
  if (REQUIRED_CORE.includes(upper)) return 'core-executable';
  if (['HORIEDIT.EXE','SIZER.COM','UNKOEI.EXE'].includes(upper)) return 'auxiliary-tool';
  if (/\.(EXE|COM)$/i.test(upper)) return 'unclassified-executable';
  if (/\.(DAT|LZW|MES|MML|FNT|TBL|PUT|16P)$/i.test(upper)) return 'game-data-or-resource';
  return 'other-or-auxiliary';
}

export function analyzeInstalledFile(filePath, expected = null) {
  const name=path.basename(filePath);
  const bytes=fs.readFileSync(filePath);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  const pinned=expected || PINNED[name.toUpperCase()] || null;
  const verification=pinned ? ((pinned.size===bytes.length && pinned.sha256===sha256)?'MATCH':'MISMATCH') : 'UNPINNED';
  const result={name,classification:classifyInstalledFile(name),size:bytes.length,sha256,verification};
  if (pinned) result.pinnedSha256=pinned.sha256;
  if (path.extname(name).toUpperCase()==='.EXE') {
    try { result.mz=parseMzHeader(bytes,name); }
    catch(error) { result.mzError=error.message; }
  } else if (path.extname(name).toUpperCase()==='.COM') {
    result.com={loadOffset:0x100,fileBytes:bytes.length,entryOffset:0x100,
      note:'COM loader layout only; no inferred program entry semantics'};
  }
  return result;
}

export function inventoryDirectory(dir) {
  const root=path.resolve(dir);
  const names=fs.readdirSync(root).filter(name=>fs.statSync(path.join(root,name)).isFile()).sort();
  const files=names.map(name=>analyzeInstalledFile(path.join(root,name)));
  const required=Object.values(UW2_EVIDENCE_FILES).map(x=>x.name);
  const missingPinned=required.filter(name=>!names.some(n=>n.toUpperCase()===name.toUpperCase()));
  const missingCore=REQUIRED_CORE.filter(name=>!names.some(n=>n.toUpperCase()===name));
  const mismatchedPinned=files.filter(x=>x.verification==='MISMATCH').map(x=>x.name);
  const invalidCoreExe=files.filter(x=>x.classification==='core-executable'&&x.mzError).map(x=>x.name);
  return {
    schema:1,purpose:'original-DOS read-only reverse-engineering provenance; not gameplay completion',
    inputScope:'single selected top-level game installation directory (no recursive copies)',
    checkedPinnedNames:required,files,
    summary:{
      fileCount:files.length,
      coreExecutableCount:files.filter(x=>x.classification==='core-executable').length,
      mzExecutableCount:files.filter(x=>x.mz).length,
      missingCore,invalidCoreExe,missingPinned,mismatchedPinned,
      gate:(missingCore.length||invalidCoreExe.length||missingPinned.length||mismatchedPinned.length)?'FAIL':'PASS',
      note:'PASS confirms only pinned known SHA files and required core presence, not authenticity of unpinned files or gameplay fidelity'
    }
  };
}

const isMain=process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const dir=process.argv[2] || process.env.UW2_GAME_DIR;
  if(!dir){process.stderr.write('Usage: node tools/original-inventory.mjs <local-game-directory> [--summary]\n');process.exitCode=2;}
  else try{
    const report=inventoryDirectory(dir);
    const display=process.argv.includes('--summary')?{
      schema:report.schema,summary:report.summary,
      files:report.files.map(({name,classification,size,sha256,verification,mz,com,mzError})=>({
        name,classification,size,sha256,verification,
        ...(mz?{mz:{declaredBytes:mz.declaredBytes,headerBytes:mz.headerBytes,imageBytes:mz.imageBytes,
          trailingBytes:mz.trailingBytes,entry:mz.entry,stack:mz.stack,relocationCount:mz.relocationCount,
          overlayNumber:mz.overlayNumber}}:{}),
        ...(com?{com}:{}),...(mzError?{mzError}:{})
      }))
    }:report;
    process.stdout.write(`${JSON.stringify(display,null,2)}\n`);
    if(report.summary.gate!=='PASS') process.exitCode=1;
  }catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
