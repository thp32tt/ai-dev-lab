import { parseOffsetTextTable, parseSaveSlots, stripMenuControls } from "./binary.js";
import { ReaGameRuntime } from "./runtime.js";
import { decodeLS11 } from "./ls11.js";
import { decodePlanarIndexed, drawIndexedCanvas } from "./koei-image.js";
import { decodePortAssets, renderPortMapToCanvas, renderPortViewport, renderTownView } from "./port-map.js";
import {
  decodeOpeningArchive,
  chooseTitleLikeRecord,
  chooseOpeningGallery,
  drawOpeningFit,
} from "./opening.js";
import { readGraphRecords, decodeGraphRecord } from "./graph-format.js";
import {
  parsePortDoors,
  PortWalkingRuntime,
  BUILDING_MENU_INDEX,
} from "./town.js";
import {
  decodeWorldAssets,
  findNearestSea,
  renderSeaView,
  SeaRuntime,
} from "./world-map.js";

const $ = (id) => document.getElementById(id);
const canvas = $("screen");
const ctx = canvas.getContext("2d");

let slots = [];
let selected = null;
let menus = [];
let messages = [];
let runtime = null;
let viewMode = "loading";
let kaoPortraits = [];
let portAssets = null;
let openingData = null;
let openingTitle = null;
let portDoors = null;
let townRuntime = null;
let buildingImages = [];
let worldAssets = null;
let seaRuntime = null;

async function loadBuffer(name) {
  const res = await fetch("/game/" + encodeURIComponent(name), { cache: "no-store" });
  if (!res.ok) throw new Error(name + " HTTP " + res.status);
  return res.arrayBuffer();
}

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KiB";
  return (n / 1024 / 1024).toFixed(1) + " MiB";
}

function rows(items, mapper) {
  const box = document.createElement("div");
  box.className = "list";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "row";
    row.textContent = mapper(item);
    box.appendChild(row);
  });
  return box;
}

async function loadManifest() {
  const res = await fetch("/api/manifest", { cache: "no-store" });
  const data = await res.json();
  $("manifest-status").textContent = data.gameDirAvailable
    ? `${data.fileCount}개 원본 데이터 파일 사용 가능`
    : "원본 게임 디렉터리를 찾지 못했습니다.";
  $("manifest").replaceChildren(rows(data.files, x => `${x.name} · ${fmtBytes(x.size)}`));
}

async function loadTables() {
  const [menuBuf, msgBuf] = await Promise.all([
    loadBuffer("MENU.DAT"),
    loadBuffer("MESSAGE.DAT"),
  ]);
  menus = parseOffsetTextTable(menuBuf);
  messages = parseOffsetTextTable(msgBuf);
  $("menus").replaceChildren(rows(menus, x => `#${x.index}  ${stripMenuControls(x.text)}`));
  $("messages").replaceChildren(rows(messages.slice(0, 120), x => `#${x.index}  ${x.text.replace(/\n/g, " / ")}`));
}

async function loadOpeningGraphics() {
  const buf = await loadBuffer("OPGRAPH.LZW");
  openingData = decodeOpeningArchive(buf);
  openingTitle = chooseTitleLikeRecord(openingData);
  $("opening-button").disabled = !openingTitle;

  const gallery = $("opening-gallery");
  gallery.replaceChildren();
  const chosen = chooseOpeningGallery(openingData, 12);
  for (const image of chosen) {
    const fig = document.createElement("figure");
    fig.className = "opening-card";
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 180;
    const cctx = c.getContext("2d");
    cctx.fillStyle = "#000";
    cctx.fillRect(0, 0, c.width, c.height);
    drawOpeningFit(cctx, image, 0, 0, c.width, c.height);
    const cap = document.createElement("figcaption");
    cap.textContent = `part ${image.partIndex} / record ${image.recordIndex} · ${image.width}×${image.height}`;
    fig.append(c, cap);
    gallery.appendChild(fig);
  }
  $("opening-status").textContent =
    `${openingData.magic} · 사용자 원본 14 parts / ${openingData.recordCount} GRAPH records · 16색 근사 팔레트`;
}

