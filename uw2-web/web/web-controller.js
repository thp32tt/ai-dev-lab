const controller = document.getElementById("web-controller");
if (controller) controller.dataset.ready = "1";

const modeLabel = document.getElementById("controller-mode");
const musicLabel = document.getElementById("controller-music");
const autoButton = controller?.querySelector('[data-action="auto-sail"]');
const soundButton = controller?.querySelector('[data-action="sound"]');
const portButton = controller?.querySelector('[data-key="p"]');

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

function emitAction(action) {
  window.dispatchEvent(new CustomEvent("uw2-controller-action", {
    detail: { action },
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
  if (action === "start") document.getElementById("run-button")?.click();
  else if (action === "opening") document.getElementById("opening-button")?.click();
  else if (action === "save-prev") changeSave(-1);
  else if (action === "save-next") changeSave(1);
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

  emitKey(key);
  button.classList.add("pressed");

  if (!repeatable.has(key)) {
    const release = setTimeout(() => clearPress(button), 90);
    active.set(button, { delay: release, repeat: 0 });
    return;
  }

  const state = { delay: 0, repeat: 0 };
  state.delay = setTimeout(() => {
    state.repeat = setInterval(() => emitKey(key), 105);
  }, 260);
  active.set(button, state);
}

controller?.addEventListener("pointerdown", event => {
  const button = event.target.closest("button");
  if (!button) return;
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
  const labels = {
    loading: "로딩",
    opening: "오프닝",
    town: "항구",
    sea: "항해",
    runtime: "게임",
    preview: "미리보기",
  };
  if (modeLabel) modeLabel.textContent = labels[state.mode] || String(state.mode || "게임");
  controller.dataset.mode = state.mode || "";

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