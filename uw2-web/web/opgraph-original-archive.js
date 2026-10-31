// Original Korean OPEN.EXE OPGRAPH archive: SHA-pinned, read-only DOS
// resource and bounded LS11+GRAPH decoding in one explicit evidence path.
// This is the existing JS format decoder, NOT a claim that ORIGINAL OPEN.EXE
// native unpacker/video output has passed byte- or frame-parity validation.
import {preparePinnedDosReadOnlyResources} from './pinned-dos-resources.js';
import {inspectLS11,decodeLS11} from './ls11.js';
import {readGraphOffsets} from './graph-format.js';

const DEFAULT_MAX_FILE_BYTES=16*1024*1024;
const DEFAULT_MAX_PART_BYTES=8*1024*1024;
const DEFAULT_MAX_TOTAL_DECODED=64*1024*1024;
const ORIGINAL_PATH='C:OPGRAPH.LZW';
const uint=(v,label,min,max)=>{
  if(!Number.isSafeInteger(v)||v<min||v>max)
    throw new RangeError(label+' must be a bounded integer');
  return v;
};
const lowerSha=hash=>typeof hash==='string'&&/^[0-9a-f]{64}$/.test(hash);
export async function prepareOriginalOpgraphArchive(original,{
  expectedSha256,
  maxFileBytes=DEFAULT_MAX_FILE_BYTES,
  maxPartBytes=DEFAULT_MAX_PART_BYTES,
  maxTotalDecodedBytes=DEFAULT_MAX_TOTAL_DECODED,
  expectedPartCount
}={}){
  if(!(original instanceof Uint8Array))
    throw new TypeError('OPGRAPH requires owner-supplied original Uint8Array');
  if(!lowerSha(expectedSha256))
    throw new Error('OPGRAPH requires explicit lowercase SHA-256');
  uint(maxFileBytes,'OPGRAPH max file bytes',1,64*1024*1024);
  uint(maxPartBytes,'OPGRAPH max part bytes',1,64*1024*1024);
  uint(maxTotalDecodedBytes,'OPGRAPH max total decoded',1,256*1024*1024);
  if(expectedPartCount!==undefined)
    uint(expectedPartCount,'OPGRAPH expected part count',1,1024);
  if(original.length>maxFileBytes)
    throw new RangeError('OPGRAPH original archive exceeds configured byte budget');
  // Hash-verification precedes any archive decode or guest resource publication.
  const resources=await preparePinnedDosReadOnlyResources([{
    dosPath:ORIGINAL_PATH,bytes:original,expectedSha256
  }],{maxTotalBytes:maxFileBytes});
  const pathname=Uint8Array.from(ORIGINAL_PATH,c=>c.charCodeAt(0));
  const trusted=resources.resolve({filename:ORIGINAL_PATH,raw:pathname}).bytes;
  const buffer=trusted.buffer.slice(trusted.byteOffset,trusted.byteOffset+trusted.byteLength);
  const header=inspectLS11(buffer);
  if(header.magic!=='LS11')
    throw new Error('original Korean OPGRAPH requires LS11 archive magic');
  if(expectedPartCount!==undefined&&header.entries.length!==expectedPartCount)
    throw new Error('OPGRAPH original part count mismatched specified reference');
  let totalDecoded=0;
  for(const entry of header.entries){
    uint(entry.compSize,'OPGRAPH compressed part size',1,maxFileBytes);
    uint(entry.uncompSize,'OPGRAPH unpacked part size',1,maxPartBytes);
    uint(entry.offset,'OPGRAPH source part offset',0,maxFileBytes);
    if(entry.offset+entry.compSize>trusted.length)
      throw new Error('OPGRAPH LS11 compressed part exceeds file extent');
    totalDecoded+=entry.uncompSize;
    if(totalDecoded>maxTotalDecodedBytes)
      throw new RangeError('OPGRAPH total decoded byte budget exceeded');
  }
  const archive=decodeLS11(buffer);
  if(archive.decoded.length!==header.entries.length)
    throw new Error('OPGRAPH LS11 decoded part count differs from verified header');
  const parts=archive.decoded.map((entry,index)=>{
    if(!(entry.data instanceof Uint8Array)||entry.data.length!==entry.uncompSize)
      throw new Error('OPGRAPH decoded part length mismatches original header');
    const offsets=readGraphOffsets(entry.data);
    if(offsets.length<2)
      throw new Error('OPGRAPH decoded GRAPH record table is empty');
    return {
      metadata:Object.freeze({index,compSize:entry.compSize,
        uncompSize:entry.uncompSize,offset:entry.offset,
        recordCount:offsets.length-1}),
      bytes:Uint8Array.from(entry.data),
      offsets:offsets.slice()
    };
  });
  const partMetadata=Object.freeze(parts.map(x=>x.metadata));
  return Object.freeze({
    dosPath:ORIGINAL_PATH,sourceSha256:expectedSha256,
    fileBytes:trusted.length,magic:header.magic,
    partCount:parts.length,totalDecodedBytes:totalDecoded,
    totalRecords:parts.reduce((sum,x)=>sum+x.metadata.recordCount,0),
    parts:partMetadata,
    fidelity:'SHA_PINNED_JS_LS11_GRAPH_DECODE__NATIVE_OPEN_DECOMPRESS_PARITY_UNTESTED',
    resolveDosFile(request){return resources.resolve(request);},
    getDecodedPart(index){
      uint(index,'OPGRAPH part index',0,parts.length-1);
      const p=parts[index];
      return Object.freeze({
        metadata:p.metadata,
        bytes:Uint8Array.from(p.bytes),
        offsets:Object.freeze(p.offsets.slice())
      });
    },
    getGraphRecord(partIndex,recordIndex){
      uint(partIndex,'OPGRAPH part index',0,parts.length-1);
      const p=parts[partIndex];
      uint(recordIndex,'OPGRAPH GRAPH record index',0,p.metadata.recordCount-1);
      return Uint8Array.from(p.bytes.subarray(p.offsets[recordIndex],p.offsets[recordIndex+1]));
    }
  });
}
