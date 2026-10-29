export class ReaGameRuntime {
  constructor(slot, menuTable, messageTable) {
    this.slot = slot;
    this.menuTable = menuTable;
    this.messageTable = messageTable;
    this.running = false;
    this.frame = 0;
    // Address names are intentionally preserved until REA analysis proves semantics.
    this.state426 = 0;
    this.state56f = 0;
    this.state570 = 0;
    this.innerLimit = 1;
    this.lastTransition = "FUN_1fb7_5eb8 -> FUN_1fb7_736c";
  }

  start() { this.running = true; }
  pause() { this.running = false; }

  tick() {
    if (!this.running) return;
    this.frame++;

    // Browser scaffold mirrors the control shape of REA FUN_1fb7_5f6b.
    // Game semantics are not invented: unresolved calls remain labels.
    this.lastTransition = "FUN_1000_4ea7 -> FUN_1000_984d -> FUN_1fb7_747e -> FUN_1fb7_73a3";
    if (this.state426 === 0) {
      this.state570++;
      this.lastTransition = "FUN_1000_7098 -> FUN_1fb7_b0d8";
      if (this.state570 >= this.innerLimit) {
        this.state570 = 0;
        this.state56f++;
        this.lastTransition = "FUN_1fb7_b1b8 / FUN_1fb7_8e25";
      }
      if (this.state56f >= 12) {
        this.state56f = 0;
        this.lastTransition = "FUN_1fb7_5eed";
      }
    }
  }

  snapshot() {
    return {
      frame: this.frame,
      running: this.running,
      slot: this.slot?.index ?? null,
      hero: this.slot?.heroName ?? "",
      money: this.slot?.money ?? 0,
      state426: this.state426,
      state56F: this.state56f,
      state570: this.state570,
      lastTransition: this.lastTransition,
      reaMain: "FUN_1fb7_5f6b",
    };
  }
}