function renderSelectedPortMap() {
  const portCanvas = $("portmap");
  if (!selected || !portAssets) return;
  if (selected.port === 0xff) {
    const pctx = portCanvas.getContext("2d");
    portCanvas.width = 384;
    portCanvas.height = 96;
    pctx.fillStyle = "#071522";
    pctx.fillRect(0, 0, portCanvas.width, portCanvas.height);
    pctx.fillStyle = "#e7edf5";
    pctx.font = "20px Malgun Gothic";
    pctx.fillText("현재 세이브는 해상 상태입니다.", 30, 55);
    $("portmap-status").textContent = "해상 상태 · 항구 맵 없음";
    return;
  }
  const info = renderPortMapToCanvas(portCanvas, portAssets, selected.port, 0.25);
  $("portmap-status").textContent =
    `PORT #${selected.port} ${selected.portName} · CHIP bank ${info.bankId} · 96×96 tiles / 1536×1536 px`;
}

async function loadWorldSupport() {
  const [worldBuf, data1Buf] = await Promise.all([
    loadBuffer("WORLDMAP.LZW"),
    loadBuffer("DATA1.LZW"),
  ]);
  worldAssets = decodeWorldAssets(worldBuf, data1Buf);
}

async function loadTownSupport() {
  const [zaBuf, graphBuf] = await Promise.all([
    loadBuffer("ZA_DAT.DAT"),
    loadBuffer("GRAPH.DAT"),
  ]);
  portDoors = parsePortDoors(zaBuf);
  const records = readGraphRecords(new Uint8Array(graphBuf));
  buildingImages = records.slice(6, 18).map(decodeGraphRecord);
}

async function loadPortMaps() {
  const [chipBuf, mapBuf, chipNoBuf] = await Promise.all([
    loadBuffer("PORTCHIP.LZW"),
    loadBuffer("PORTMAP.LZW"),
    loadBuffer("CHIP_NO.DAT"),
  ]);
  portAssets = decodePortAssets(chipBuf, mapBuf, chipNoBuf);
  $("portmap-status").textContent =
    `7 tile banks × 240 tiles · PORTMAP ${portAssets.maps.length}개 · CHIP_NO ${portAssets.chipNo.length}개`;
  renderSelectedPortMap();
}

function renderSlots() {
  const root = $("save-slots");
  root.replaceChildren();
  for (const slot of slots) {
    const btn = document.createElement("button");
    btn.className = "slot" + (slot.empty ? " empty" : "") +
      (selected?.index === slot.index ? " selected" : "");
    btn.disabled = slot.empty;
    btn.textContent = slot.empty
      ? `${slot.index + 1}. No data`
      : `${slot.index + 1}. ${slot.memo} · ${slot.portName} · ${slot.heroName} · ${slot.money.toLocaleString()} G${slot.ending ? " · END" : ""}`;
    btn.addEventListener("click", () => {
      selected = slot;
      $("run-button").disabled = false;
      renderSlots();
      drawPreview(slot);
      renderSelectedPortMap();
    });
    root.appendChild(btn);
  }
}

async function loadPortraits() {
  const buf = await loadBuffer("KAO.LZW");
  const decoded = decodeLS11(buf, 16);
  const root = $("portraits");
  root.replaceChildren();

  kaoPortraits = decoded.decoded.map(entry =>
    decodePlanarIndexed(entry.data, 64, 80, 3, 1, true)
  );
  decoded.decoded.slice(0, 8).forEach((entry, i) => {
    const fig = document.createElement("figure");
    fig.className = "portrait";
    const c = document.createElement("canvas");
    const cap = document.createElement("figcaption");
    cap.textContent = `KAO #${i}`;
    drawIndexedCanvas(c, kaoPortraits[i], 64, 80, 2);
    fig.append(c, cap);
    root.appendChild(fig);
  });

  $("kao-status").textContent =
    `${decoded.magic} · FAT ${decoded.entries.length}개 · 16개 해제 / 첫 8개 표시 · 64×80/3bpp`;
  if (selected && viewMode === "preview") drawPreview(selected);
}

