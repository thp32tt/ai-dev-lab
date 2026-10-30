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

export function stripUw2MessageControls(text) {
  return String(text ?? "")
    // Korean DOS MESSAGE.DAT uses three-byte display controls such as
    // ESC C6, ESC F4 and ESC B7. They affect color/font state but have no
    // printable width. Remove the complete command, not only ESC+opcode.
    .replace(/\x1b[CFB][0-9A-Fa-f]/g, "")
    // Be defensive for any unknown ESC command pair.
    .replace(/\x1b./g, "")
    // Other C0 controls are non-printing in message text. Preserve only
    // line-feed, carriage-return and tab semantics.
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1a]/g, "");
}

export function parseMenuTable(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 2) return [];
  const firstOffset = (bytes[0] << 8) | bytes[1];
  const count = firstOffset / 2;
  const out = [];
  for (let i = 0; i < count; i++) {
    const off = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
    const next = i + 1 < count
      ? (bytes[(i + 1) * 2] << 8) | bytes[(i + 1) * 2 + 1]
      : bytes.length;
    if (off + 2 > bytes.length || next < off) {
      out.push({ index: i, width: 0, count: 0, options: [] });
      continue;
    }
    const width = bytes[off];
    const optionCount = bytes[off + 1];
    let p = off + 2;
    const options = [];
    for (let k = 0; k < optionCount && p < next; k++) {
      let end = p;
      while (end < next && bytes[end] !== 0) end++;
      options.push(cp949.decode(bytes.subarray(p, end)));
      p = end + 1;
    }
    out.push({ index: i, width, count: optionCount, options });
  }
  return out;
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
  ACTORS: 0x18,
  ACTOR_COUNT: 8,
  ACTOR_SIZE: 3,
  MONEY: 0x06a1,
  BANK_WORD: 0x06a5,
  BANK_REMAINDER: 0x06a7,
  ITEM_INVENTORY: 0x21fa,
  ITEM_INVENTORY_COUNT: 20,
  VOYAGE_DAY: 0x21bb,
  WATER_RATION: 0x21bc,
  FOOD_RATION: 0x21bd,
  ITEM_DEFINITIONS: 0x75c5,
  ITEM_DEFINITION_SIZE: 26,
  ITEM_DEFINITION_COUNT: 100,
  HERO_ID: 0x06a8,
  PERSON: 0x06a9,
  PERSON_SIZE: 50,
  PORT_TABLE: 0x53ba,
  PORT_META: 0x5966,
  PORT_META_SIZE: 0x25,
  PORT: 0x53bf,
  PORT_SIZE: 20,
  ABILITY: [0x064d, 0x065b, 0x0669, 0x0677, 0x0685, 0x0693],
});

function u16le(view, off) { return view.getUint16(off, true); }
function i16le(view, off) { return view.getInt16(off, true); }
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
      tacking:bytes[s1+4],
      power:bytes[s1+5],
      loadedGuns:bytes[s1+6],
      instanceId:select,
      weaponId:bytes[s1+8],
      captainId:bytes[s2],
      condition:bytes[s2+1],
      figurehead:bytes[s2+2],
      water:u16le(view,s2+3),
      food:u16le(view,s2+5),
      lumber:u16le(view,s2+7),
      shot:u16le(view,s2+9),
      lookoutPercent:bytes[s2+11],
      navigationPercent:bytes[s2+12],
      load:u16le(view,s2+13),
      goods:Array.from({length:5},(_,slot)=>({
        slot,
        quantity:u16le(view,s2+15+slot*2),
        id:bytes[s2+25+slot],
      })),
      captainName:[
        decodeCString(bytes,page+SAVE.PERSON+bytes[s2]*SAVE.PERSON_SIZE,13),
        decodeCString(bytes,page+SAVE.PERSON+bytes[s2]*SAVE.PERSON_SIZE+13,13),
      ].filter(Boolean).join(" "),
      seamanship:bytes[page+SAVE.PERSON+bytes[s2]*SAVE.PERSON_SIZE+29],
      navigationLevel:bytes[page+SAVE.PERSON+bytes[s2]*SAVE.PERSON_SIZE+36],
      name:decodeCString(bytes,s3,14),
      modelId,
      oared:modelId>=18,
      battleForm:bytes[s3+19],
      maxWeapons:bytes[s3+20],
      maxCrew:u16le(view,s3+21),
      cargo:u16le(view,s3+23),
      modelName:decodeCString(bytes,s5,18),
      maxTacking:bytes[s4],
      maxPower:bytes[s4+1],
      maxCrew10:bytes[s4+2],
      requiredCrew:bytes[s4+3],
      capacity:u16le(view,s4+4),
      modelMaxWeapons:bytes[s4+6],
      sailType:bytes[s4+7],
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


