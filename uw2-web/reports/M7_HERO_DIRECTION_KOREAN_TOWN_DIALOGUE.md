# UW2 Browser M7 — Hero direction fix + Korean town dialogue

Date: 2026-10-29 KST

## Result

This milestone fixes the player-character horizontal sprite direction and adds
the first executable Korean townspeople dialogue path on top of M6 sailing.

### Hero sprite direction

`CHAR.LZW` player frames are ordered as two frames per direction:

- 0–1: up
- 2–3: right
- 4–5: down
- 6–7: left

The previous browser mapping had right/left swapped. `heroFrameIndex()` now maps
right to 2/3 and left to 6/7.

Firefox verification on SAVE1 / Tunis / Catalina:

- ArrowLeft: map (16,89) -> (15,89), facing=left, stepParity=1; visible sprite faces left.
- ArrowRight: returns to (16,89), facing=right, stepParity=0; visible sprite faces right.

### Korean townspeople dialogue

REA 6.5.0 + Ghidra 12.1.4 decompiled Korean `MAIN.EXE` around file offset
`0xB800` (mapped function entry `0x163A3`). The observed switch selects:

- actor 0: `0x282 + portId` = 642 + port
- actor 1: `0x276 + day%10` = 630 + day%10
- actor 2: 640/641 depending used-ship stock
- actor 3: `0x26F + nation`
- actor 4: 578–581 depending port metadata/state
- actor 5: `0x26B + portId%3` = dog lines 619–621
- actor 6: 622
- actor 7: 616 followed by 617/618 depending specialty

The runtime now has the original ten-step conversation counter behavior at the
first interaction boundary: when an actor is within one tile of the attempted
destination and the counter has reached 10, the player does not move or turn;
a dialogue event is raised and the counter resets to zero. The browser draws a
fixed dialogue window and dismisses it on the next key.

Firefox SAVE1 Tunis proof:

- player remained at map (16,89)
- nearby saved dog actor slot 5 selected message 621
- `MESSAGE.DAT #621` rendered as `캉캉！`
- next key closed the dialogue and returned to town walking

### Saved townspeople

The existing M5 `saveBase+0x18` 8×3-byte actor table and `CHAR.006` rendering
remain active. M7 keeps actor collision and walker movement while adding dialogue.

### M6 preservation

After merging the current `uw2-web-port` M6 sources back into the N100 runtime,
all of these passed:

- `char.test.mjs`
- `town.test.mjs`
- `world-map.test.mjs`
- `sea-speed.test.mjs`
- `port-call.test.mjs`
- `wind-date.test.mjs`

The M6 fleet speed/current/20-minute tick and port-call code remains present.

## Known incomplete dialogue branches

The exact Korean executable branches are known, but two data-dependent cases are
still conservative in the browser:

- actor 2 used-ship stock currently falls back to message 641 when the randomized
  local used-ship stock is not reconstructed.
- actor 4 uses the generic regular-port line 581 except supply ports (578).
- actor 7 currently opens with 616; specialty-good follow-up 617/618 will be wired
  when the local specialty lookup is connected.

These limitations do not affect the verified dog/market/tip/greeting/guard ID
paths or the hero left/right fix.
