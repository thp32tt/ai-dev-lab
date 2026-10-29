// LS11 decompressor for KOEI resource containers.
// Format facts cross-checked against shipped KAO.LZW and public koei_viewer documentation.
function u32be(view, off) {
  return view.getUint32(off, false);
}

class BitReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.bytePos = 0;
    this.bitPos = 7;
  }

  bit() {
    if (this.bytePos >= this.bytes.length) {
      throw new Error("LS11 compressed bitstream ended early");
    }
    const value = (this.bytes[this.bytePos] >> this.bitPos) & 1;
    if (--this.bitPos < 0) {
      this.bitPos = 7;
      this.bytePos++;
    }
    return value;
  }

  code() {
    let prefix = 0;
    let count = 0;
    let bit;
    do {
      bit = this.bit();
      prefix = (prefix << 1) | bit;
      count++;
    } while (bit === 1);

    let suffix = 0;
    for (let i = 0; i < count; i++) {
      suffix = (suffix << 1) | this.bit();
    }
    return prefix + suffix;
  }
}

export function inspectLS11(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 284) throw new Error("LS11 file is too short");
  const magic = new TextDecoder("ascii").decode(bytes.subarray(0, 4));
  if (magic !== "LS11" && magic !== "LS10") {
    throw new Error(`unsupported KOEI LZ magic: ${JSON.stringify(magic)}`);
  }

  const view = new DataView(arrayBuffer);
  const entries = [];
  for (let pos = 16 + 256; pos + 12 <= bytes.length; pos += 12) {
    const compSize = u32be(view, pos);
    const uncompSize = u32be(view, pos + 4);
    const offset = u32be(view, pos + 8);
    if (compSize === 0) break;
    if (offset + compSize > bytes.length) {
      throw new Error(`LS11 FAT entry points outside file at 0x${pos.toString(16)}`);
    }
    entries.push({ compSize, uncompSize, offset });
  }
  return { magic, dictionary: bytes.slice(16, 272), entries };
}

function decodeEntry(compressed, dictionary, outSize) {
  const output = new Uint8Array(outSize);
  const bits = new BitReader(compressed);
  let outPos = 0;

  while (outPos < outSize) {
    const code = bits.code();
    if (code < 256) {
      output[outPos++] = dictionary[code];
      continue;
    }

    const distance = code - 256;
    if (distance <= 0 || distance > outPos) {
      throw new Error(`invalid LS11 back-reference distance ${distance} at output ${outPos}`);
    }
    const length = bits.code() + 3;
    for (let i = 0; i < length && outPos < outSize; i++) {
      output[outPos] = output[outPos - distance];
      outPos++;
    }
  }
  return output;
}

export function decodeLS11(arrayBuffer, maxEntries = Infinity) {
  const bytes = new Uint8Array(arrayBuffer);
  const info = inspectLS11(arrayBuffer);
  const decoded = [];
  const limit = Math.min(info.entries.length, maxEntries);

  for (let i = 0; i < limit; i++) {
    const e = info.entries[i];
    const comp = bytes.slice(e.offset, e.offset + e.compSize);
    const data = e.compSize === e.uncompSize
      ? comp.slice()
      : decodeEntry(comp, info.dictionary, e.uncompSize);
    decoded.push({ ...e, data });
  }
  return { ...info, decoded };
}