async function loadSaves() {
  const buf = await loadBuffer("KOUKAI2.DAT");
  slots = parseSaveSlots(buf);
  $("save-status").textContent =
    `KOUKAI2.DAT ${fmtBytes(buf.byteLength)} · 슬롯당 33,340 bytes`;
  const first = slots.find(x => !x.empty);
  if (first) {
    selected = first;
    $("run-button").disabled = false;
  }
  renderSlots();
  renderSelectedPortMap();
}

function drawFrame(title, lines) {
  ctx.fillStyle = "#071522";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#c9a95e";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.fillStyle = "#f1d58b";
  ctx.font = "bold 28px Malgun Gothic, sans-serif";
  ctx.fillText(title, 38, 62);
  ctx.font = "20px Malgun Gothic, sans-serif";
  ctx.fillStyle = "#e7edf5";
  lines.forEach((line, i) => ctx.fillText(line, 42, 108 + i * 32));
}

function drawHeroPortrait(slot) {
  const id = slot?.portraitIdCandidate;
  const indexed = Number.isInteger(id) ? kaoPortraits[id] : null;
  if (!indexed) return;
  const tmp = document.createElement("canvas");
  drawIndexedCanvas(tmp, indexed, 64, 80, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, 64, 80, 478, 82, 128, 160);
  ctx.strokeStyle = "#c9a95e";
  ctx.strokeRect(477, 81, 130, 162);
}

function drawPreview(slot) {
  viewMode = "preview";
  if (runtime) runtime.pause();
  drawFrame("대항해시대 II", [
    `SAVE ${slot.index + 1}: ${slot.memo}`,
    `항구: ${slot.portName}`,
    `주인공: ${slot.heroName}`,
    `소지금: ${slot.money.toLocaleString()} G`,
    `얼굴 후보 ID: ${slot.portraitIdCandidate}`,
    "원본 MENU / MESSAGE / KAO / PORTMAP 로드",
  ]);
  drawHeroPortrait(slot);
  $("runtime-status").textContent = "세이브 미리보기";
}

function drawOpeningScreen() {
  if (!openingTitle) return;
  viewMode = "opening";
  if (runtime) runtime.pause();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawOpeningFit(ctx, openingTitle, 0, 78, canvas.width, 150);
  ctx.fillStyle = "#d7d7d7";
  ctx.font = "16px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("OPGRAPH.LZW 원본 GRAPH 레코드 직접 복원", 320, 274);
  ctx.fillText(
    `part ${openingTitle.partIndex} / record ${openingTitle.recordIndex} · ${openingTitle.width}×${openingTitle.height}`,
    320, 302
  );
  ctx.fillStyle = "#8f98a8";
  ctx.fillText("색상은 현재 16색 근사 팔레트 · 픽셀/압축 구조는 원본 데이터", 320, 334);
  ctx.textAlign = "start";
  $("runtime-status").textContent = "원본 OPGRAPH 오프닝 화면";
  $("debug").textContent = JSON.stringify({
    view: "opening",
    parts: openingData.parts.length,
    records: openingData.recordCount,
    selectedRecord: {
      part: openingTitle.partIndex,
      record: openingTitle.recordIndex,
      width: openingTitle.width,
      height: openingTitle.height,
    },
  }, null, 2);
}

function drawBuildingImage(image, x, y, w, h) {
  if (!image) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  drawOpeningFit(ctx, image, x, y, w, h);
}

