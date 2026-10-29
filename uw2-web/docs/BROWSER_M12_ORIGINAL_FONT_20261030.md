# Browser M12 — original Korean bitmap font

Date: 2026-10-30 KST

The Korean DOS build ships two bitmap fonts used by the browser port in M12.

- `HANKAKU.FNT`: 1536 bytes = 96 glyphs x 16 rows. ASCII/half-width glyphs are 8x16.
- `ALL_FONT.16P`: 104340 bytes = 3478 fixed records x 30 bytes.
  Each record is a two-byte transposed KSS/EUC-KR code followed by a 16x14
  monochrome glyph (28 bytes). The 14-row glyph is centered in the 16-pixel
  text cell.

The stored KSS bytes are transposed relative to normal EUC-KR. For example:

- 가 = EUC-KR B0 A1, stored A1 B0
- 항 = EUC-KR C7 D7, stored D7 C7

The browser therefore does not guess a Unicode font or a glyph index. It reads
every record's two-byte code, swaps the bytes, decodes that pair as EUC-KR, and
builds the Unicode-to-original-bitmap table directly from the user's file.

`web/font.js` implements parsing, measurement and canvas rendering without
shipping any font data in Git. `tests/font.test.mjs` verifies the exact file
shape, record count, transposed code mapping, Korean samples and half-width
ASCII widths against the user's original files.

The original GRAPH HUD/menu/dialogue renderer now uses this bitmap renderer for
town/sea side-panel labels, building menus, town dialogue and building messages.
If font assets are unavailable, the existing system-font path remains only as a
load-failure fallback.

Firefox validation captured the Korean GRAPH #22 parchment with original bitmap
glyphs for `출항 / 보급 / 도크` and the original message text
`약 13일 항해할 수 있습니다. / 출항하겠습니까？`.