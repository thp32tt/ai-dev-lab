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
  SLOT_DATA_BASE: 0x97,
  VIEW_X: 0x10,
  VIEW_Y: 0x12,
  PLAYER_X: 0x14,
  PLAYER_Y: 0x16,
  MONEY: 0x06a1,
  HERO_ID: 0x06a8,
  PERSON: 0x06a9,
  PERSON_SIZE: 50,
  PORT_TABLE: 0x53ba,
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
    const portRecord = port === 0xff ? -1 : page + SAVE.PORT_TABLE + port * SAVE.PORT_SIZE;
    const portName = port === 0xff
      ? "해상"
      : decodeCString(bytes, portRecord + 5, 15);
    const portWorld = port === 0xff ? null : {
      nation: bytes[portRecord],
      x: u16le(view, portRecord + 1),
      y: u16le(view, portRecord + 3),
    };

    const abilityBase = page + (SAVE.ABILITY[heroId] ?? SAVE.ABILITY[0]);
    const saveBase = page + SAVE.SLOT_DATA_BASE;
    const viewX = u16le(view, saveBase + SAVE.VIEW_X);
    const viewY = u16le(view, saveBase + SAVE.VIEW_Y);
    const playerX = u16le(view, saveBase + SAVE.PLAYER_X);
    const playerY = u16le(view, saveBase + SAVE.PLAYER_Y);
    slots.push({
      index: i,
      empty: false,
      memo,
      port,
      portName,
      portWorld,
      ending,
      heroId,
      heroName: [fname, lname].filter(Boolean).join(" "),
      portraitIdCandidate: bytes[personBase + 26],
      money: u32le(view, page + SAVE.MONEY),
      tradeFame: u16le(view, abilityBase),
      pirateFame: u16le(view, abilityBase + 2),
      adventureFame: u16le(view, abilityBase + 4),
      portState: {
        viewX, viewY, playerX, playerY,
        mapX: viewX + playerX,
        mapY: viewY + playerY,
      },
      raw: { page, saveBase, personBase, abilityBase },
    });
  }
  return slots;
}