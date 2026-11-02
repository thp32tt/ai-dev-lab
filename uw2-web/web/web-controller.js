import {nativeContextCommandsFor,nativeContextLabelFor} from "./native-context-commands.js";
const controller = document.getElementById("web-controller");
if (controller) controller.dataset.ready = "1";

const modeLabel = document.getElementById("controller-mode");
const musicLabel = document.getElementById("controller-music");
const checkpointLabel=document.getElementById("checkpoint-feedback");
const autoButton = controller?.querySelector('[data-action="auto-sail"]');
const pauseButton = controller?.querySelector('[data-action="pause"]');
const soundButton = controller?.querySelector('[data-action="sound"]');
const portButton = controller?.querySelector('[data-key="p"]');
const checkpointSaveButton=controller?.querySelector('[data-action="checkpoint-save"]');
const saveNavButtons=[...controller?.querySelectorAll(
  '[data-action="save-prev"],[data-action="save-next"]')??[]];
const checkpointLoadButton=controller?.querySelector('[data-action="checkpoint-load"]');
const checkpointSlotSelect=document.getElementById("checkpoint-source-slot");
const nativeContextPanel=document.getElementById("native-context-actions");
const nativeContextLabel=document.getElementById("native-context-label");
const nativeContextButtons=document.getElementById("native-context-buttons");
let lastNativeContextMode=null;
function renderNativeContext(mode){
  const cmds=nativeContextCommandsFor(mode);
  if(!nativeContextPanel||!nativeContextButtons)return;
  const visible=!!cmds;
  // A pointer held while exiting the room must not leave a detached
  // context button repeating an Arrow key in another game mode.
  if(!visible||lastNativeContextMode!==mode){
    for(const button of nativeContextButtons.querySelectorAll("button"))
      clearPress(button);
  }
  nativeContextPanel.hidden=!visible;
  if(!visible){
    lastNativeContextMode=null;
    nativeContextButtons.replaceChildren();
    return;
  }
  if(lastNativeContextMode===mode)return;
  lastNativeContextMode=mode;
  nativeContextLabel.textContent=nativeContextLabelFor(mode)+" · 웹 조작";
  const buttons=cmds.map(command=>{
    const button=document.createElement("button");
    button.type="button";
    button.dataset.key=command.key;
    if(command.shiftKey)button.dataset.shiftKey="true";
    button.textContent=command.label;
    button.setAttribute("aria-label",command.label);
    return button;
  });
  nativeContextButtons.replaceChildren(...buttons);
}


function emitKey(key, options = {}) {
  const down = new KeyboardEvent("keydown", {
    key,
    code: options.code || "",
    bubbles: true,
    cancelable: true,
    shiftKey: !!options.shiftKey,
  });
  window.dispatchEvent(down);
}

function emitAction(action,extra={}) {
  window.dispatchEvent(new CustomEvent("uw2-controller-action", {
    detail: { action,...extra },
  }));
}

function visibleSaveButtons() {
  return [...document.querySelectorAll("#save-slots .slot:not(:disabled)")];
}

function changeSave(delta) {
  const buttons = visibleSaveButtons();
  if (!buttons.length) return;
  let index = buttons.findIndex(b => b.classList.contains("selected"));
  if (index < 0) index = 0;
  index = (index + delta + buttons.length) % buttons.length;
  buttons[index].click();
}

function runAction(action) {
  if (action === "start") {
    const mode=controller?.dataset.mode??"";
    if(["system-menu","new-game-select","load-select","load-confirm","quit-ended"].includes(mode))
      emitKey("Enter");
    else document.getElementById("run-button")?.click();
  }
  else if (action === "opening") document.getElementById("opening-button")?.click();
  else if (action === "save-prev" || action === "save-next") {
    // Hidden source Save Data buttons must not replace an actively running
    // town/sea game with the unrelated "preview" screen.
    // Slot selection belongs only to the original system/load/preview UI.
    const mode=controller?.dataset.mode??"";
    if(!["system-menu","load-select","load-confirm","load-empty","preview"]
       .includes(mode))return;
    changeSave(action==="save-prev"?-1:1);
  }
  else if(action==="checkpoint-load") {
    const value=checkpointSlotSelect?.value??"";
    emitAction(action,{slotIndex:value===""?null:Number(value)});
  }
  else emitAction(action);
}

