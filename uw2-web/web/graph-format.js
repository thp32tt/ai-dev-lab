// KOEI Uncharted Waters II DOS GRAPH record decoder.
// Reconstructed from the shipped format and cross-checked against two independent
// reverse-engineering descriptions. A record stores four pixels per 16-bit unit.

export const UW2_APPROX_PALETTE = Object.freeze([
  [0,0,0], [0,65,211], [211,65,0], [243,65,195],
  [0,162,97], [0,162,243], [243,162,0], [243,227,211],
  [113,113,146], [162,162,195], [211,113,65], [0,97,195],
  [0,97,97], [113,81,97], [162,113,81], [0,65,178],
]);

function u16le(bytes, off) {
  return bytes[off] | (bytes[off + 1] << 8);
}
function u32be(bytes, off) {
  return (((bytes[off] << 24) >>> 0) |
          (bytes[off + 1] << 16) |
          (bytes[off + 2] << 8) |
          bytes[off + 3]) >>> 0;
}

export function readGraphOffsets(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  if (bytes.length < 4) throw new Error("GRAPH container too short");
  const first = u32be(bytes, 0);
  if (first < 4 || first > bytes.length || (first & 3) !== 0) {
    throw new Error(`invalid GRAPH first offset ${first}`);
  }
  const count = first >>> 2;
  const offsets = [];
  for (let i = 0; i < count; i++) offsets.push(u32be(bytes, i * 4));
  if (offsets[0] !== first) throw new Error("GRAPH first offset mismatch");
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] < first || offsets[i] > bytes.length) throw new Error("GRAPH offset outside container");
    if (i && offsets[i] <= offsets[i - 1]) throw new Error("GRAPH offsets are not strictly increasing");
  }
  return [...offsets, bytes.length];
}

export function readGraphRecords(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  const offsets = readGraphOffsets(bytes);
  return offsets.slice(0,-1).map((start,i)=>bytes.slice(start, offsets[i+1]));
}

function spreadLiteral(mode, value) {
  const lo = value & 0x0f;
  const hi = value >>> 4;
  switch (mode) {
    case 0x08: return lo | (hi << 4);       // planes 0,1
    case 0x10: return lo | (hi << 8);       // planes 0,2
    case 0x18: return lo | (hi << 12);      // planes 0,3
    case 0x20: return (lo << 4) | (hi << 8);// planes 1,2
    case 0x28: return (lo << 4) | (hi << 12);// planes 1,3
    case 0x30: return (lo << 8) | (hi << 12);// planes 2,3
    default: throw new Error(`unsupported GRAPH literal mode 0x${mode.toString(16)}`);
  }
}

function wordsToIndices(words, width, height, strideUnits) {
  const out = new Uint8Array(width * height);
  let p = 0;
  const groups = Math.ceil(width / 4);
  for (let y = 0; y < height; y++) {
    for (let g = 0; g < groups; g++) {
      const word = words[y * strideUnits + g];
      const planes = [
        word & 0x0f,
        (word >>> 4) & 0x0f,
        (word >>> 8) & 0x0f,
        (word >>> 12) & 0x0f,
      ];
      for (const bit of [3,2,1,0]) {
        if (p >= out.length) break;
        let color = 0;
        for (let plane = 0; plane < 4; plane++) color |= ((planes[plane] >>> bit) & 1) << plane;
        out[p++] = color;
      }
    }
  }
  return out;
}

export function decodeGraphRecord(record) {
  if (!(record instanceof Uint8Array)) record = new Uint8Array(record);
  if (record.length < 20) throw new Error("GRAPH record too short");
  const width = u16le(record,0);
  const height = u16le(record,2);
  if (width < 1 || width > 640 || height < 1 || height > 400 || (width & 3)) {
    throw new Error(`invalid GRAPH dimensions ${width}x${height}`);
  }
  const table=[];
  for(let i=0;i<8;i++) table.push(u16le(record,4+i*2));

  // The game's memory decoder uses the picture's own row stride. This is
  // equivalent to the screen decoder because commands never reference outside
  // the current picture rectangle.
  const stride = Math.ceil(width / 4);
  const words = new Uint16Array(stride * height);
  let pos=20;

  for(let row=0;row<height;row++){
    let out=row*stride;
    let remaining=stride;
    while(remaining>0){
      if(pos>=record.length) throw new Error(`GRAPH ended in row ${row}`);
      const cmd=record[pos++];
      if(cmd & 0x80){
        const count=(cmd & 0x0f)+1;
        const distance=((cmd >>> 4)&3)+1;
        if(count>remaining) throw new Error(`GRAPH copy overruns row ${row}`);
        let src=(cmd & 0x40) ? out-distance*stride : out-distance;
        if(src<0) throw new Error(`GRAPH copy before image at row ${row}`);
        for(let i=0;i<count;i++) words[out++]=words[src++];
        remaining-=count;
        continue;
      }

      const count=(cmd&7)+1;
      if(count>remaining) throw new Error(`GRAPH fill overruns row ${row}`);
      const mode=cmd & 0x78;
      let value;
      if(mode===0){
        value=0;
      }else if(cmd & 0x40){
        value=table[(mode >>> 3)&7];
      }else if(mode===0x38){
        if(pos+1>=record.length) throw new Error("GRAPH truncated literal word");
        value=(record[pos]<<8)|record[pos+1]; pos+=2;
      }else{
        if(pos>=record.length) throw new Error("GRAPH truncated literal byte");
        value=spreadLiteral(mode,record[pos++]);
      }
      for(let i=0;i<count;i++) words[out++]=value;
      remaining-=count;
    }
  }

  if(pos!==record.length){
    throw new Error(`GRAPH consumed ${pos}/${record.length} bytes`);
  }
  return {width,height,table,indices:wordsToIndices(words,width,height,stride)};
}

export function graphIndicesToRgba(indices,palette=UW2_APPROX_PALETTE){
  const rgba=new Uint8ClampedArray(indices.length*4);
  for(let i=0;i<indices.length;i++){
    const c=palette[indices[i]] || [0,0,0], p=i*4;
    rgba[p]=c[0];rgba[p+1]=c[1];rgba[p+2]=c[2];rgba[p+3]=255;
  }
  return rgba;
}

export function drawGraphImage(canvas,image,scale=1,palette=UW2_APPROX_PALETTE){
  canvas.width=image.width; canvas.height=image.height;
  canvas.style.width=`${image.width*scale}px`;
  canvas.style.height=`${image.height*scale}px`;
  const ctx=canvas.getContext("2d"); ctx.imageSmoothingEnabled=false;
  ctx.putImageData(new ImageData(graphIndicesToRgba(image.indices,palette),image.width,image.height),0,0);
}