function renderTownScreen() {
  if (!townRuntime || !portAssets) return;
  const s = townRuntime.snapshot();
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (s.building) {
    const image = buildingImages[s.building.id];
    drawBuildingImage(image, 24, 40, 330, 272);
    ctx.strokeStyle = "#c9a95e";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 36, 338, 280);

    ctx.fillStyle = "#f1d58b";
    ctx.font = "bold 24px Malgun Gothic, sans-serif";
    ctx.fillText(s.building.name, 390, 72);
    ctx.fillStyle = "#e7edf5";
    ctx.font = "16px Malgun Gothic, sans-serif";
    ctx.fillText(`${s.portName} · 건물 #${s.building.id}`, 390, 104);
    const menuIndex = BUILDING_MENU_INDEX[s.building.id];
    const menuText = Number.isInteger(menuIndex)
      ? stripMenuControls(menus[menuIndex]?.text ?? "")
      : "전용 이벤트/대화";
    const chunks = menuText.match(/.{1,16}/g) ?? [menuText];
    chunks.slice(0, 8).forEach((line, i) => ctx.fillText(line, 390, 142 + i * 24));
    ctx.fillStyle = "#9fb0c4";
    if (s.building.id === 3 && worldAssets) {
      ctx.fillStyle = "#f1d58b";
      ctx.fillText("ENTER / 1 / S: 출항", 390, 330);
    }
    ctx.fillStyle = "#9fb0c4";
    ctx.fillText("ESC: 항구로 돌아가기", 390, 360);
    $("runtime-status").textContent =
      `건물 진입: ${s.building.name} · 원본 GRAPH.DAT vendor art`;
  } else {
    renderTownView(ctx, portAssets, s.portId, s, 16, 16);
    ctx.strokeStyle = "#c9a95e";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 372, 372);

    ctx.fillStyle = "#f1d58b";
    ctx.font = "bold 20px Malgun Gothic, sans-serif";
    ctx.fillText(s.portName, 408, 48);
    ctx.fillStyle = "#e7edf5";
    ctx.font = "15px Malgun Gothic, sans-serif";
    const lines = [
      `map: (${s.mapX}, ${s.mapY})`,
      `view: (${s.viewX}, ${s.viewY})`,
      `player: (${s.playerX}, ${s.playerY})`,
      `facing: ${s.facing}`,
      "",
      "이동:",
      "방향키 / WASD",
      "숫자 8 6 2 4",
      "",
      "문 위로 걸으면",
      "건물에 들어갑니다.",
    ];
    lines.forEach((line, i) => ctx.fillText(line, 408, 84 + i * 25));
    $("runtime-status").textContent =
      `항구 보행 · ${s.portName} · 실제 SAVE 좌표/PORTMAP 충돌 사용`;
  }

  $("debug").textContent = JSON.stringify({
    mode: "town",
    hero: selected?.heroName,
    money: selected?.money,
    ...s,
  }, null, 2);
}

function moveTown(direction) {
  if (!townRuntime || viewMode !== "town") return;
  townRuntime.move(direction);
  renderTownScreen();
}

function startSeaFromPort() {
  if (!selected?.portWorld || !worldAssets) return false;
  const start = findNearestSea(worldAssets, selected.portWorld.x, selected.portWorld.y, 40);
  if (!start) {
    $("runtime-status").textContent = "출항 실패: 항구 근처 항해 가능 바다를 찾지 못했습니다.";
    return false;
  }
  seaRuntime = new SeaRuntime(worldAssets, start);
  viewMode = "sea";
  renderSeaScreen();
  return true;
}

function renderSeaScreen() {
  if (!seaRuntime || !worldAssets) return;
  const s = seaRuntime.snapshot();
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderSeaView(ctx, worldAssets, s, 16, 16, 23, 23);
  ctx.strokeStyle = "#c9a95e";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 372, 372);

  const dirNames = ["북","북동","동","남동","남","남서","서","북서"];
  ctx.fillStyle = "#f1d58b";
  ctx.font = "bold 20px Malgun Gothic, sans-serif";
  ctx.fillText("해상", 408, 48);
  ctx.fillStyle = "#e7edf5";
  ctx.font = "15px Malgun Gothic, sans-serif";
  const lines = [
    `출항: ${selected?.portName ?? ""}`,
    `좌표: (${s.x}, ${s.y})`,
    `방향: ${dirNames[s.heading]} / ${s.heading}`,
    `이동: ${s.steps}칸`,
    `상태: ${s.lastEvent}`,
    "",
    "←/A/4 : 좌회전",
    "→/D/6 : 우회전",
    "↑/W/8 : 전진",
    "",
    "현재는 지도/충돌/조타",
    "직접 실행 단계입니다.",
  ];
  lines.forEach((line, i) => ctx.fillText(line, 408, 82 + i * 25));
  $("runtime-status").textContent =
    `해상 항해 · WORLDMAP/DATA1 원본 지도 · (${s.x}, ${s.y})`;
  $("debug").textContent = JSON.stringify({
    mode: "sea",
    fromPort: selected?.portName,
    portWorld: selected?.portWorld,
    ...s,
  }, null, 2);
}