const repeatable = new Set(["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]);
const active = new Map();

function clearPress(button) {
  const state = active.get(button);
  if (!state) return;
  clearTimeout(state.delay);
  clearInterval(state.repeat);
  active.delete(button);
  button.classList.remove("pressed");
}

function pressKeyButton(button) {
  const key = button.dataset.key;
  if (!key || active.has(button)) return;

  const options={shiftKey:button.dataset.shiftKey==="true"};
  emitKey(key,options);
  button.classList.add("pressed");

  if (!repeatable.has(key)) {
    const release = setTimeout(() => clearPress(button), 90);
    active.set(button, { delay: release, repeat: 0 });
    return;
  }

  const state = { delay: 0, repeat: 0 };
  state.delay = setTimeout(() => {
    state.repeat = setInterval(() => emitKey(key,options), 105);
  }, 260);
  active.set(button, state);
}

controller?.addEventListener("pointerdown", event => {
  const button = event.target.closest("button");
  if (!button||button.disabled||button.closest('[hidden]')) return;
  event.preventDefault();
  try { button.setPointerCapture?.(event.pointerId); } catch {}
  if (button.dataset.key) {
    pressKeyButton(button);
  } else if (button.dataset.action) {
    button.classList.add("pressed");
  }
});

for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  controller?.addEventListener(type, event => {
    const button = event.target.closest("button");
    if (!button) return;
    event.preventDefault();
    clearPress(button);
    button.classList.remove("pressed");
  });
}

controller?.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  event.preventDefault();
  runAction(button.dataset.action);
});

controller?.addEventListener("contextmenu", event => event.preventDefault());

window.addEventListener("uw2-game-state", event => {
  const state = event.detail || {};
  if(checkpointLabel&&typeof state.checkpointFeedback==="string")
    checkpointLabel.textContent=state.checkpointFeedback.slice(0,180);
  const labels = {
    loading: "로딩",
    opening: "오프닝",
    town: "항구",
    sea: "항해",
    runtime: "게임",
    preview: "미리보기",
    "new-game-select": "새 게임 · 주인공 선택",
    "quit-ended": "게임 종료 · 메인 메뉴로 복귀",
  };
  if (modeLabel) modeLabel.textContent = labels[state.mode] || String(state.mode || "게임");
  controller.dataset.mode = state.mode || "";
  renderNativeContext(state.mode==="town"?state.nativeActionMode:null);
  const saveSelectionAvailable=["system-menu","load-select","load-confirm",
    "load-empty","preview"].includes(state.mode);
  for(const button of saveNavButtons)
    button.disabled=!saveSelectionAvailable;

  if(checkpointSlotSelect&&Array.isArray(state.checkpointSlots)){
    const available=new Map(state.checkpointSlots.map(entry=>[String(entry.slot),entry.kind]));
    for(const option of checkpointSlotSelect.options){
      if(option.value==="")continue;
      const kind=available.get(option.value);
      option.disabled=!kind;
      option.textContent="슬롯 "+(Number(option.value)+1)+
        (kind?(kind==="sea"?" · 항해":" · 항구"):" · 저장 없음");
    }
    if(checkpointSlotSelect.selectedOptions[0]?.disabled)
      checkpointSlotSelect.value="";
    checkpointSlotSelect.disabled=!!state.checkpointInFlight;
  }
  if(checkpointSaveButton)
    checkpointSaveButton.disabled=!!state.checkpointInFlight||!["town","sea"].includes(state.mode);
  if(checkpointLoadButton)
    checkpointLoadButton.disabled=!!state.checkpointInFlight||state.mode==="loading"||state.mode==="opening";
  // Sea has no background time progression except AUTO; a stopped
  // voyage cannot be "resumed" accidentally through the PAUSE control.
  if(pauseButton) pauseButton.disabled=state.mode==="sea"&&!state.autoSail;
  if (autoButton) {
    const on = !!state.autoSail;
    autoButton.classList.toggle("latched", on);
    autoButton.setAttribute("aria-pressed", String(on));
    const small = autoButton.querySelector("small");
    if (small) small.textContent = on ? "자동 ON" : "자동항해";
    autoButton.disabled = state.mode !== "sea";
  }

  if (portButton) {
    const available = state.mode === "sea" && !!state.nearbyPort;
    portButton.disabled = !available;
    const small = portButton.querySelector("small");
    if (small) small.textContent = available
      ? String(state.nearbyPort).slice(0, 7)
      : "기항";
    portButton.setAttribute(
      "aria-label",
      available ? String(state.nearbyPort) + " 기항" : "기항 불가",
    );
  }

  const music = state.music;
  if (musicLabel) {
    if (!music?.loaded) musicLabel.textContent = "BGM 준비";
    else if (!music?.rendered) musicLabel.textContent = "BGM 생성 필요";
    else musicLabel.textContent =
      (music.playing ? "♪" : "×") + " FM " + (music.track + 1) + "/" + music.songCount;
  }
  if (soundButton) {
    const on = !!music?.playing;
    soundButton.disabled = !music?.rendered;
    soundButton.classList.toggle("latched", on);
    soundButton.setAttribute("aria-pressed", String(on));
    soundButton.textContent = on ? "🔊 BGM" : "🔇 BGM";
  }
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  for (const button of controller?.querySelectorAll("[data-key]") ?? []) {
    const target = button.dataset.key.toLowerCase();
    if (target === key) button.classList.add("pressed");
  }
});

window.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();
  for (const button of controller?.querySelectorAll("[data-key]") ?? []) {
    const target = button.dataset.key.toLowerCase();
    if (target === key) button.classList.remove("pressed");
  }
});

window.addEventListener("keydown", event => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
}, { passive: false });
queueMicrotask(() => emitAction("controller-ready"));