function parsePortMetaRecord(bytes, view, page, port) {
  if (port < 0 || port >= 100) return null;
  const at = page + SAVE.PORT_META + port * SAVE.PORT_META_SIZE;
  if (at + SAVE.PORT_META_SIZE > bytes.length) return null;
  return {
    offset: at,
    economy: u16le(view, at + 0x02),
    marketInvestment: u16le(view, at + 0x04),
    industry: u16le(view, at + 0x06),
    shipyardInvestment: u16le(view, at + 0x08),
    support: Array.from(bytes.subarray(at + 0x0a, at + 0x10)),
    rates: Array.from(bytes.subarray(at + 0x10, at + 0x1a)),
    specialtyBasePrice: u16le(view, at + 0x1a),
    specialtyGoodsId: bytes[at + 0x1c],
    specialtyEconomyThreshold: bytes[at + 0x1d],
    regionId: bytes[at + 0x1e],
    regularItems: Array.from(bytes.subarray(at + 0x1f, at + 0x22)),
    secretItem: bytes[at + 0x22],
    marketId: bytes[at + 0x23],
    industryId: bytes[at + 0x24],
    // In the 0x5966 framing the Pub specialty byte at executable-relative
    // +0x26 is the following record's +1.
    pubDrinkId: bytes[at + 0x26],
  };
}

export function parseKoreanPortTable(arrayBuffer, page = 0) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const ports = [];
  for (let i = 0; i < 130; i++) {
    const at = page + SAVE.PORT_TABLE + i * SAVE.PORT_SIZE;
    if (at + SAVE.PORT_SIZE > bytes.length) break;
    ports.push({
      id: i,
      nation: bytes[at],
      x: u16le(view, at + 1),
      y: u16le(view, at + 3),
      name: decodeCString(bytes, at + 5, 15),
      supply: i >= 100,
      mapId: i >= 100 ? 100 : i,
      meta: i < 100 ? parsePortMetaRecord(bytes, view, page, i) : null,
    });
  }
  return ports;
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
    const slotHeaderFlag = bytes[init + 13];
    const ending = slotHeaderFlag !== 0;
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
    const townActors = [];
    for (let actor = 0; actor < SAVE.ACTOR_COUNT; actor++) {
      const at = saveBase + SAVE.ACTORS + actor * SAVE.ACTOR_SIZE;
      const x = bytes[at], y = bytes[at + 1], type = bytes[at + 2];
      townActors.push({
        slot: actor,
        x, y, type,
        active: x !== 0xff && y !== 0xff,
        walker: actor < 4,
      });
    }
    const fleet=parseKoreanFleet(bytes,view,page,heroId);
    const portMeta = port !== 0xff && port < 100
      ? parsePortMetaRecord(bytes, view, page, port)
      : null;
    slots.push({
      index: i,
      empty: false,
      memo,
      port,
      portName,
      portWorld,
      fleet,
      portMeta,
      dateTime: {
        year, month, day, timeTick,
        hour: Math.floor(timeTick / 3),
        minute: (timeTick % 3) * 20,
      },
      ending,
      slotHeaderFlag,
      heroId,
      heroName: [fname, lname].filter(Boolean).join(" "),
      portraitIdCandidate: bytes[personBase + 26],
      charm: bytes[personBase + 34],
      luck: bytes[personBase + 35],
      navigationLevel: bytes[personBase + 36],
      battleLevel: bytes[personBase + 37],
      navigationExperience: u16le(view, personBase + 38),
      battleExperience: u16le(view, personBase + 40),
      affiliation: bytes[personBase + 44] & 0x0f,
      rank: bytes[abilityBase + 13],
      dayFlags: bytes[saveBase + 0x0c],
      money: u32le(view, page + SAVE.MONEY),
      bankBalance: i16le(view, page + SAVE.BANK_WORD) * 100 + bytes[page + SAVE.BANK_REMAINDER],
      voyageDay: bytes[page + SAVE.VOYAGE_DAY],
      waterRation: bytes[page + SAVE.WATER_RATION],
      foodRation: bytes[page + SAVE.FOOD_RATION],
      inventory: Array.from(
        bytes.subarray(
          page + SAVE.ITEM_INVENTORY,
          page + SAVE.ITEM_INVENTORY + SAVE.ITEM_INVENTORY_COUNT,
        ),
      ),
      itemDefinitions: Array.from({length:SAVE.ITEM_DEFINITION_COUNT},(_,id)=>{
        const at=page+SAVE.ITEM_DEFINITIONS+id*SAVE.ITEM_DEFINITION_SIZE;
        return {
          id,
          name: decodeCString(bytes,at,21),
          picture: bytes[at+21],
          priceUnit: u16le(view,at+22),
          price: u16le(view,at+22)*100,
          rating: bytes[at+24],
          flags: bytes[at+25],
          type: bytes[at+25]&0x0f,
          equipped: (bytes[at+25]&0x10)!==0,
        };
      }),
      tradeFame: u16le(view, abilityBase),
      pirateFame: u16le(view, abilityBase + 2),
      adventureFame: u16le(view, abilityBase + 4),
      portState: {
        viewX, viewY, playerX, playerY,
        mapX: viewX + playerX,
        mapY: viewY + playerY,
      },
      townActors,
      raw: { page, saveBase, personBase, abilityBase },
    });
  }
  return slots;
}