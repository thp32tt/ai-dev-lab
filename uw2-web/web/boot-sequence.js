// Boot ordering follows the original OPEN.EXE -> MAIN.EXE transition.
// Loading game resources is independent, but it cannot display MAIN's menu.
export class Uw2BootGate {
  constructor() {
    this.opening = "loading";
    this.gameResourcesSettled = false;
    this.gameResourcesFailed = false;
  }

  startOpening() {
    if (this.opening === "failed")
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

  // A failed original asset read is not the same as a completed load.
  // Reject a poisoned resource set for the lifetime of this boot session.
  failGameResources() {
    this.gameResourcesFailed = true;
    this.gameResourcesSettled = false;
    return false;
  }

  settleGameResources() {
    if (this.gameResourcesFailed) return false;
    this.gameResourcesSettled = true;
    return this.canShowSystemMenu();
  }

  canShowSystemMenu() {
    return this.opening === "finished" &&
      this.gameResourcesSettled && !this.gameResourcesFailed;
  }
}
