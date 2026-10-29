import { parseOffsetTextTable, parseSaveSlots, stripMenuControls } from "./binary.js";
import { ReaGameRuntime } from "./runtime.js";

const $ = (id) => document.getElementById(id);
const canvas = $("screen");
const ctx = canvas.getContext("2d");
let slots = [];
let selected = null;
let menus = [];
let messages = [];
let runtime = null;

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
  const [menuBuf, msgBuf] = await Promise.all([loadBuffer("MENU.DAT"), loadBuffer("MESSAGE.DAT")]);
  menus = parseOffsetTextTable(menuBuf);
  messages = parseOffsetTextTable(msgBuf);
  $("menus").replaceChildren(rows(menus, x => `#${x.index}  ${stripMenuControls(x.text)}`));
  $("messages").replaceChildren(rows(messages.slice(0, 120), x => `#${x.index}  ${x.text.replace(/\n/g, " / ")}`));
}

function renderSlots() {
  const root = $("save-slots");
  root.replaceChildren();
  for (const slot of slots) {
    const btn = document.createElement("button");
    btn.className = "slot" + (slot.empty ? " empty" : "") + (selected?.index === slot.index ? " selected" : "");
    btn.disabled = slot.empty;
    btn.textContent = slot.empty
      ? `${slot.index + 1}. No data`
      : `${slot.index + 1}. ${slot.memo} · ${slot.portName} · ${slot.heroName} · ${slot.money.toLocaleString()} G${slot.ending ? " · END" : ""}`;
    btn.addEventListener("click", () => {
      selected = slot;
      $("run-button").disabled = false;
      renderSlots();
      drawPreview(slot);
    });
    root.appendChild(btn);
  }
}

async function loadSaves() {
  const buf = await loadBuffer("KOUKAI2.DAT");
  slots = parseSaveSlots(buf);
  $("save-status").textContent = `KOUKAI2.DAT ${fmtBytes(buf.byteLength)} · 슬롯당 33,340 bytes`;
  renderSlots();
  const first = slots.find(x => !x.empty);
  if (first) {
    selected = first;
    $("run-button").disabled = false;
    renderSlots();
    drawPreview(first);
  }
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

function drawPreview(slot) {
  drawFrame("대항해시대 II", [
    `SAVE ${slot.index + 1}: ${slot.memo}`,
    `항구: ${slot.portName}`,
    `주인공: ${slot.heroName}`,
    `소지금: ${slot.money.toLocaleString()} G`,
    "원본 MENU.DAT / MESSAGE.DAT 로드 완료",
  ]);
}

function renderRuntime() {
  if (!runtime) return;
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
  $("debug").textContent = JSON.stringify(s, null, 2);
  requestAnimationFrame(renderRuntime);
}

$("run-button").addEventListener("click", () => {
  if (!selected) return;
  runtime = new ReaGameRuntime(selected, menus, messages);
  runtime.start();
  $("pause-button").disabled = false;
  $("pause-button").textContent = "일시정지";
  renderRuntime();
});

$("pause-button").addEventListener("click", () => {
  if (!runtime) return;
  if (runtime.running) {
    runtime.pause();
    $("pause-button").textContent = "계속";
  } else {
    runtime.start();
    $("pause-button").textContent = "일시정지";
  }
});

Promise.all([loadManifest(), loadTables(), loadSaves()])
  .catch(err => {
    $("runtime-status").textContent = "로드 오류: " + err.message;
    $("debug").textContent = err.stack || String(err);
  });