# Browser M16 — original building sub-UI surfaces

Date: 2026-10-30 KST

## Scope

This pass removes browser-native dark panels from the implemented building
subscreens and keeps them on the Korean DOS visual path.

Affected screens:
- harbor supply/load/unload
- item buy/sell
- item buy/sell confirmation
- market buy/sell
- market rate list
- tavern crew hire/dismiss
- tavern treat
- bank deposit/withdraw/borrow/repay
- inn port-support list

## Rendering contract

The screens now use:
- GRAPH #22 at the exact standard MAIN.EXE position (104,136), 368x152
- ALL_FONT.16P / HANKAKU.FNT through drawOriginalPanelText
- a 16-pixel row grid
- selected-row scrolling inside the native dialogue surface
- GRAPH #0 at its exact MAIN.EXE UI-object position for item confirmations

The previous opaque dark rectangles, browser-colored borders, Malgun Gothic and
monospace transaction lists are no longer used by these building subscreens.

## Evidence boundary

This does not claim every transaction list is already byte-for-byte identical to
the original menu logic. The exact outer surfaces and font path are artifact-backed;
remaining work is to trace each MAIN.EXE menu/object dispatcher and reproduce exact
row labels, cursor glyphs, page behavior and any scene-specific alternate GRAPH
records.

HORIEDIT.C is not used as evidence.