function renderRuntime() {
  if (!runtime || viewMode !== "runtime") return;
  runtime.tick();
  const s = runtime.snapshot();
  const msg = messages[(s.frame >> 5) % Math.min(messages.length, 80)]?.text ?? "";
  drawFrame(s.hero || "대항해시대 II", [
    `Frame ${s.frame} · SAVE ${(s.slot ?? 0) + 1}`,
    `Money ${Number(s.money).toLocaleString()} G`,
    `REA state 0x426=${s.state426} 0x56F=${s.state56F} 0x570=${s.state570}`,
    stripMenuControls(menus[s.state56F % menus.length]?.text ?? ""),
    msg.replace(/\n/g, " ").slice(0, 40),
  ]);
  $("runtime-status").textContent = runtime.running ? "실행 중" : "일시정지";
  if (portAssets && runtime.slot?.port !== 0xff) {
    const p = renderPortViewport(ctx, portAssets, runtime.slot.port, 330, 210, 280, 155);
    if (p) {
      ctx.strokeStyle = "#c9a95e";
      ctx.strokeRect(329, 209, 282, 157);
    }
  }
  drawHeroPortrait(runtime.slot);
  $("debug").textContent = JSON.stringify({
    ...s,
    portraitIdCandidate: runtime.slot?.portraitIdCandidate,
    port: runtime.slot?.port,
  }, null, 2);
  requestAnimationFrame(renderRuntime);
}

$("opening-button").addEventListener("click", drawOpeningScreen);

$("run-button").addEventListener("click", () => {
  if (!selected) return;
  if (selected.port !== 0xff && portAssets && portDoors) {
    if (runtime) runtime.pause();
    townRuntime = new PortWalkingRuntime(selected, portAssets, portDoors);
    viewMode = "town";
    $("pause-button").disabled = true;
    renderTownScreen();
    return;
  }
  runtime = new ReaGameRuntime(selected, menus, messages);
  runtime.start();
  viewMode = "runtime";
  $("pause-button").disabled = false;
  $("pause-button").textContent = "일시정지";
  renderRuntime();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (viewMode === "sea" && seaRuntime) {
    let handled = true;
    if (key === "arrowleft" || key === "a" || key === "4") seaRuntime.turn(-1);
    else if (key === "arrowright" || key === "d" || key === "6") seaRuntime.turn(1);
    else if (key === "arrowup" || key === "w" || key === "8" || key === " ") seaRuntime.move();
    else handled = false;
    if (handled) {
      event.preventDefault();
      renderSeaScreen();
    }
    return;
  }

  if (viewMode !== "town" || !townRuntime) return;

  if (townRuntime.insideBuilding) {
    if (townRuntime.insideBuilding.id === 3 &&
        (key === "enter" || key === "1" || key === "s")) {
      event.preventDefault();
      startSeaFromPort();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      townRuntime.leaveBuilding();
      renderTownScreen();
    }
    return;
  }

  const direction =
    key === "arrowup" || key === "w" || key === "8" ? "up" :
    key === "arrowright" || key === "d" || key === "6" ? "right" :
    key === "arrowdown" || key === "s" || key === "2" ? "down" :
    key === "arrowleft" || key === "a" || key === "4" ? "left" : null;
  if (!direction) return;
  event.preventDefault();
  moveTown(direction);
});

$("pause-button").addEventListener("click", () => {
  if (!runtime || viewMode !== "runtime") return;
  if (runtime.running) {
    runtime.pause();
    $("pause-button").textContent = "계속";
  } else {
    runtime.start();
    $("pause-button").textContent = "일시정지";
  }
});

Promise.all([
  loadManifest(),
  loadTables(),
  loadSaves(),
  loadPortraits(),
  loadPortMaps(),
  loadOpeningGraphics(),
  loadTownSupport(),
  loadWorldSupport(),
]).then(() => {
  drawOpeningScreen();
}).catch(err => {
  $("runtime-status").textContent = "로드 오류: " + err.message;
  $("debug").textContent = err.stack || String(err);
});