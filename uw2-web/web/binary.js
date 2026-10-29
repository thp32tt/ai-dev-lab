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


const KOR_FLEET = Object.freeze({
  SHIP1_ADDR: [0x2244,0x2776,0x31da,0x3c3e,0x370c,0x2ca8],
  SHIP1_SIZE: 9,
  SHIP2_ADDR: 0x4692,
  SHIP2_SIZE: 30,
  SHIP3_ADDR: 0x4c35,
  SHIP3_SIZE: 25,
  SHIP4_ADDR: 0x5291,
  SHIP4_SIZE: 12,
  SHIP5_ADDR: 0x501d,
  SHIP5_SIZE: 25,
});

function parseKoreanFleet(bytes, view, page, heroId) {
  const ships = [];
  const base1 = KOR_FLEET.SHIP1_ADDR[heroId] ?? KOR_FLEET.SHIP1_ADDR[0];
  for (let i=0;i<10;i++) {
    const s1=page+base1+i*KOR_FLEET.SHIP1_SIZE;
    const select=bytes[s1+7];
    if (select===0xff) break;
    const s2=page+KOR_FLEET.SHIP2_ADDR+i*KOR_FLEET.SHIP2_SIZE;
    const s3=page+KOR_FLEET.SHIP3_ADDR+select*KOR_FLEET.SHIP3_SIZE;
    const modelId=bytes[s3+18];
    if (modelId===0xff) break;
    const s4=page+KOR_FLEET.SHIP4_ADDR+modelId*KOR_FLEET.SHIP4_SIZE;
    const s5=page+KOR_FLEET.SHIP5_ADDR+modelId*KOR_FLEET.SHIP5_SIZE;
    ships.push({
      index:i,
      currentCrew:u16le(view,s1),
      currentHull:bytes[s1+2],
      maxHull:bytes[s1+3],
      rudder:bytes[s1+4],
      sail:bytes[s1+5],
      currentWeapons:bytes[s1+6],
      instanceId:select,
      weaponId:bytes[s1+8],
      captainId:bytes[s2],
      condition:bytes[s2+1],
      figurehead:bytes[s2+2],
      name:decodeCString(bytes,s3,14),
      modelId,
      battleForm:bytes[s3+19],
      maxWeapons:bytes[s3+20],
      maxCrew:u16le(view,s3+21),
      cargo:u16le(view,s3+23),
      modelName:decodeCString(bytes,s5,18),
      maxRudder:bytes[s4],
      maxSail:bytes[s4+1],
      maxCrew10:bytes[s4+2],
      requiredCrew:bytes[s4+3],
      capacity:u16le(view,s4+4),
      modelMaxWeapons:bytes[s4+6],
      seaForm:bytes[s5+18],
      modelBattleForm:bytes[s5+19],
    });
  }
  return {
    count:ships.length,
    totalCrew:ships.reduce((n,s)=>n+s.currentCrew,0),
    ships,
  };
}

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
    const year = 1501 + bytes[saveBase + 6];
    const month = 1 + bytes[saveBase + 7];
    const day = 1 + bytes[saveBase + 8];
    const timeTick = bytes[saveBase + 9];
    const viewX = u16le(view, saveBase + SAVE.VIEW_X);
    const viewY = u16le(view, saveBase + SAVE.VIEW_Y);
    const playerX = u16le(view, saveBase + SAVE.PLAYER_X);
    const playerY = u16le(view, saveBase + SAVE.PLAYER_Y);
    const fleet=parseKoreanFleet(bytes,view,page,heroId);
    slots.push({
      index: i,
      empty: false,
      memo,
      port,
      portName,
      portWorld,
      fleet,
      dateTime: {
        year, month, day, timeTick,
        hour: Math.floor(timeTick / 3),
        minute: (timeTick % 3) * 20,
      },
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