const cp949 = new TextDecoder("euc-kr");

export function decodeCString(bytes, start, maxLength = bytes.length - start) {
  const endLimit = Math.min(bytes.length, start + maxLength);
  let end = start;
  while (end < endLimit && bytes[end] !== 0) end++;
  return cp949.decode(bytes.subarray(start, end)).replace(/\0+$/g, "");
}

export function stripMenuControls(text) {
  return text.replace(/[\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim();
}

export function parseOffsetTextTable(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 2) return [];
  const firstOffset = (bytes[0] << 8) | bytes[1];
  if (firstOffset < 2 || firstOffset > bytes.length || firstOffset % 2 !== 0) {
    throw new Error("invalid big-endian 16-bit string table");
  }
  const count = firstOffset / 2;
  const out = [];
  for (let i = 0; i < count; i++) {
    const off = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
    if (off >= bytes.length) {
      out.push({ index: i, offset: off, text: "" });
      continue;
    }
    out.push({ index: i, offset: off, text: decodeCString(bytes, off) });
  }
  return out;
}

export const SAVE = Object.freeze({
  PAGE_SIZE: 33340,
  HEADER_BASE: 1,
  INIT_SIZE: 15,
  MONEY: 0x06a1,
  HERO_ID: 0x06a8,
  PERSON: 0x06a9,
  PERSON_SIZE: 50,
  PORT: 0x53bf,
  PORT_SIZE: 20,
  ABILITY: [0x064d, 0x065b, 0x0669, 0x0677, 0x0685, 0x0693],
});

function u16le(view, off) { return view.getUint16(off, true); }
function u32le(view, off) { return view.getUint32(off, true); }

export function parseSaveSlots(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const slots = [];

  for (let i = 0; i < 10; i++) {
    const init = SAVE.HEADER_BASE + i * SAVE.INIT_SIZE;
    const memo = decodeCString(bytes, init, 12);
    if (!memo) {
      slots.push({ index: i, empty: true, memo: "" });
      continue;
    }

    const page = i * SAVE.PAGE_SIZE;
    const port = bytes[init + 12];
    const ending = bytes[init + 13] !== 0;
    const heroId = bytes[page + SAVE.HERO_ID];
    const personBase = page + SAVE.PERSON + heroId * SAVE.PERSON_SIZE;
    const fname = decodeCString(bytes, personBase, 13);
    const lname = decodeCString(bytes, personBase + 13, 13);
    const portName = port === 0xff
      ? "해상"
      : decodeCString(bytes, page + SAVE.PORT + port * SAVE.PORT_SIZE, 15);

    const abilityBase = page + (SAVE.ABILITY[heroId] ?? SAVE.ABILITY[0]);
    slots.push({
      index: i,
      empty: false,
      memo,
      port,
      portName,
      ending,
      heroId,
      heroName: [fname, lname].filter(Boolean).join(" "),
      portraitIdCandidate: bytes[personBase + 26],
      money: u32le(view, page + SAVE.MONEY),
      tradeFame: u16le(view, abilityBase),
      pirateFame: u16le(view, abilityBase + 2),
      adventureFame: u16le(view, abilityBase + 4),
      raw: { page, personBase, abilityBase },
    });
  }
  return slots;
}