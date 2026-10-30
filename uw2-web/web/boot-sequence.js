// Boot ordering follows the original OPEN.EXE -> MAIN.EXE transition.
// Loading game resources is independent, but it cannot display MAIN's menu.
export class Uw2BootGate {
  constructor() {
    this.opening = "loading";
    this.gameResourcesSettled = false;
  }

  startOpening() {
    if (this.opening !== "loading" && this.opening !== "finished")
      return false;
    this.opening = "playing";
    return true;
  }

  finishOpening() {
    if (this.opening !== "playing") return false;
    this.opening = "finished";
    return this.canShowSystemMenu();
  }

  failOpening() {
    if (this.opening === "finished") return;
    this.opening = "failed";
  }

  settleGameResources() {
    this.gameResourcesSettled = true;
    return this.canShowSystemMenu();
  }

  canShowSystemMenu() {
    return this.opening === "finished" && this.gameResourcesSettled;
  }
}
