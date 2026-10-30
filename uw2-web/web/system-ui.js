export const ORIGINAL_SYSTEM_MENU_INDEX = 56;

export const SYSTEM_UI_LAYOUT = Object.freeze({
  menu: Object.freeze({
    x: 192, y: 48, w: 256, h: 144,
    textX: 200, textY: 48, rowH: 16, count: 5,
  }),
  slots: Object.freeze({
    x1: 208, x2: 432,
    y: 96, rowH: 16, count: 10,
    promptX: 224, promptY: 272,
  }),
  loadConfirm: Object.freeze({
    x: 192, y: 256, w: 256, h: 48,
    textX: 208, textY: 272,
  }),
  emptySlot: Object.freeze({
    x: 176, y: 256, w: 288, h: 48,
    textX: 192, textY: 272,
  }),
});

export function originalSaveSlotLine(slot, index) {
  if (!slot || slot.empty) {
    return `        KOEI Game ${String(index + 1).padStart(2, "0")}`;
  }
  const marker = slot.slotHeaderFlag === 2 || slot.slotHeaderFlag === 3 ? "*" : " ";
  const where = slot.port === 0xff ? "해상" : (slot.portName ?? "");
  return `${String(slot.memo ?? "").padEnd(12, " ")}${marker}${where}`;
}