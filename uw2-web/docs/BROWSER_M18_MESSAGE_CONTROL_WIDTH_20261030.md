# Browser M18 — MESSAGE control codes and exact text width

Date: 2026-10-30 KST

## Defect found

Korean MESSAGE.DAT embeds display state commands such as:

- ESC C0..C7
- ESC F1/F4/F5
- ESC B0/B7/B8

Each command is three bytes: ESC, opcode, value.

The web port previously removed only ESC plus one following character. For example
ESC C6 became the visible character "6". That injected false glyphs and 16-pixel
advances into dialogue text, shifting later text away from the original position.

Some messages also contain non-printing C0 bytes such as 0x01. Those likewise
must not consume a glyph cell.

## Correction

stripUw2MessageControls now:
- removes the full three-byte ESC display commands,
- removes any residual ESC pair defensively,
- removes non-printing C0 bytes while preserving newline/CR/tab.

town dialogue and formatted building messages both use this path before layout.

## Full-resource validation

All 1,179 MESSAGE.DAT strings were cleaned and checked against:
- ALL_FONT.16P
- HANKAKU.FNT

Result:
- 24,108 visible glyph uses checked
- 0 printable missing glyphs
- 0 leaked non-printing controls

This pass corrects visible text and width. Reproducing the original C/F/B color
state changes themselves remains a later rendering step.

HORIEDIT.C is not used as evidence.